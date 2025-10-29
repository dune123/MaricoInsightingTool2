import { ChartSpec, Insight, DataSummary } from '@shared/schema.js';
import { openai, MODEL } from './openai.js';
import { generateChartInsights } from './insightGenerator.js';

// Helper to clean numeric values (strip %, commas, etc.)
function toNumber(value: any): number {
  if (value === null || value === undefined || value === '') return NaN;
  const cleaned = String(value).replace(/[%,]/g, '').trim();
  return Number(cleaned);
}

interface CorrelationResult {
  variable: string;
  correlation: number;
  nPairs?: number;
}

// Calculate linear regression (slope and intercept) for trend line
function linearRegression(xValues: number[], yValues: number[]): { slope: number; intercept: number } | null {
  const n = Math.min(xValues.length, yValues.length);
  if (n === 0) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    const x = xValues[i];
    const y = yValues[i];
    if (isNaN(x) || isNaN(y)) continue;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
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
  console.log('=== RAW CORRELATION VALUES DEBUG ===');
  correlations.forEach((corr, idx) => {
    console.log(`RAW ${idx + 1}. ${corr.variable}: ${corr.correlation} (${corr.correlation > 0 ? 'POSITIVE' : 'NEGATIVE'})`);
  });
  console.log('=== END RAW CORRELATION DEBUG ===');

  if (correlations.length === 0) {
    console.error('No correlations found!');
    return { charts: [], insights: [] };
  }

  // Get top correlations (by absolute value)
  const sortedCorrelations = correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  const topCorrelations = sortedCorrelations.slice(0, 12);

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
    
    // Calculate trend line
    let trendLine: Array<Record<string, number>> | undefined;
    
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
      
      // Calculate linear regression for trend line
      const regression = linearRegression(xValues, yValues);
      
      if (regression) {
        // Calculate trend line endpoints using the calculated domain (or actual min/max if domain not set)
        const xMinForLine = xDomain ? xDomain[0] : xMin;
        const xMaxForLine = xDomain ? xDomain[1] : xMax;
        const yAtMin = regression.slope * xMinForLine + regression.intercept;
        const yAtMax = regression.slope * xMaxForLine + regression.intercept;
        
        trendLine = [
          { [xAxis]: xMinForLine, [yAxis]: yAtMin },
          { [xAxis]: xMaxForLine, [yAxis]: yAtMax },
        ];
      }
    }
    
    console.log(`Scatter chart ${idx}: ${corr.variable} vs ${targetVariable}, data points: ${scatterData.length}, axes: ${useSwappedAxes ? 'swapped' : 'normal'}${xDomain ? `, xDomain: [${xDomain[0].toFixed(1)}, ${xDomain[1].toFixed(1)}]` : ''}${yDomain ? `, yDomain: [${yDomain[0].toFixed(1)}, ${yDomain[1].toFixed(1)}]` : ''}${trendLine ? ', trend line: yes' : ', trend line: no'}`);
    
    return {
      type: 'scatter',
      title: `${corr.variable} vs ${targetVariable} (r=${corr.correlation.toFixed(2)})`,
      x: xAxis,
      y: yAxis,
      data: scatterData,
      ...(xDomain && { xDomain }),
      ...(yDomain && { yDomain }),
      ...(trendLine && { trendLine }),
    };
  });

  // Only add bar chart if we have multiple correlations
  const charts: ChartSpec[] = [...scatterCharts];
  
  if (topCorrelations.length > 1) {
    // IMPORTANT: Do NOT modify correlation signs - show actual positive/negative values
    console.log('=== BAR CHART CORRELATION VALUES DEBUG ===');
    topCorrelations.forEach((corr, idx) => {
      console.log(`${idx + 1}. ${corr.variable}: ${corr.correlation} (${corr.correlation > 0 ? 'POSITIVE' : 'NEGATIVE'})`);
    });
    console.log('=== END BAR CHART DEBUG ===');
    
    const correlationBarChart: ChartSpec = {
      type: 'bar',
      title: `Factors Affecting ${targetVariable}`,
      x: 'variable',
      y: 'correlation',
      data: topCorrelations.map((corr) => ({
        variable: corr.variable,
        correlation: corr.correlation, // CRITICAL: Keep original sign (positive/negative)
      })),
    };
    
    console.log('=== FINAL BAR CHART DATA DEBUG ===');
    console.log('Bar chart data being sent to frontend:');
    const barData = (correlationBarChart.data || []) as Array<{ variable: string; correlation: number }>;
    barData.forEach((item, idx) => {
      const corrVal = Number(item.correlation);
      console.log(`FINAL ${idx + 1}. ${item.variable}: ${corrVal} (${corrVal > 0 ? 'POSITIVE' : 'NEGATIVE'})`);
    });
    console.log('=== END FINAL BAR CHART DEBUG ===');
    
    charts.push(correlationBarChart);
  }

  console.log('Total charts generated:', charts.length);
  console.log('=== END CORRELATION DEBUG ===');

  // Enrich each chart with keyInsight and recommendation
  try {
    const summaryStub: DataSummary = {
      rowCount: data.length,
      columnCount: Object.keys(data[0] || {}).length,
      columns: Object.keys(data[0] || {}).map((name) => ({ name, type: typeof (data[0] || {})[name], sampleValues: [] as any })),
      numericColumns: numericColumns,
      dateColumns: [],
    } as unknown as DataSummary;

    const chartsWithInsights = await Promise.all(
      charts.map(async (c) => {
        const chartInsights = await generateChartInsights(c, c.data || [], summaryStub);
        return { ...c, keyInsight: chartInsights.keyInsight, recommendation: chartInsights.recommendation } as ChartSpec;
      })
    );
    charts.splice(0, charts.length, ...chartsWithInsights);
  } catch (e) {
    console.error('Failed to enrich correlation charts with insights:', e);
  }

  // Generate AI insights about correlations (use full sorted list so AI doesn't miss variables)
  const insights = await generateCorrelationInsights(targetVariable, sortedCorrelations);

  return { charts, insights };
}

