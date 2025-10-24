import { ChartSpec, Insight, DataSummary, Message } from '@shared/schema.js';
import { openai, MODEL } from './openai.js';
import { processChartData } from './chartGenerator.js';
import { analyzeCorrelations } from './correlationAnalyzer.js';

export async function analyzeUpload(
  data: Record<string, any>[],
  summary: DataSummary,
  fileName?: string
): Promise<{ charts: ChartSpec[]; insights: Insight[] }> {
  // Use AI generation for all file types (Excel and CSV)
  console.log('📊 Using AI chart generation for all file types');

  // Generate chart specifications
  const chartSpecs = await generateChartSpecs(summary);

  // Process data for each chart and generate insights
  const charts = await Promise.all(chartSpecs.map(async (spec) => {
    const processedData = processChartData(data, spec);
    
    // Generate key insight and recommendation for this specific chart
    const chartInsights = await generateChartInsights(spec, processedData, summary);
    
    return {
      ...spec,
      data: processedData,
      keyInsight: chartInsights.keyInsight,
      recommendation: chartInsights.recommendation,
    };
  }));

  // Generate insights using AI
  const insights = await generateInsights(data, summary);

  return { charts, insights };
}

// Helper function to find matching column name (case-insensitive, handles spaces/underscores, partial matching)
function findMatchingColumn(searchName: string, availableColumns: string[]): string | null {
  if (!searchName) return null;
  
  const normalized = searchName.toLowerCase().replace(/[\s_-]/g, '');
  
  // First try exact match
  for (const col of availableColumns) {
    const colNormalized = col.toLowerCase().replace(/[\s_-]/g, '');
    if (colNormalized === normalized) {
      return col;
    }
  }
  
  // Then try partial match (search term contained in column name)
  for (const col of availableColumns) {
    const colNormalized = col.toLowerCase().replace(/[\s_-]/g, '');
    if (colNormalized.includes(normalized)) {
      return col;
    }
  }
  
  // Finally try reverse partial match (column name contained in search term)
  for (const col of availableColumns) {
    const colNormalized = col.toLowerCase().replace(/[\s_-]/g, '');
    if (normalized.includes(colNormalized)) {
      return col;
    }
  }
  
  return null;
}

