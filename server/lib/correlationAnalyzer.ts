import { ChartSpec, Insight } from '@shared/schema.js';
import { openai, MODEL } from './openai.js';

// Helper to clean numeric values (strip %, commas, etc.)
function toNumber(value: any): number {
  if (value === null || value === undefined || value === '') return NaN;
  const cleaned = String(value).replace(/[%,]/g, '').trim();
  return Number(cleaned);
}

interface CorrelationResult {
  variable: string;
  correlation: number;
}

export async function analyzeCorrelations(
  data: Record<string, any>[],
  targetVariable: string,
  numericColumns: string[]
): Promise<{ charts: ChartSpec[]; insights: Insight[] }> {
  console.log('=== CORRELATION ANALYSIS DEBUG ===');
  console.log('Target variable:', targetVariable);
  console.log('Numeric columns to analyze:', numericColumns);
  console.log('Data rows:', data.length);
  
  // Calculate correlations
  const correlations = calculateCorrelations(data, targetVariable, numericColumns);
  console.log('Correlations calculated:', correlations);

  if (correlations.length === 0) {
    console.error('No correlations found!');
    return { charts: [], insights: [] };
  }

  // Get top 5 positive and top 3 negative correlations
  const sortedCorrelations = correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  const topCorrelations = sortedCorrelations.slice(0, 8);

  // Generate scatter plots for top 3 correlations
  const scatterCharts: ChartSpec[] = topCorrelations.slice(0, 3).map((corr, idx) => {
    const scatterData = data
      .map((row) => ({
        [corr.variable]: toNumber(row[corr.variable]),
        [targetVariable]: toNumber(row[targetVariable]),
      }))
      .filter((row) => !isNaN(row[corr.variable]) && !isNaN(row[targetVariable]))
      .slice(0, 1000);
    
    // Smart axis selection: put smaller range on X-axis, larger range on Y-axis
    const varValues = scatterData.map(row => row[corr.variable]);
    const targetValues = scatterData.map(row => row[targetVariable]);
    
    const varRange = Math.max(...varValues) - Math.min(...varValues);
    const targetRange = Math.max(...targetValues) - Math.min(...targetValues);
    
    // If target has smaller range, swap axes for better visualization
    const useSwappedAxes = targetRange < varRange;
    const xAxis = useSwappedAxes ? targetVariable : corr.variable;
    const yAxis = useSwappedAxes ? corr.variable : targetVariable;
    
    // Calculate smart axis domains with padding (only if we have valid data)
    let xDomain: [number, number] | undefined;
    let yDomain: [number, number] | undefined;
    
    if (scatterData.length > 0) {
      const xValues = scatterData.map(row => row[xAxis]);
      const yValues = scatterData.map(row => row[yAxis]);
      
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);
      
      // Add 10% padding to the range (or 1 if range is 0)
      const xRange = xMax - xMin;
      const yRange = yMax - yMin;
      const xPadding = xRange > 0 ? xRange * 0.1 : 1;
      const yPadding = yRange > 0 ? yRange * 0.1 : 1;
      
      // Only set domains if values are finite
      if (isFinite(xMin) && isFinite(xMax)) {
        xDomain = [xMin - xPadding, xMax + xPadding];
      }
      if (isFinite(yMin) && isFinite(yMax)) {
        yDomain = [yMin - yPadding, yMax + yPadding];
      }
    }
    
    console.log(`Scatter chart ${idx}: ${corr.variable} vs ${targetVariable}, data points: ${scatterData.length}, axes: ${useSwappedAxes ? 'swapped' : 'normal'}${xDomain ? `, xDomain: [${xDomain[0].toFixed(1)}, ${xDomain[1].toFixed(1)}]` : ''}${yDomain ? `, yDomain: [${yDomain[0].toFixed(1)}, ${yDomain[1].toFixed(1)}]` : ''}`);
    
    return {
      type: 'scatter',
      title: `${corr.variable} vs ${targetVariable} (r=${corr.correlation.toFixed(2)})`,
      x: xAxis,
      y: yAxis,
      data: scatterData,
      ...(xDomain && { xDomain }),
      ...(yDomain && { yDomain }),
    };
  });

  // Only add bar chart if we have multiple correlations
  const charts: ChartSpec[] = [...scatterCharts];
  
  if (topCorrelations.length > 1) {
    const correlationBarChart: ChartSpec = {
      type: 'bar',
      title: `Factors Affecting ${targetVariable}`,
      x: 'variable',
      y: 'correlation',
      data: topCorrelations.map((corr) => ({
        variable: corr.variable,
        correlation: Math.abs(corr.correlation),
      })),
    };
    charts.push(correlationBarChart);
  }

  console.log('Total charts generated:', charts.length);
  console.log('=== END CORRELATION DEBUG ===');

  // Generate AI insights about correlations
  const insights = await generateCorrelationInsights(targetVariable, topCorrelations);

  return { charts, insights };
}

function calculateCorrelations(
  data: Record<string, any>[],
  targetVariable: string,
  numericColumns: string[]
): CorrelationResult[] {
  const correlations: CorrelationResult[] = [];

  // Get target values
  const targetValues = data
    .map((row) => toNumber(row[targetVariable]))
    .filter((v) => !isNaN(v));

  if (targetValues.length === 0) return [];

  for (const col of numericColumns) {
    if (col === targetVariable) continue;

    const colValues = data
      .map((row) => toNumber(row[col]))
      .filter((v) => !isNaN(v));

    if (colValues.length === 0) continue;

    // Calculate Pearson correlation
    const correlation = pearsonCorrelation(targetValues, colValues);

    if (!isNaN(correlation)) {
      correlations.push({ variable: col, correlation });
    }
  }

  return correlations;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return NaN;

  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? NaN : numerator / denominator;
}

async function generateCorrelationInsights(
  targetVariable: string,
  correlations: CorrelationResult[]
): Promise<Insight[]> {
  const prompt = `Analyze these correlations with ${targetVariable}:

${correlations.map((c) => `- ${c.variable}: ${c.correlation.toFixed(3)}`).join('\n')}

Provide 3-5 detailed correlation insights. Each insight MUST include:
1. A bold headline with the key finding (e.g., **Strongest Positive Correlation:**)
2. Specific correlation values and what they mean
3. Explanation of WHY this correlation matters
4. Actionable recommendation or caution about correlation vs causation

Format each insight as a complete paragraph:
**[Insight Title]:** [Finding with specific correlation values]. **Why it matters:** [Business impact or interpretation]. **Actionable Recommendation:** [Specific action or caution about causation].

Example:
**Strong Negative Correlation with Defects:** Manufacturing costs show a strong negative correlation (r=-0.78) with ${targetVariable}, indicating higher costs are associated with lower ${targetVariable} values. **Why it matters:** This unexpected relationship suggests potential quality issues when costs are cut, impacting ${targetVariable} performance. **Actionable Recommendation:** Investigate whether cost-cutting measures are compromising quality; establish minimum quality thresholds before cost optimization.

Output as JSON array:
{
  "insights": [
    { "text": "**Insight Title:** Full detailed insight text..." },
    ...
  ]
}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a senior data analyst providing detailed correlation insights. Be specific, use correlation values, and provide actionable recommendations. Output valid JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1500,
  });

  const content = response.choices[0].message.content || '{}';

  try {
    const parsed = JSON.parse(content);
    const insightArray = parsed.insights || [];
    
    return insightArray.slice(0, 5).map((item: any, index: number) => ({
      id: index + 1,
      text: item.text || item.insight || String(item),
    }));
  } catch (error) {
    console.error('Error parsing correlation insights:', error);
    return [];
  }
}