function calculateCorrelations(
  data: Record<string, any>[],
  targetVariable: string,
  numericColumns: string[]
): CorrelationResult[] {
  const correlations: CorrelationResult[] = [];

  // Precompute target values (keep row alignment; NA preserved as NaN)
  const targetValuesAllRows = data.map((row) => toNumber(row[targetVariable]));
  const hasAnyTarget = targetValuesAllRows.some((v) => !isNaN(v));
  if (!hasAnyTarget) return [];

  for (const col of numericColumns) {
    if (col === targetVariable) continue;

    // Build row-aligned pairs; skip rows where either side is NA (pairwise deletion)
    const x: number[] = []; // target
    const y: number[] = []; // column
    for (let i = 0; i < data.length; i++) {
      const tv = targetValuesAllRows[i];
      const cv = toNumber(data[i][col]);
      if (!isNaN(tv) && !isNaN(cv)) {
        x.push(tv);
        y.push(cv);
      }
    }

    if (x.length === 0) continue;

    // Calculate Pearson correlation on paired arrays
    const correlation = pearsonCorrelation(x, y);

    if (!isNaN(correlation)) {
      correlations.push({ variable: col, correlation, nPairs: x.length });
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
  const prompt = `Analyze these correlations with ${targetVariable}.

DATA HANDLING RULES (must follow exactly):
- Pearson correlation using pairwise deletion: if either value is NA on a row, exclude that row; do not impute.
- Use the EXACT signed correlation values provided; never change the sign.
- Cover ALL variables at least once in the insights (do not omit any listed below).

VALUES (variable: r, nPairs):
${correlations.map((c) => `- ${c.variable}: ${c.correlation.toFixed(3)}, n=${c.nPairs ?? 'NA'}`).join('\n')}

Write 3-5 insights. Each must include: (1) bold headline, (2) exact r and nPairs, (3) interpretation, (4) one actionable recommendation and a reminder that correlation != causation.

Output JSON only: {"insights":[{"text":"..."}]}`;

  const response = await openai.chat.completions.create({
    model: MODEL || "gpt-4o",
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