export async function answerQuestion(
  data: Record<string, any>[],
  question: string,
  chatHistory: Message[],
  summary: DataSummary
): Promise<{ answer: string; charts?: ChartSpec[]; insights?: Insight[] }> {
  // Classify the question
  const allColumns = summary.columns.map(c => c.name);
  const classification = await classifyQuestion(question, summary.numericColumns);

  // If it's a correlation question, use correlation analyzer
  if (classification.type === 'correlation' && classification.targetVariable) {
    console.log('=== QUESTION CLASSIFICATION DEBUG ===');
    console.log('Classification:', classification);
    console.log('Available numeric columns:', summary.numericColumns);
    console.log('All available columns:', allColumns);
    
    // Find matching column names from ALL columns (not just numeric)
    const targetCol = findMatchingColumn(classification.targetVariable, allColumns);
    console.log(`Target column match: "${classification.targetVariable}" -> "${targetCol}"`);
    
    if (!targetCol) {
      return { 
        answer: `I couldn't find a column matching "${classification.targetVariable}". Available columns: ${allColumns.join(', ')}` 
      };
    }

    // Determine if target is numeric or categorical
    const targetIsNumeric = summary.numericColumns.includes(targetCol);

    // Check if it's a specific two-variable correlation
    if (classification.specificVariable) {
      const specificCol = findMatchingColumn(classification.specificVariable, allColumns);
      console.log(`Specific column match: "${classification.specificVariable}" -> "${specificCol}"`);
      
      if (!specificCol) {
        return { 
          answer: `I couldn't find a column matching "${classification.specificVariable}". Available columns: ${allColumns.join(', ')}` 
        };
      }

      const specificIsNumeric = summary.numericColumns.includes(specificCol);

      console.log(`Target "${targetCol}" is ${targetIsNumeric ? 'numeric' : 'categorical'}`);
      console.log(`Specific "${specificCol}" is ${specificIsNumeric ? 'numeric' : 'categorical'}`);
      
      // Log sample data values to verify we're using the right columns
      const sampleRows = data.slice(0, 5);
      console.log(`Sample "${targetCol}" values:`, sampleRows.map(row => row[targetCol]));
      console.log(`Sample "${specificCol}" values:`, sampleRows.map(row => row[specificCol]));
      console.log('=== END CLASSIFICATION DEBUG ===');

      // Handle different combinations of numeric/categorical
      if (targetIsNumeric && specificIsNumeric) {
        // Both numeric: Use correlation analysis
        const { charts, insights } = await analyzeCorrelations(
          data,
          targetCol,
          [specificCol]
        );
        const answer = `I've analyzed the correlation between ${specificCol} and ${targetCol}. The scatter plot shows the relationship between these two variables, and the analysis reveals the strength and direction of their correlation.`;
        return { answer, charts, insights };
      } else if (targetIsNumeric && !specificIsNumeric) {
        // Categorical vs Numeric: Create bar chart
        const chartSpec: ChartSpec = {
          type: 'bar',
          title: `${targetCol} by ${specificCol}`,
          x: specificCol,
          y: targetCol,
          aggregate: 'mean',
        };
        const charts = [{
          ...chartSpec,
          data: processChartData(data, chartSpec),
        }];
        const answer = `I've created a bar chart showing how ${targetCol} varies across different ${specificCol} categories. The chart displays the average ${targetCol} for each category.`;
        return { answer, charts };
      } else if (!targetIsNumeric && specificIsNumeric) {
        // Numeric vs Categorical: Create bar chart (swap axes)
        const chartSpec: ChartSpec = {
          type: 'bar',
          title: `${specificCol} by ${targetCol}`,
          x: targetCol,
          y: specificCol,
          aggregate: 'mean',
        };
        const charts = [{
          ...chartSpec,
          data: processChartData(data, chartSpec),
        }];
        const answer = `I've created a bar chart showing how ${specificCol} varies across different ${targetCol} categories. The chart displays the average ${specificCol} for each category.`;
        return { answer, charts };
      } else {
        // Both categorical: Cannot analyze relationship numerically
        return { 
          answer: `Both "${targetCol}" and "${specificCol}" are categorical columns. I cannot perform numerical correlation analysis on categorical data. Try asking for a different visualization, such as a pie chart or bar chart.` 
        };
      }
    } else {
      console.log(`Analyzing general correlation for: ${targetCol}`);
      console.log('=== END CLASSIFICATION DEBUG ===');
      
      if (!targetIsNumeric) {
        return {
          answer: `"${targetCol}" is a categorical column. Correlation analysis requires a numeric target variable. Try asking about a numeric column like: ${summary.numericColumns.slice(0, 3).join(', ')}`
        };
      }
      
      // General correlation analysis - analyze all numeric variables except the target itself
      const comparisonColumns = summary.numericColumns.filter(col => col !== targetCol);
      const { charts, insights } = await analyzeCorrelations(
        data,
        targetCol,
        comparisonColumns
      );

      const answer = `I've analyzed what affects ${targetCol}. The correlation analysis shows the relationship strength between different variables and ${targetCol}. Scatter plots show the actual relationships, and the bar chart ranks variables by correlation strength.`;

      return { answer, charts, insights };
    }
  }

  // For general questions, generate answer and optional charts
  return await generateGeneralAnswer(data, question, chatHistory, summary);
}

