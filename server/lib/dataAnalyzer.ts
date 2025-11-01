import { ChartSpec, Insight, DataSummary, Message } from '@shared/schema.js';
import { openai, MODEL } from './openai.js';
import { processChartData } from './chartGenerator.js';
import { analyzeCorrelations } from './correlationAnalyzer.js';
import { generateChartInsights } from './insightGenerator.js';

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
      xLabel: spec.x,
      yLabel: spec.y,
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
  // Utility: parse two-series line intent like "A and B over months" or "A vs B"
  // This should be checked FIRST for "and" queries, before detectVsEarly
  const detectTwoSeriesLine = (q: string) => {
    console.log('🔍 detectTwoSeriesLine - checking query:', q);
    const ql = q.toLowerCase();
    // More flexible detection: look for "and" or "vs" with mention of line chart, plot, or "over months/time"
    const mentionsLine = /\bline\b|\bline\s*chart\b|\bover\s+(?:time|months?|weeks?|days?)\b|\bplot\b|\bgraph\b/.test(ql);
    
    // Also check if it mentions two variables (check for common patterns)
    const hasAnd = /\sand\s+/.test(ql);
    const hasVs = /\s+vs\s+/.test(ql);
    
    // Check for "two separate axes" which indicates dual-axis line chart
    const wantsDualAxis = /\b(two\s+separates?\s+axes?|separates?\s+axes?|dual\s+axis|dual\s+y)\b/i.test(q);
    
    console.log('🔍 detectTwoSeriesLine - flags:', { mentionsLine, hasAnd, hasVs, wantsDualAxis });
    
    // If it mentions "and" or "vs" with plot/chart keywords, OR if it explicitly wants dual axes, proceed
    if (!mentionsLine && !hasAnd && !hasVs && !wantsDualAxis) {
      console.log('❌ detectTwoSeriesLine - does not match criteria');
      return null;
    }
    
    // split on ' vs ' or ' and '
    let parts: string[] = [];
    if (ql.includes(' vs ')) parts = q.split(/\s+vs\s+/i);
    else if (ql.includes(' and ')) parts = q.split(/\s+and\s+/i);
    
    if (parts.length < 2) return null;
    
    // Clean up parts: remove chart-related words and "over months" phrases
    // Also handle "on two separate axes" (including typo "separates")
    const candidates = parts.map(p => 
      p.replace(/over\s+(?:time|months?|weeks?|days?|.*)/i, '')
       .replace(/\b(line\s*chart|plot|graph|show|display|create)\b/gi, '')
       .replace(/\bon\s+(?:two\s+)?(?:separates?\s+)?axes?\b/gi, '')  // Fixed: added 's?' to handle "separates"
       .replace(/\s+axes?\s*$/i, '')  // Remove trailing "axes"
       .trim()
    ).filter(Boolean);
    
    if (candidates.length < 2) return null;
    
    const allCols = summary.columns.map(c => c.name);
    const a = findMatchingColumn(candidates[0], allCols);
    const b = findMatchingColumn(candidates[1], allCols);
    
    console.log('🔍 detectTwoSeriesLine - candidates:', candidates);
    console.log('🔍 detectTwoSeriesLine - matched columns:', { a, b });
    
    if (!a || !b) {
      console.log('❌ detectTwoSeriesLine - could not match columns');
      return null;
    }
    
    const aNum = summary.numericColumns.includes(a);
    const bNum = summary.numericColumns.includes(b);
    
    if (!aNum || !bNum) {
      console.log('❌ detectTwoSeriesLine - columns not both numeric');
      return null;
    }
    
    // Choose x as first date column or a column named Month/Date/Week if present
    const x = summary.dateColumns[0] || 
              findMatchingColumn('Month', allCols) || 
              findMatchingColumn('Date', allCols) ||
              findMatchingColumn('Week', allCols) ||
              summary.columns[0].name;
    
    console.log('✅ detectTwoSeriesLine - detected:', { x, y: a, y2: b });
    return { x, y: a, y2: b };
  };

  // Detect "vs" queries early - when user asks to plot X vs Y (especially with "two separate axes")
  const detectVsEarly = (q: string): { var1: string | null; var2: string | null } | null => {
    console.log('🔍 Early vs detection for:', q);
    const ql = q.toLowerCase();
    // Look for "vs" in the question, especially with "plot", "two separate axes", etc.
    if (!ql.includes(' vs ')) {
      console.log('❌ No "vs" found in question');
      return null;
    }
    
    const allCols = summary.columns.map(c => c.name);
    
    // Match pattern: "plot X vs Y" or "X vs Y on two separate axes" etc.
    const vsMatch = q.match(/(.+?)\s+vs\s+(.+)/i);
    if (!vsMatch) {
      console.log('❌ No vs match pattern found');
      return null;
    }
    
    let var1Raw = vsMatch[1].trim();
    let var2Raw = vsMatch[2].trim();
    
    console.log('📝 Raw extracted:', { var1Raw, var2Raw });
    
    // Clean up variable names
    var1Raw = var1Raw.replace(/^(?:can\s+you\s+)?(?:plot|graph|chart|show|display)\s+/i, '').trim();
    var2Raw = var2Raw.replace(/\s+(?:on|with|using|separate|axes|axis|chart|graph|plot).*$/i, '').trim();
    
    console.log('🧹 Cleaned variables:', { var1Raw, var2Raw });
    console.log('📊 Available columns:', allCols);
    console.log('🔢 Numeric columns:', summary.numericColumns);
    
    const var1 = findMatchingColumn(var1Raw, allCols);
    const var2 = findMatchingColumn(var2Raw, allCols);
    
    console.log('🎯 Column matches:', { var1, var2 });
    
    if (!var1 || !var2) {
      console.log('❌ Could not match columns. var1:', var1, 'var2:', var2);
      return null;
    }
    
    // Check if both are numeric
    const bothNumeric = summary.numericColumns.includes(var1) && summary.numericColumns.includes(var2);
    if (!bothNumeric) {
      console.log('❌ Not both numeric. var1 numeric:', summary.numericColumns.includes(var1), 'var2 numeric:', summary.numericColumns.includes(var2));
      return null;
    }
    
    console.log('✅ Valid vs query detected early:', { var1, var2 });
    return { var1, var2 };
  };

  // Check for two-series line chart FIRST (handles "and" queries)
  console.log('🔍 Starting detection for question:', question);
  const twoSeries = detectTwoSeriesLine(question);
  if (twoSeries) {
    console.log('✅ detectTwoSeriesLine matched! Result:', twoSeries);
    
    // Verify columns exist in data
    const firstRow = data[0];
    if (!firstRow) {
      console.error('❌ No data rows available');
      return { answer: 'No data available to create charts. Please upload a data file first.' };
    }
    
    if (!firstRow.hasOwnProperty(twoSeries.y)) {
      console.error(`❌ Column "${twoSeries.y}" not found in data`);
      const allCols = summary.columns.map(c => c.name);
      return { answer: `Column "${twoSeries.y}" not found in the data. Available columns: ${allCols.join(', ')}` };
    }
    
    if (!firstRow.hasOwnProperty(twoSeries.y2)) {
      console.error(`❌ Column "${twoSeries.y2}" not found in data`);
      const allCols = summary.columns.map(c => c.name);
      return { answer: `Column "${twoSeries.y2}" not found in the data. Available columns: ${allCols.join(', ')}` };
    }
    
    // Check for explicit "two separate axes" request
    const wantsDualAxis = /\b(two\s+separates?\s+axes?|separates?\s+axes?|dual\s+axis|dual\s+y)\b/i.test(question);
    
    // For "A and B over months" or "A and B on two separate axes", always create dual-axis line chart
    const spec: ChartSpec = {
      type: 'line',
      title: `${twoSeries.y} and ${twoSeries.y2} over ${twoSeries.x}`,
      x: twoSeries.x,
      y: twoSeries.y,
      y2: twoSeries.y2,
      xLabel: twoSeries.x,
      yLabel: twoSeries.y,
      y2Label: twoSeries.y2,
      aggregate: 'none',
    } as any;
    
    console.log('🔄 Processing dual-axis line chart data...');
    const processed = processChartData(data, spec);
    console.log(`✅ Dual-axis line data: ${processed.length} points`);
    
    if (processed.length === 0) {
      const allCols = summary.columns.map(c => c.name);
      return { 
        answer: `No valid data points found. Please check that columns "${twoSeries.y}" and "${twoSeries.y2}" exist and contain numeric data. Available columns: ${allCols.join(', ')}` 
      };
    }
    
    const insights = await generateChartInsights(spec, processed, summary);
    const chart: ChartSpec = { 
      ...spec, 
      data: processed, 
      keyInsight: insights.keyInsight, 
      recommendation: insights.recommendation 
    };
    
    const answer = wantsDualAxis 
      ? `I've created a line chart with ${twoSeries.y} on the left axis and ${twoSeries.y2} on the right axis, plotted over ${twoSeries.x}.`
      : `Plotted two lines over ${twoSeries.x} with ${twoSeries.y} on the left axis and ${twoSeries.y2} on the right axis.`;
    
    return { answer, charts: [chart] };
  }

  // Then check for "vs" queries (for scatter plots and comparisons)
  const vsEarly = detectVsEarly(question);
  if (vsEarly && vsEarly.var1 && vsEarly.var2) {
    console.log('🎯 Early vs detection triggered:', vsEarly);
    
    // Check if user wants "two separate axes" (dual-axis line chart) or just a comparison
    // Also handle typo "separates axes"
    const wantsDualAxis = /\b(two\s+separates?\s+axes?|separates?\s+axes?|dual\s+axis|dual\s+y)\b/i.test(question);
    const wantsLineChart = /\b(line\s*chart|plot|graph)\b/i.test(question);
    
    // Verify columns exist in data
    const firstRow = data[0];
    if (!firstRow) {
      console.error('❌ No data rows available');
      return { answer: 'No data available to create charts. Please upload a data file first.' };
    }
    
    if (!firstRow.hasOwnProperty(vsEarly.var1)) {
      console.error(`❌ Column "${vsEarly.var1}" not found in data`);
      const allCols = summary.columns.map(c => c.name);
      return { answer: `Column "${vsEarly.var1}" not found in the data. Available columns: ${allCols.join(', ')}` };
    }
    
    if (!firstRow.hasOwnProperty(vsEarly.var2)) {
      console.error(`❌ Column "${vsEarly.var2}" not found in data`);
      const allCols = summary.columns.map(c => c.name);
      return { answer: `Column "${vsEarly.var2}" not found in the data. Available columns: ${allCols.join(', ')}` };
    }
    
    // Determine X-axis for line charts: prefer date column
    const allCols = summary.columns.map(c => c.name);
    const lineChartX = summary.dateColumns[0] || 
                      findMatchingColumn('Month', allCols) || 
                      findMatchingColumn('Date', allCols) ||
                      findMatchingColumn('Week', allCols) ||
                      allCols[0];
    
    console.log('📈 Line chart X-axis:', lineChartX);
    console.log('📊 Wants dual axis:', wantsDualAxis, 'Wants line chart:', wantsLineChart);
    
    // If user wants dual-axis line chart, create one line chart with y and y2
    if (wantsDualAxis || wantsLineChart) {
      const dualAxisLineSpec: ChartSpec = {
        type: 'line',
        title: `${vsEarly.var1} and ${vsEarly.var2} over ${lineChartX}`,
        x: lineChartX,
        y: vsEarly.var1,
        y2: vsEarly.var2,
        xLabel: lineChartX,
        yLabel: vsEarly.var1,
        y2Label: vsEarly.var2,
        aggregate: 'none',
      };
      
      console.log('🔄 Processing dual-axis line chart data...');
      const dualAxisLineData = processChartData(data, dualAxisLineSpec);
      console.log(`✅ Dual-axis line data: ${dualAxisLineData.length} points`);
      
      if (dualAxisLineData.length === 0) {
        return { 
          answer: `No valid data points found. Please check that columns "${vsEarly.var1}" and "${vsEarly.var2}" exist and contain numeric data. Available columns: ${allCols.join(', ')}` 
        };
      }
      
      const dualAxisInsights = await generateChartInsights(dualAxisLineSpec, dualAxisLineData, summary);
      
      const charts: ChartSpec[] = [{
        ...dualAxisLineSpec,
        data: dualAxisLineData,
        keyInsight: dualAxisInsights.keyInsight,
        recommendation: dualAxisInsights.recommendation,
      }];
      
      const answer = `I've created a line chart with ${vsEarly.var1} on the left axis and ${vsEarly.var2} on the right axis, plotted over ${lineChartX}.`;
      
      return { answer, charts };
    }
    
    // Otherwise, create scatter plot and two separate line charts (original behavior)
    const scatterSpec: ChartSpec = {
      type: 'scatter',
      title: `Scatter Plot of ${vsEarly.var1} vs ${vsEarly.var2}`,
      x: vsEarly.var1,
      y: vsEarly.var2,
      xLabel: vsEarly.var1,
      yLabel: vsEarly.var2,
      aggregate: 'none',
    };
    
    // Create TWO separate line charts (one for each variable)
    const lineSpec1: ChartSpec = {
      type: 'line',
      title: `${vsEarly.var1} over ${lineChartX}`,
      x: lineChartX,
      y: vsEarly.var1,
      xLabel: lineChartX,
      yLabel: vsEarly.var1,
      aggregate: 'none',
    };
    
    const lineSpec2: ChartSpec = {
      type: 'line',
      title: `${vsEarly.var2} over ${lineChartX}`,
      x: lineChartX,
      y: vsEarly.var2,
      xLabel: lineChartX,
      yLabel: vsEarly.var2,
      aggregate: 'none',
    };
    
    // Process all charts
    console.log('🔄 Processing scatter chart data...');
    const scatterData = processChartData(data, scatterSpec);
    console.log(`✅ Scatter data: ${scatterData.length} points`);
    
    console.log('🔄 Processing line chart 1 data...');
    const lineData1 = processChartData(data, lineSpec1);
    console.log(`✅ Line chart 1 data: ${lineData1.length} points`);
    
    console.log('🔄 Processing line chart 2 data...');
    const lineData2 = processChartData(data, lineSpec2);
    console.log(`✅ Line chart 2 data: ${lineData2.length} points`);
    
    if (scatterData.length === 0 && lineData1.length === 0 && lineData2.length === 0) {
      return { 
        answer: `No valid data points found. Please check that columns "${vsEarly.var1}" and "${vsEarly.var2}" exist and contain numeric data. Available columns: ${allCols.join(', ')}` 
      };
    }
    
    const scatterInsights = await generateChartInsights(scatterSpec, scatterData, summary);
    const lineInsights1 = await generateChartInsights(lineSpec1, lineData1, summary);
    const lineInsights2 = await generateChartInsights(lineSpec2, lineData2, summary);
    
    const charts: ChartSpec[] = [];
    
    if (scatterData.length > 0) {
      charts.push({
        ...scatterSpec,
        data: scatterData,
        keyInsight: scatterInsights.keyInsight,
        recommendation: scatterInsights.recommendation,
      });
    }
    
    if (lineData1.length > 0) {
      charts.push({
        ...lineSpec1,
        data: lineData1,
        keyInsight: lineInsights1.keyInsight,
        recommendation: lineInsights1.recommendation,
      });
    }
    
    if (lineData2.length > 0) {
      charts.push({
        ...lineSpec2,
        data: lineData2,
        keyInsight: lineInsights2.keyInsight,
        recommendation: lineInsights2.recommendation,
      });
    }
    
    const answer = `I've created a scatter plot comparing ${vsEarly.var1} and ${vsEarly.var2}, plus two separate line charts showing each variable over ${lineChartX}.`;
    
    return { answer, charts };
  }
  // Helper: detect explicit axis assignment like "foo (x-axis)" or "bar (y axis)"
  const parseExplicitAxes = (q: string): { x?: string; y?: string } => {
    const result: { x?: string; y?: string } = {};
    // capture phrases followed by (x-axis|x axis|xaxis) or (y-axis|y axis|yaxis)
    const axisRegex = /(.*?)\(([^\)]*)\)/g; // greedy left text + parentheses
    const lower = q.toLowerCase();
    let m: RegExpExecArray | null;
    while ((m = axisRegex.exec(q)) !== null) {
      const rawName = m[1].trim();
      const axisText = m[2].toLowerCase().replace(/\s+/g, '');
      if (!rawName) continue;
      if (axisText.includes('x-axis') || axisText.includes('xaxis') || axisText === 'x') {
        result.x = rawName;
      } else if (axisText.includes('y-axis') || axisText.includes('yaxis') || axisText === 'y') {
        result.y = rawName;
      }
    }
    // Also support formats like "x axis: foo" or "y axis is bar"
    const xMatch = lower.match(/x\s*-?\s*axis\s*[:=]\s*([^,;\n]+)/);
    if (xMatch && !result.x) result.x = xMatch[1].trim();
    const yMatch = lower.match(/y\s*-?\s*axis\s*[:=]\s*([^,;\n]+)/);
    if (yMatch && !result.y) result.y = yMatch[1].trim();
    return result;
  };

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
      // Check for explicit axis hints in the question
      const { x: explicitXRaw, y: explicitYRaw } = parseExplicitAxes(question);
      const explicitX = explicitXRaw ? findMatchingColumn(explicitXRaw, allColumns) : null;
      const explicitY = explicitYRaw ? findMatchingColumn(explicitYRaw, allColumns) : null;
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
        // Respect explicit axis mapping if provided
        const xVar = explicitX && (explicitX === specificCol || explicitX === targetCol)
          ? explicitX
          : specificCol; // default X = specific variable
        const yVar = explicitY && (explicitY === specificCol || explicitY === targetCol)
          ? explicitY
          : targetCol; // default Y = target variable

        // Both numeric: Use correlation analysis
        const { charts, insights } = await analyzeCorrelations(
          data,
          yVar,
          [xVar]
        );
        const answer = `I've analyzed the correlation between ${specificCol} and ${targetCol}. The scatter plot is oriented with X = ${xVar} and Y = ${yVar} as requested.`;
        return { answer, charts, insights };
      } else if (targetIsNumeric && !specificIsNumeric) {
        // Categorical vs Numeric: Create bar chart
        const chartSpec: ChartSpec = {
          type: 'bar',
          title: `${explicitY ? explicitY : targetCol} by ${explicitX ? explicitX : specificCol}`,
          x: explicitX || specificCol,
          y: explicitY || targetCol,
          aggregate: 'mean',
        };
        const charts = [{
          ...chartSpec,
          data: processChartData(data, chartSpec),
        }];
        const answer = `I've created a bar chart showing how ${chartSpec.y} varies across ${chartSpec.x} categories (X=${chartSpec.x}, Y=${chartSpec.y}).`;
        return { answer, charts };
      } else if (!targetIsNumeric && specificIsNumeric) {
        // Numeric vs Categorical: Create bar chart (swap axes)
        const chartSpec: ChartSpec = {
          type: 'bar',
          title: `${explicitY ? explicitY : specificCol} by ${explicitX ? explicitX : targetCol}`,
          x: explicitX || targetCol,
          y: explicitY || specificCol,
          aggregate: 'mean',
        };
        const charts = [{
          ...chartSpec,
          data: processChartData(data, chartSpec),
        }];
        const answer = `I've created a bar chart showing how ${chartSpec.y} varies across ${chartSpec.x} categories (X=${chartSpec.x}, Y=${chartSpec.y}).`;
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

      // Fallback: if for any reason charts came back without per-chart insights,
      // enrich them here so the UI always gets keyInsight and recommendation.
      let enrichedCharts = charts;
      try {
        const needsEnrichment = Array.isArray(charts) && charts.some((c: any) => !('keyInsight' in c) || !('recommendation' in c));
        if (needsEnrichment) {
          enrichedCharts = await Promise.all(
            charts.map(async (c: any) => {
              const chartInsights = await generateChartInsights(c, c.data || [], summary);
              return { ...c, keyInsight: c.keyInsight ?? chartInsights.keyInsight, recommendation: c.recommendation ?? chartInsights.recommendation } as ChartSpec;
            })
          );
        }
      } catch (e) {
        console.error('Fallback enrichment failed for chat correlation charts:', e);
      }

      const answer = `I've analyzed what affects ${targetCol}. The correlation analysis shows the relationship strength between different variables and ${targetCol}. Scatter plots show the actual relationships, and the bar chart ranks variables by correlation strength.`;

      return { answer, charts: enrichedCharts, insights };
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

// generateChartInsights is now centralized in insightGenerator.ts

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
  // Detect explicit axis hints for any chart request
  const parseExplicitAxes = (q: string): { x?: string; y?: string } => {
    const result: { x?: string; y?: string } = {};
    const axisRegex = /(.*?)\(([^\)]*)\)/g;
    let m: RegExpExecArray | null;
    while ((m = axisRegex.exec(q)) !== null) {
      const rawName = m[1].trim();
      const axisText = m[2].toLowerCase().replace(/\s+/g, '');
      if (!rawName) continue;
      if (axisText.includes('x-axis') || axisText.includes('xaxis') || axisText === 'x') {
        result.x = rawName;
      } else if (axisText.includes('y-axis') || axisText.includes('yaxis') || axisText === 'y') {
        result.y = rawName;
      }
    }
    const lower = q.toLowerCase();
    const xMatch = lower.match(/x\s*-?\s*axis\s*[:=]\s*([^,;\n]+)/);
    if (xMatch && !result.x) result.x = xMatch[1].trim();
    const yMatch = lower.match(/y\s*-?\s*axis\s*[:=]\s*([^,;\n]+)/);
    if (yMatch && !result.y) result.y = yMatch[1].trim();
    return result;
  };

  const { x: explicitXRaw, y: explicitYRaw } = parseExplicitAxes(question);
  const availableColumns = summary.columns.map(c => c.name);
  const explicitX = explicitXRaw ? findMatchingColumn(explicitXRaw, availableColumns) : null;
  const explicitY = explicitYRaw ? findMatchingColumn(explicitYRaw, availableColumns) : null;

  // Detect "vs" queries for two numeric variables - generate both scatter and line charts
  const detectVsQuery = (q: string): { var1: string | null; var2: string | null } | null => {
    console.log('🔍 Detecting vs query in:', q);
    
    // Match text before and after "vs" - capture everything up to the end or common stopping words
    const vsMatch = q.match(/(.+?)\s+vs\s+(.+?)(?:\s+on\s+|$)/i) ||
                   q.match(/(.+?)\s+vs\s+(.+)/i);
    
    if (!vsMatch) {
      console.log('❌ No vs match found');
      return null;
    }
    
    let var1Raw = vsMatch[1].trim();
    let var2Raw = vsMatch[2].trim();
    
    console.log('📝 Raw variables:', { var1Raw, var2Raw });
    
    // Remove common chart-related words from the beginning of var1
    var1Raw = var1Raw.replace(/^(?:can\s+you\s+)?(?:plot|graph|chart|show|display)\s+/i, '').trim();
    
    // Remove trailing words like "on two separate axes" from var2
    var2Raw = var2Raw.replace(/\s+(?:on|with|using|separate|axes|axis|chart|graph|plot).*$/i, '').trim();
    
    console.log('🧹 Cleaned variables:', { var1Raw, var2Raw });
    console.log('📊 Available columns:', availableColumns);
    console.log('🔢 Numeric columns:', summary.numericColumns);
    
    // Try to find matching columns - be flexible with matching
    const var1 = findMatchingColumn(var1Raw, availableColumns);
    const var2 = findMatchingColumn(var2Raw, availableColumns);
    
    console.log('🎯 Matched columns:', { var1, var2 });
    
    if (!var1 || !var2) {
      console.log('❌ Could not match columns');
      return null;
    }
    
    // Check if both are numeric
    const bothNumeric = summary.numericColumns.includes(var1) && summary.numericColumns.includes(var2);
    if (!bothNumeric) {
      console.log('❌ Not both numeric. var1 numeric:', summary.numericColumns.includes(var1), 'var2 numeric:', summary.numericColumns.includes(var2));
      return null;
    }
    
    console.log('✅ Valid vs query detected:', { var1, var2 });
    return { var1, var2 };
  };

  // Also check for "and" queries in generateGeneralAnswer (fallback if detectTwoSeriesLine didn't catch it)
  const detectAndQuery = (q: string): { var1: string | null; var2: string | null } | null => {
    console.log('🔍 Detecting "and" query in generateGeneralAnswer:', q);
    const ql = q.toLowerCase();
    
    // Must have "and" 
    if (!ql.includes(' and ')) {
      console.log('❌ No "and" found');
      return null;
    }
    
    // Check for "two separate axes" or "plot" or "line chart" to distinguish from other uses of "and"
    const wantsChart = /\b(two\s+separates?\s+axes?|separates?\s+axes?|dual\s+axis|plot|graph|chart|line)\b/i.test(q);
    if (!wantsChart) {
      console.log('❌ Does not want chart');
      return null;
    }
    
    const andMatch = q.match(/(.+?)\s+and\s+(.+)/i);
    if (!andMatch) {
      console.log('❌ No and match pattern found');
      return null;
    }
    
    let var1Raw = andMatch[1].trim();
    let var2Raw = andMatch[2].trim();
    
    // Clean up
    var1Raw = var1Raw.replace(/^(?:can\s+you\s+)?(?:plot|graph|chart|show|display)\s+/i, '').trim();
    var2Raw = var2Raw.replace(/\s+(?:on|with|using|separate|axes|axis|chart|graph|plot|over.*).*$/i, '').trim();
    
    console.log('📝 Cleaned "and" variables:', { var1Raw, var2Raw });
    
    const var1 = findMatchingColumn(var1Raw, availableColumns);
    const var2 = findMatchingColumn(var2Raw, availableColumns);
    
    console.log('🎯 Matched "and" columns:', { var1, var2 });
    
    if (!var1 || !var2) {
      console.log('❌ Could not match "and" columns');
      return null;
    }
    
    const bothNumeric = summary.numericColumns.includes(var1) && summary.numericColumns.includes(var2);
    if (!bothNumeric) {
      console.log('❌ "And" columns not both numeric');
      return null;
    }
    
    console.log('✅ Valid "and" query detected:', { var1, var2 });
    return { var1, var2 };
  };

  const andQuery = detectAndQuery(question);
  if (andQuery && andQuery.var1 && andQuery.var2) {
    console.log('🚀 Processing "and" query with dual-axis line chart:', andQuery);
    
    // Determine X-axis for line chart
    const lineChartX = summary.dateColumns[0] || 
                      findMatchingColumn('Month', availableColumns) || 
                      findMatchingColumn('Date', availableColumns) ||
                      findMatchingColumn('Week', availableColumns) ||
                      availableColumns[0];
    
    const wantsDualAxis = /\b(two\s+separates?\s+axes?|separates?\s+axes?|dual\s+axis)\b/i.test(question);
    
    // Create dual-axis line chart
    const lineSpec: ChartSpec = {
      type: 'line',
      title: `${andQuery.var1} and ${andQuery.var2} over ${lineChartX}`,
      x: lineChartX,
      y: andQuery.var1,
      y2: andQuery.var2,
      xLabel: lineChartX,
      yLabel: andQuery.var1,
      y2Label: andQuery.var2,
      aggregate: 'none',
    };
    
    console.log('🔄 Processing dual-axis line chart data...');
    const lineData = processChartData(data, lineSpec);
    console.log(`✅ Dual-axis line data: ${lineData.length} points`);
    
    if (lineData.length === 0) {
      return { answer: `No valid data points found for line chart. Please check that columns "${andQuery.var1}" and "${andQuery.var2}" contain numeric data.` };
    }
    
    const lineInsights = await generateChartInsights(lineSpec, lineData, summary);
    
    const charts: ChartSpec[] = [{
      ...lineSpec,
      data: lineData,
      keyInsight: lineInsights.keyInsight,
      recommendation: lineInsights.recommendation,
    }];
    
    const answer = wantsDualAxis
      ? `I've created a line chart with ${andQuery.var1} on the left axis and ${andQuery.var2} on the right axis, plotted over ${lineChartX}.`
      : `I've created a line chart showing ${andQuery.var1} and ${andQuery.var2} over ${lineChartX}.`;
    
    return { answer, charts };
  }

  const vsQuery = detectVsQuery(question);
  
  // If "vs" query detected with two numeric variables, generate both scatter and line charts
  if (vsQuery && vsQuery.var1 && vsQuery.var2) {
    console.log('🚀 Processing vs query with variables:', vsQuery);
    
    // Verify columns exist in data
    const firstRow = data[0];
    if (!firstRow) {
      console.error('❌ No data rows available');
      return { answer: 'No data available to create charts. Please upload a data file first.' };
    }
    
    if (!firstRow.hasOwnProperty(vsQuery.var1)) {
      console.error(`❌ Column "${vsQuery.var1}" not found in data`);
      return { answer: `Column "${vsQuery.var1}" not found in the data. Available columns: ${availableColumns.join(', ')}` };
    }
    
    if (!firstRow.hasOwnProperty(vsQuery.var2)) {
      console.error(`❌ Column "${vsQuery.var2}" not found in data`);
      return { answer: `Column "${vsQuery.var2}" not found in the data. Available columns: ${availableColumns.join(', ')}` };
    }
    
    // Determine X-axis for line chart: prefer date column, otherwise use index or first variable
    const lineChartX = summary.dateColumns[0] || 
                      findMatchingColumn('Month', availableColumns) || 
                      findMatchingColumn('Date', availableColumns) ||
                      findMatchingColumn('Week', availableColumns) ||
                      availableColumns[0]; // fallback to first column
    
    console.log('📈 Line chart X-axis:', lineChartX);
    
    // Use explicit axes if provided, otherwise use detected variables
    const scatterX = explicitX || vsQuery.var1;
    const scatterY = explicitY || vsQuery.var2;
    
    console.log('📊 Scatter chart axes:', { scatterX, scatterY });
    
    // Create scatter chart spec
    const scatterSpec: ChartSpec = {
      type: 'scatter',
      title: `Scatter Plot of ${scatterX} vs ${scatterY}`,
      x: scatterX,
      y: scatterY,
      xLabel: scatterX,
      yLabel: scatterY,
      aggregate: 'none',
    };
    
    // Create line chart spec (dual Y-axis)
    const lineSpec: ChartSpec = {
      type: 'line',
      title: `${vsQuery.var1} and ${vsQuery.var2} over ${lineChartX}`,
      x: lineChartX,
      y: vsQuery.var1,
      y2: vsQuery.var2,
      xLabel: lineChartX,
      yLabel: vsQuery.var1,
      y2Label: vsQuery.var2,
      aggregate: 'none',
    };
    
    // Process both charts
    console.log('🔄 Processing scatter chart data...');
    const scatterData = processChartData(data, scatterSpec);
    console.log(`✅ Scatter data: ${scatterData.length} points`);
    
    console.log('🔄 Processing line chart data...');
    const lineData = processChartData(data, lineSpec);
    console.log(`✅ Line data: ${lineData.length} points`);
    
    if (scatterData.length === 0) {
      console.error('❌ Scatter chart has no data');
      return { answer: `No valid data points found for scatter plot. Please check that columns "${scatterX}" and "${scatterY}" contain numeric data.` };
    }
    
    if (lineData.length === 0) {
      console.error('❌ Line chart has no data');
      return { answer: `No valid data points found for line chart. Please check that columns "${vsQuery.var1}" and "${vsQuery.var2}" contain numeric data.` };
    }
    
    const scatterInsights = await generateChartInsights(scatterSpec, scatterData, summary);
    const lineInsights = await generateChartInsights(lineSpec, lineData, summary);
    
    const charts: ChartSpec[] = [
      {
        ...scatterSpec,
        data: scatterData,
        keyInsight: scatterInsights.keyInsight,
        recommendation: scatterInsights.recommendation,
      },
      {
        ...lineSpec,
        data: lineData,
        keyInsight: lineInsights.keyInsight,
        recommendation: lineInsights.recommendation,
      },
    ];
    
    console.log('✅ Successfully created both charts');
    const answer = `I've created both a scatter plot and a line chart comparing ${vsQuery.var1} and ${vsQuery.var2}. The scatter plot shows the relationship between the two variables, while the line chart shows their trends over ${lineChartX}.`;
    
    return { answer, charts };
  }

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