async function generateChartSpecs(summary: DataSummary): Promise<ChartSpec[]> {
  // Use AI generation for all file types
  console.log('🤖 Using AI to generate charts for all file types...');
  
  const prompt = `Analyze this dataset and generate EXACTLY 4-6 chart specifications. You MUST return multiple charts to provide comprehensive insights.

DATA SUMMARY:
- Rows: ${summary.rowCount}
- Columns: ${summary.columnCount}
- Numeric columns: ${summary.numericColumns.join(', ')}
- Date columns: ${summary.dateColumns.join(', ')}
- All columns: ${summary.columns.map((c) => `${c.name} (${c.type})`).join(', ')}

CRITICAL: You MUST use ONLY the exact column names listed above. Do NOT make up or modify column names.

Generate 4-6 diverse chart specifications that reveal different insights. Each chart should analyze different aspects of the data. Output ONLY a valid JSON array with objects containing:
- type: "line"|"bar"|"scatter"|"pie"|"area"
- title: descriptive title
- x: column name (string, not array) - MUST be from the available columns list
- y: column name (string, not array) - MUST be from the available columns list
- aggregate: "sum"|"mean"|"count"|"none" (use "none" for scatter plots, choose appropriate for others)

IMPORTANT: 
- x and y must be EXACT column names from the available columns list above
- Generate EXACTLY 4-6 charts, not just 1
- Each chart should use different column combinations
- Choose diverse chart types that work well with the data
- Use only the exact column names provided - do not modify them

Chart type preferences:
- Line/area charts for time series (if date columns exist)
- Bar charts for categorical comparisons (top 10)
- Scatter plots for relationships between numeric columns
- Pie charts for proportions (top 5)

Output format: [{"type": "...", "title": "...", "x": "...", "y": "...", "aggregate": "..."}, ...]`;

  const response = await openai.chat.completions.create({
    model: MODEL as string,
    messages: [
      {
        role: 'system',
        content: 'You are a data visualization expert. Output only valid JSON array. Column names (x, y) must be strings, not arrays. Always return a complete, valid JSON array of chart specifications.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content;
  
  if (!content || content.trim() === '') {
    console.error('Empty response from OpenAI for chart generation');
    return [];
  }

  console.log('🤖 AI Response for chart generation:');
  console.log('Raw content length:', content.length);
  console.log('First 500 chars:', content.substring(0, 500));

  let parsed;

  try {
    parsed = JSON.parse(content);
    // Handle if the AI wrapped it in an object
    let charts = parsed.charts || parsed.specifications || parsed.data || parsed;
    
    // Ensure we have an array
    if (!Array.isArray(charts)) {
      // Maybe it's a single object? Wrap it
      if (typeof charts === 'object' && charts.type) {
        charts = [charts];
      } else {
        return [];
      }
    }
    
    // Sanitize chart specs to ensure x and y are strings and valid column names
    const availableColumns = summary.columns.map(c => c.name);
    const numericColumns = summary.numericColumns;
    const dateColumns = summary.dateColumns;
    
    const sanitized = charts.slice(0, 6).map((spec: any) => {
      // Extract x and y, handling various formats
      let x = spec.x;
      let y = spec.y;
      
      if (Array.isArray(x)) x = x[0];
      if (Array.isArray(y)) y = y[0];
      if (typeof x === 'object' && x !== null) x = x.name || x.value || String(x);
      if (typeof y === 'object' && y !== null) y = y.name || y.value || String(y);
      
      x = String(x || '');
      y = String(y || '');
      
      // Validate and fix column names with improved matching
      if (!availableColumns.includes(x)) {
        console.warn(`⚠️ Invalid X column "${x}" not found in data. Available: ${availableColumns.join(', ')}`);
        
        // Try multiple matching strategies
        let similarX = availableColumns.find(col => 
          col.toLowerCase() === x.toLowerCase()
        );
        
        if (!similarX) {
          similarX = availableColumns.find(col => 
            col.toLowerCase().includes(x.toLowerCase()) || 
            x.toLowerCase().includes(col.toLowerCase())
          );
        }
        
        if (!similarX) {
          // Try partial word matching
          const xWords = x.toLowerCase().split(/[\s_-]+/);
          similarX = availableColumns.find(col => {
            const colWords = col.toLowerCase().split(/[\s_-]+/);
            return xWords.some((word: string) => word.length > 2 && colWords.some((cWord: string) => cWord.includes(word) || word.includes(cWord)));
          });
        }
        
        if (!similarX) {
          // Try fuzzy matching for common abbreviations
          const fuzzyMatches = {
            'nGRP': 'GRP',
            'Adstocked': 'Adstock',
            'Reach': 'Reach',
            'TOM': 'TOM',
            'Max': 'Max'
          };
          
          for (const [key, value] of Object.entries(fuzzyMatches)) {
            if (x.includes(key)) {
              similarX = availableColumns.find(col => col.includes(value));
              if (similarX) break;
            }
          }
        }
        
        x = similarX || availableColumns[0];
        console.log(`   Fixed X column to: "${x}"`);
      }
      
      if (!availableColumns.includes(y)) {
        console.warn(`⚠️ Invalid Y column "${y}" not found in data. Available: ${availableColumns.join(', ')}`);
        
        // Try multiple matching strategies for Y column
        let similarY = availableColumns.find(col => 
          col.toLowerCase() === y.toLowerCase()
        );
        
        if (!similarY) {
          similarY = availableColumns.find(col => 
            col.toLowerCase().includes(y.toLowerCase()) || 
            y.toLowerCase().includes(col.toLowerCase())
          );
        }
        
        if (!similarY) {
          // Try partial word matching
          const yWords = y.toLowerCase().split(/[\s_-]+/);
          similarY = availableColumns.find(col => {
            const colWords = col.toLowerCase().split(/[\s_-]+/);
            return yWords.some((word: string) => word.length > 2 && colWords.some((cWord: string) => cWord.includes(word) || word.includes(cWord)));
          });
        }
        
        if (!similarY) {
          // Try fuzzy matching for common abbreviations
          const fuzzyMatches = {
            'nGRP': 'GRP',
            'Adstocked': 'Adstock',
            'Reach': 'Reach',
            'TOM': 'TOM',
            'Max': 'Max'
          };
          
          for (const [key, value] of Object.entries(fuzzyMatches)) {
            if (y.includes(key)) {
              similarY = availableColumns.find(col => col.includes(value));
              if (similarY) break;
            }
          }
        }
        
        y = similarY || (numericColumns[0] || availableColumns[1]);
        console.log(`   Fixed Y column to: "${y}"`);
      }
      
      return {
        type: spec.type,
        title: spec.title || 'Untitled Chart',
        x: x,
        y: y,
        aggregate: spec.aggregate || 'none',
      };
    }).filter((spec: any) => 
      spec.type && spec.x && spec.y &&
      ['line', 'bar', 'scatter', 'pie', 'area'].includes(spec.type)
    );
    
    console.log('Generated charts:', sanitized.length);
    console.log(sanitized);
    return sanitized;
  } catch (error) {
    console.error('Error parsing chart specs:', error);
    console.error('Raw AI response (first 500 chars):', content?.substring(0, 500));
    return [];
  }
}

async function generateChartInsights(
  chartSpec: ChartSpec,
  chartData: Record<string, any>[],
  summary: DataSummary
): Promise<{ keyInsight: string; recommendation: string }> {
  if (!chartData || chartData.length === 0) {
    return {
      keyInsight: "No data available for analysis",
      recommendation: "Please check your data source and try again"
    };
  }

  // Calculate basic statistics for the chart data
  const xValues = chartData.map(row => row[chartSpec.x]).filter(v => v !== null && v !== undefined);
  const yValues = chartData.map(row => row[chartSpec.y]).filter(v => v !== null && v !== undefined);
  
  const numericYValues = yValues.map(v => Number(v)).filter(v => !isNaN(v));
  const maxY = numericYValues.length > 0 ? Math.max(...numericYValues) : 0;
  const minY = numericYValues.length > 0 ? Math.min(...numericYValues) : 0;
  const avgY = numericYValues.length > 0 ? numericYValues.reduce((a, b) => a + b, 0) / numericYValues.length : 0;
  
  const prompt = `Analyze this specific chart and provide a key insight and actionable recommendation.

CHART DETAILS:
- Type: ${chartSpec.type}
- Title: ${chartSpec.title}
- X-axis: ${chartSpec.x}
- Y-axis: ${chartSpec.y}
- Data points: ${chartData.length}
- Y-value range: ${minY.toFixed(2)} to ${maxY.toFixed(2)}
- Average Y-value: ${avgY.toFixed(2)}

SAMPLE DATA (first 3 points):
${chartData.slice(0, 3).map(row => `${row[chartSpec.x]}: ${row[chartSpec.y]}`).join(', ')}

Generate:
1. A KEY INSIGHT (1-2 sentences) that highlights the most important finding from this chart
2. An ACTIONABLE RECOMMENDATION (1-2 sentences) that suggests what to do based on this insight

Focus on:
- The most significant pattern or trend visible in the data
- Specific numbers or percentages when relevant
- Business impact or implications
- Concrete next steps

Output JSON:
{
  "keyInsight": "Your key insight here...",
  "recommendation": "Your actionable recommendation here..."
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL as string,
      messages: [
        {
          role: 'system',
          content: 'You are a data analyst providing specific insights and recommendations for individual charts. Be concise, specific, and actionable. Output valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = response.choices[0].message.content || '{}';
    const result = JSON.parse(content);
    
    return {
      keyInsight: result.keyInsight || "Data shows interesting patterns worth investigating",
      recommendation: result.recommendation || "Consider further analysis to understand the underlying factors"
    };
  } catch (error) {
    console.error('Error generating chart insights:', error);
    return {
      keyInsight: `This ${chartSpec.type} chart shows ${chartData.length} data points with values ranging from ${minY.toFixed(2)} to ${maxY.toFixed(2)}`,
      recommendation: "Review the data patterns and consider how they align with your business objectives"
    };
  }
}

async function generateInsights(
  data: Record<string, any>[],
  summary: DataSummary
): Promise<Insight[]> {
  // Calculate basic statistics
  const stats: Record<string, any> = {};

  for (const col of summary.numericColumns.slice(0, 5)) {
    const values = data.map((row) => Number(row[col])).filter((v) => !isNaN(v));
    if (values.length > 0) {
      stats[col] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        total: values.reduce((a, b) => a + b, 0),
      };
    }
  }

  const prompt = `Analyze this dataset and provide 5-7 specific, actionable business insights.

DATA SUMMARY:
- ${summary.rowCount} rows, ${summary.columnCount} columns
- Numeric columns: ${summary.numericColumns.join(', ')}

KEY STATISTICS:
${Object.entries(stats)
  .map(([col, s]: [string, any]) => `${col}: avg=${s.avg.toFixed(2)}, min=${s.min}, max=${s.max}, total=${s.total.toFixed(2)}`)
  .join('\n')}

Each insight MUST include:
1. A bold headline with the key finding (e.g., **High Marketing Efficiency:**)
2. Specific numbers, percentages, or metrics from the data
3. Explanation of WHY this matters to the business
4. Actionable recommendation starting with "**Actionable Recommendation:**"

Format each insight as a complete paragraph with the structure:
**[Insight Title]:** [Finding with specific metrics]. **Why it matters:** [Business impact]. **Actionable Recommendation:** [Specific action to take].

Example:
**Revenue Concentration Risk:** The top 3 products account for 78% of total revenue ($2.4M out of $3.1M), indicating high dependency. **Why it matters:** Over-reliance on few products creates vulnerability to market shifts or competitive pressure. **Actionable Recommendation:** Diversify revenue streams by investing in product development for the remaining portfolio, targeting 60/40 split within 12 months.

Output as JSON array:
{
  "insights": [
    { "text": "**Insight Title:** Full insight text here..." },
    ...
  ]
}`;

  const response = await openai.chat.completions.create({
    model: MODEL as string,
    messages: [
      {
        role: 'system',
        content: 'You are a senior business analyst. Provide detailed, quantitative insights with specific metrics and actionable recommendations. Output valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content || '{}';

  try {
    const parsed = JSON.parse(content);
    const insightArray = parsed.insights || [];
    
    return insightArray.slice(0, 7).map((item: any, index: number) => ({
      id: index + 1,
      text: item.text || item.insight || String(item),
    }));
  } catch (error) {
    console.error('Error parsing insights:', error);
    return [];
  }
}

async function classifyQuestion(
  question: string,
  numericColumns: string[]
): Promise<{ 
  type: 'correlation' | 'general'; 
  targetVariable: string | null;
  specificVariable?: string | null;
}> {
  const prompt = `Classify this question:

QUESTION: ${question}
NUMERIC COLUMNS: ${numericColumns.join(', ')}

IMPORTANT: Only classify as "correlation" if the question specifically asks about correlations, relationships, or what affects/influences something.

If the question:
- Requests a SPECIFIC chart type (pie chart, bar chart, line chart, etc.) → type: "general"
- Mentions specific chart visualization → type: "general"
- Asks about correlations/relationships WITHOUT specifying a chart type → type: "correlation"
- Asks "what affects" or "what influences" → type: "correlation"

For correlation questions:
- SPECIFIC: identifies two variables (e.g., "correlation between X and Y")
- GENERAL: asks what affects one variable (e.g., "what affects Y")

Output JSON:
{
  "type": "correlation" or "general",
  "isSpecific": true or false,
  "targetVariable": "column_name" or null,
  "specificVariable": "column_name" or null (only for specific correlations)
}

Examples:
- "pie chart between product type and revenue" → {"type": "general", "targetVariable": null, "specificVariable": null}
- "show me a bar chart of sales by region" → {"type": "general", "targetVariable": null, "specificVariable": null}
- "correlation between lead times and revenue" → {"type": "correlation", "isSpecific": true, "specificVariable": "lead times", "targetVariable": "revenue"}
- "what affects revenue" → {"type": "correlation", "isSpecific": false, "targetVariable": "revenue", "specificVariable": null}`;

  const response = await openai.chat.completions.create({
    model: MODEL as string,
    messages: [
      {
        role: 'system',
        content: 'You are a question classifier. Chart requests should be classified as "general", not "correlation". Output only valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 200,
  });

  const content = response.choices[0].message.content || '{"type": "general", "targetVariable": null}';

  try {
    const result = JSON.parse(content);
    return {
      type: result.type === 'correlation' ? 'correlation' : 'general',
      targetVariable: result.targetVariable || null,
      specificVariable: result.specificVariable || null,
    };
  } catch {
    return { type: 'general', targetVariable: null };
  }
}

async function generateGeneralAnswer(
  data: Record<string, any>[],
  question: string,
  chatHistory: Message[],
  summary: DataSummary
): Promise<{ answer: string; charts?: ChartSpec[]; insights?: Insight[] }> {
  const historyContext = chatHistory
    .slice(-4)
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const prompt = `Answer this question about the data:

QUESTION: ${question}

DATA CONTEXT:
- ${summary.rowCount} rows, ${summary.columnCount} columns
- All columns: ${summary.columns.map((c) => `${c.name} (${c.type})`).join(', ')}
- Numeric columns: ${summary.numericColumns.join(', ')}

${historyContext ? `CHAT HISTORY:\n${historyContext}\n` : ''}

Provide a specific, helpful answer. If the question requests a chart, generate appropriate chart specifications.

CHART GUIDELINES:
- You can use ANY column (categorical or numeric) for x or y
- Pie charts: Use categorical column for x, numeric column for y, aggregate "sum" or "count"
- Bar charts: Can use categorical or numeric for x, numeric for y
- Line/Area: Typically numeric or date for x, numeric for y
- Scatter: Numeric for both x and y
- x and y must be single column names (strings), NOT arrays

Output JSON:
{
  "answer": "your detailed answer",
  "charts": [{"type": "...", "title": "...", "x": "...", "y": "...", "aggregate": "..."}] or null,
  "generateInsights": true or false
}`;

  const response = await openai.chat.completions.create({
    model: MODEL as string,
    messages: [
      {
        role: 'system',
        content: 'You are a helpful data analyst assistant. Provide specific, accurate answers. Column names (x, y) must be strings, not arrays.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 800,
  });

  const content = response.choices[0].message.content || '{"answer": "I cannot answer that question."}';

  try {
    const result = JSON.parse(content);

    let processedCharts: ChartSpec[] | undefined;

    if (result.charts && Array.isArray(result.charts)) {
      // Sanitize chart specs
      const sanitized = result.charts.map((spec: any) => {
        let x = spec.x;
        let y = spec.y;
        
        if (Array.isArray(x)) x = x[0];
        if (Array.isArray(y)) y = y[0];
        if (typeof x === 'object' && x !== null) x = x.name || x.value || String(x);
        if (typeof y === 'object' && y !== null) y = y.name || y.value || String(y);
        
        return {
          type: spec.type,
          title: spec.title || 'Chart',
          x: String(x || ''),
          y: String(y || ''),
          aggregate: spec.aggregate || 'none',
        };
      }).filter((spec: any) => 
        spec.type && spec.x && spec.y &&
        ['line', 'bar', 'scatter', 'pie', 'area'].includes(spec.type)
      );

      processedCharts = await Promise.all(sanitized.map(async (spec: ChartSpec) => {
        const processedData = processChartData(data, spec);
        const chartInsights = await generateChartInsights(spec, processedData, summary);
        
        return {
          ...spec,
          data: processedData,
          keyInsight: chartInsights.keyInsight,
          recommendation: chartInsights.recommendation,
        };
      }));
      
      console.log('Chat charts generated:', processedCharts?.length || 0);
    }

    return {
      answer: result.answer,
      charts: processedCharts,
      insights: undefined,
    };
  } catch {
    return { answer: 'I apologize, but I had trouble processing your question. Please try rephrasing it.' };
  }
}