CRITICAL FOR CORRELATION CHARTS:
- If generating correlation charts, NEVER modify correlation values
- Use EXACT correlation values as calculated (positive/negative)
- Do NOT convert negative correlations to positive or vice versa
- Correlation values must preserve their original sign

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
        content: 'You are a helpful data analyst assistant. Provide specific, accurate answers. Column names (x, y) must be strings, not arrays. CRITICAL: Never modify correlation values - preserve their original positive/negative signs.',
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
        
        // Apply explicit axis overrides from the question if provided
        const finalX = explicitX || String(x || '');
        const finalY = explicitY || String(y || '');

        return {
          type: spec.type,
          title: spec.title || 'Chart',
          x: finalX,
          y: finalY,
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
          xLabel: spec.x,
          yLabel: spec.y,
          data: processedData,
          keyInsight: chartInsights.keyInsight,
          recommendation: chartInsights.recommendation,
        };
      }));
      
      console.log('Chat charts generated:', processedCharts?.length || 0);

      // If user asked explicitly for one line chart with two variables, merge first two line charts sharing same X
      const wantsSingleCombined = /\b(one|single)\s+line\s*chart\b|\bin\s+one\s+chart\b|\btogether\b/i.test(question);
      if (wantsSingleCombined && processedCharts && processedCharts.length >= 2) {
        const c1 = processedCharts.find(c => c.type === 'line' && Array.isArray(c.data));
        const c2 = processedCharts.find(c => c !== c1 && c.type === 'line' && Array.isArray(c.data));
        if (c1 && c2 && c1.x === c2.x) {
          // Build map from X to values for both series
          const xKey = c1.x;
          const y1Key = c1.y;
          const y2Key = c2.y;
          const map = new Map<string | number, any>();
          (c1.data as any[]).forEach(row => {
            const k = row[xKey];
            map.set(k, { [xKey]: k, [y1Key]: row[y1Key] });
          });
          (c2.data as any[]).forEach(row => {
            const k = row[xKey];
            const existing = map.get(k) || { [xKey]: k };
            existing[y2Key] = row[y2Key];
            map.set(k, existing);
          });
          const mergedData = Array.from(map.values()).sort((a, b) => String(a[xKey]).localeCompare(String(b[xKey])));
          const merged: ChartSpec = {
            type: 'line',
            title: c1.title || `${y1Key} and ${y2Key} over ${xKey}`,
            x: xKey,
            y: y1Key,
            y2: y2Key,
            xLabel: c1.xLabel || xKey,
            yLabel: c1.yLabel || y1Key,
            y2Label: c2.yLabel || y2Key,
            aggregate: 'none',
            data: mergedData,
            keyInsight: c1.keyInsight,
            recommendation: c1.recommendation,
          } as any;
          // Replace charts with single merged one
          processedCharts = [merged];
        }
      }
    }

    // Always provide chat-level insights: prefer model's, else derive from charts
    let overallInsights = Array.isArray(result.insights) ? result.insights : undefined;
    if ((!overallInsights || overallInsights.length === 0) && Array.isArray(processedCharts) && processedCharts.length > 0) {
      overallInsights = processedCharts
        .map((c, idx) => (c.keyInsight ? { id: idx + 1, text: c.keyInsight! } : null))
        .filter(Boolean) as any;
    }

    return {
      answer: result.answer,
      charts: processedCharts,
      insights: overallInsights,
    };
  } catch {
    return { answer: 'I apologize, but I had trouble processing your question. Please try rephrasing it.' };
  }
}
