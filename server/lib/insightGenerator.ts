import { ChartSpec, DataSummary } from '@shared/schema.js';
import { openai, MODEL } from './openai.js';

export async function generateChartInsights(
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

  // Check if this is a dual-axis line chart
  const isDualAxis = chartSpec.type === 'line' && !!(chartSpec as any).y2;
  const y2Variable = (chartSpec as any).y2;
  const y2Label = (chartSpec as any).y2Label || y2Variable;

  const xValues = chartData.map(row => row[chartSpec.x]).filter(v => v !== null && v !== undefined);
  const yValues = chartData.map(row => row[chartSpec.y]).filter(v => v !== null && v !== undefined);
  const y2Values = isDualAxis ? chartData.map(row => row[y2Variable]).filter(v => v !== null && v !== undefined) : [];

  const numericX: number[] = xValues.map(v => Number(String(v).replace(/[%,,]/g, ''))).filter(v => !isNaN(v));
  const numericY: number[] = yValues.map(v => Number(String(v).replace(/[%,,]/g, ''))).filter(v => !isNaN(v));
  const numericY2: number[] = isDualAxis ? y2Values.map(v => Number(String(v).replace(/[%,,]/g, ''))).filter(v => !isNaN(v)) : [];

  const maxY = numericY.length > 0 ? Math.max(...numericY) : 0;
  const minY = numericY.length > 0 ? Math.min(...numericY) : 0;
  const avgY = numericY.length > 0 ? numericY.reduce((a, b) => a + b, 0) / numericY.length : 0;

  // Helper functions for deterministic, numeric recommendations
  const percentile = (arr: number[], p: number): number => {
    if (arr.length === 0) return NaN;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };

  const roundSmart = (v: number): string => {
    if (!isFinite(v)) return String(v);
    const abs = Math.abs(v);
    if (abs >= 100) return v.toFixed(0);
    if (abs >= 10) return v.toFixed(1);
    if (abs >= 1) return v.toFixed(2);
    return v.toFixed(3);
  };

  // Calculate statistics for Y2 if dual-axis
  const maxY2 = numericY2.length > 0 ? Math.max(...numericY2) : 0;
  const minY2 = numericY2.length > 0 ? Math.min(...numericY2) : 0;
  const avgY2 = numericY2.length > 0 ? numericY2.reduce((a, b) => a + b, 0) / numericY2.length : 0;

  // Detect if Y-axis appears to be a percentage column (contains '%' in raw values)
  const yIsPercent = yValues.some(v => typeof v === 'string' && v.includes('%'));
  const y2IsPercent = isDualAxis ? y2Values.some(v => typeof v === 'string' && v.includes('%')) : false;
  const formatY = (val: number): string => yIsPercent ? `${roundSmart(val)}%` : roundSmart(val);
  const formatY2 = (val: number): string => y2IsPercent ? `${roundSmart(val)}%` : roundSmart(val);

  // Calculate standard deviation
  const stdDev = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };

  // Find top/bottom performers
  const findTopPerformers = (data: Record<string, any>[], yKey: string, limit: number = 3): Array<{x: any, y: number}> => {
    return data
      .map(row => ({ x: row[chartSpec.x], y: Number(String(row[yKey]).replace(/[%,,]/g, '')) }))
      .filter(item => !isNaN(item.y))
      .sort((a, b) => b.y - a.y)
      .slice(0, limit);
  };

  const findBottomPerformers = (data: Record<string, any>[], yKey: string, limit: number = 3): Array<{x: any, y: number}> => {
    return data
      .map(row => ({ x: row[chartSpec.x], y: Number(String(row[yKey]).replace(/[%,,]/g, '')) }))
      .filter(item => !isNaN(item.y))
      .sort((a, b) => a.y - b.y)
      .slice(0, limit);
  };

  // Calculate percentiles for Y values
  const yP25 = percentile(numericY, 0.25);
  const yP50 = percentile(numericY, 0.5);
  const yP75 = percentile(numericY, 0.75);
  const yP90 = percentile(numericY, 0.9);
  const yStdDev = stdDev(numericY);
  const yMedian = yP50;

  // Calculate statistics for Y2 if dual-axis
  const y2P25 = isDualAxis && numericY2.length > 0 ? percentile(numericY2, 0.25) : NaN;
  const y2P50 = isDualAxis && numericY2.length > 0 ? percentile(numericY2, 0.5) : NaN;
  const y2P75 = isDualAxis && numericY2.length > 0 ? percentile(numericY2, 0.75) : NaN;
  const y2P90 = isDualAxis && numericY2.length > 0 ? percentile(numericY2, 0.9) : NaN;
  const y2StdDev = isDualAxis ? stdDev(numericY2) : 0;
  const y2Median = y2P50;
  const y2CV = isDualAxis && avgY2 !== 0 ? (y2StdDev / Math.abs(avgY2)) * 100 : 0;
  const y2Variability = isDualAxis ? (y2CV > 30 ? 'high' : y2CV > 15 ? 'moderate' : 'low') : '';

  const pearsonR = (xs: number[], ys: number[]): number => {
    const n = Math.min(xs.length, ys.length);
    if (n < 3) return NaN;
    const x = xs.slice(0, n);
    const y = ys.slice(0, n);
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const mx = mean(x);
    const my = mean(y);
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - mx;
      const dy = y[i] - my;
      num += dx * dy;
      dx2 += dx * dx;
      dy2 += dy * dy;
    }
    const den = Math.sqrt(dx2 * dy2);
    return den === 0 ? NaN : num / den;
  };

  // Detect if this is a correlation chart (impact analysis) - check this BEFORE early return
  const isCorrelationChart = (chartSpec as any)._isCorrelationChart === true;
  const targetVariable = (chartSpec as any)._targetVariable || chartSpec.y;
  const factorVariable = (chartSpec as any)._factorVariable || chartSpec.x;

  // If both axes are numeric (especially scatter), produce a quantified X-range tied to high Y
  // BUT: For correlation charts, we need to use the correlation context, not early return
  const bothNumeric = numericX.length > 0 && numericY.length > 0;
  if (bothNumeric && !isCorrelationChart) {
    // Identify X range corresponding to top 20% and top 10% of Y outcomes
    const yP80 = percentile(numericY, 0.8);
    const yP90 = percentile(numericY, 0.9);
    const yP75 = percentile(numericY, 0.75);
    const pairs = chartData
      .map(r => [Number(String(r[chartSpec.x]).replace(/[%,,]/g, '')), Number(String(r[chartSpec.y]).replace(/[%,,]/g, ''))] as [number, number])
      .filter(([vx, vy]) => !isNaN(vx) && !isNaN(vy));
    const top20Pairs = pairs.filter(([, vy]) => vy >= yP80);
    const top10Pairs = pairs.filter(([, vy]) => vy >= yP90);
    const xInTop20 = top20Pairs.map(([vx]) => vx);
    const xInTop10 = top10Pairs.map(([vx]) => vx);
    
    // Calculate optimal X ranges for different performance levels
    const xLow20 = percentile(xInTop20.length ? xInTop20 : numericX, 0.1);
    const xHigh20 = percentile(xInTop20.length ? xInTop20 : numericX, 0.9);
    const xLow10 = percentile(xInTop10.length ? xInTop10 : numericX, 0.1);
    const xHigh10 = percentile(xInTop10.length ? xInTop10 : numericX, 0.9);
    
    // Calculate average X for top performers
    const avgXTop20 = xInTop20.length > 0 ? xInTop20.reduce((a, b) => a + b, 0) / xInTop20.length : NaN;
    const avgXTop10 = xInTop10.length > 0 ? xInTop10.reduce((a, b) => a + b, 0) / xInTop10.length : NaN;

    const r = pearsonR(numericX, numericY);
    const trend = isNaN(r) ? '' : r > 0.15 ? 'positive' : r < -0.15 ? 'negative' : 'weak';
    const strength = isNaN(r) ? '' : Math.abs(r) > 0.7 ? 'strong' : Math.abs(r) > 0.4 ? 'moderate' : 'weak';

    const keyInsight = isNaN(r)
      ? `Observed ${pairs.length} valid points. ${chartSpec.y} ranges ${formatY(minY)}–${formatY(maxY)} (avg ${formatY(avgY)}, median ${formatY(yMedian)}). Top 20% performers achieve ${chartSpec.y} ≥ ${formatY(yP80)}.`
      : `Observed ${pairs.length} valid points with ${strength} ${trend} correlation (r=${roundSmart(r)}). ${chartSpec.y} ranges ${formatY(minY)}–${formatY(maxY)} (avg ${formatY(avgY)}, median ${formatY(yMedian)}). Top 20% performers achieve ${chartSpec.y} ≥ ${formatY(yP80)}.`;

    // Enhanced recommendation with multiple performance tiers
    let recommendation = '';
    if (xInTop20.length > 0) {
      if (xInTop10.length > 0 && !isNaN(avgXTop10)) {
        recommendation = `To achieve top-10% ${chartSpec.y} outcomes (≥${formatY(yP90)}): target ${chartSpec.x} around ${roundSmart(avgXTop10)} (range ${roundSmart(xLow10)}–${roundSmart(xHigh10)}). For top-20% outcomes (≥${formatY(yP80)}): maintain ${chartSpec.x} between ${roundSmart(xLow20)}–${roundSmart(xHigh20)}. Current average ${chartSpec.x} is ${roundSmart(avgXTop20)}, which supports P75 performance (${formatY(yP75)}).`;
      } else {
        recommendation = `Maintain ${chartSpec.x} within ${roundSmart(xLow20)}–${roundSmart(xHigh20)} to achieve top-20% ${chartSpec.y} outcomes (≥${formatY(yP80)}). Target optimal range around ${roundSmart(avgXTop20)} for best results. Current average supports ${formatY(yP75)} performance level.`;
      }
    } else {
      recommendation = `Target ${chartSpec.y} above ${formatY(yP75)} (P75) for competitive performance. Current range suggests focusing on ${chartSpec.x} values between ${roundSmart(percentile(numericX, 0.25))}–${roundSmart(percentile(numericX, 0.75))} to align with median ${chartSpec.y} of ${formatY(yMedian)}.`;
    }

    return { keyInsight, recommendation };
  }

  // Enhanced statistics for all chart types
  const topPerformers = findTopPerformers(chartData, chartSpec.y, 3);
  const bottomPerformers = findBottomPerformers(chartData, chartSpec.y, 3);
  const topPerformerStr = topPerformers.length > 0 
    ? topPerformers.map(p => `${p.x} (${formatY(p.y)})`).join(', ')
    : 'N/A';
  const bottomPerformerStr = bottomPerformers.length > 0
    ? bottomPerformers.map(p => `${p.x} (${formatY(p.y)})`).join(', ')
    : 'N/A';

  // Y2 statistics for dual-axis charts
  const topPerformersY2 = isDualAxis ? findTopPerformers(chartData, y2Variable, 3) : [];
  const bottomPerformersY2 = isDualAxis ? findBottomPerformers(chartData, y2Variable, 3) : [];
  const topPerformerStrY2 = isDualAxis && topPerformersY2.length > 0 
    ? topPerformersY2.map(p => `${p.x} (${formatY2(p.y)})`).join(', ')
    : 'N/A';
  const bottomPerformerStrY2 = isDualAxis && bottomPerformersY2.length > 0
    ? bottomPerformersY2.map(p => `${p.x} (${formatY2(p.y)})`).join(', ')
    : 'N/A';

  // Calculate coefficient of variation (CV) to measure variability
  const cv = avgY !== 0 ? (yStdDev / Math.abs(avgY)) * 100 : 0;
  const variability = cv > 30 ? 'high' : cv > 15 ? 'moderate' : 'low';

  // For bar/pie charts with categorical X, identify top categories
  const isCategoricalX = numericX.length === 0;
  let topCategories = '';
  if (isCategoricalX && chartData.length > 0) {
    const categoryStats = chartData
      .map(row => ({ x: row[chartSpec.x], y: Number(String(row[chartSpec.y]).replace(/[%,,]/g, '')) }))
      .filter(item => !isNaN(item.y))
      .sort((a, b) => b.y - a.y)
      .slice(0, 3);
    topCategories = categoryStats.map(c => `${c.x} (${formatY(c.y)})`).join(', ');
  }

  // For correlation charts, calculate X-axis statistics for recommendations
  const numericXValues = chartData.map(row => Number(String(row[chartSpec.x]).replace(/[%,,]/g, ''))).filter(v => !isNaN(v));
  const xP25 = numericXValues.length > 0 ? percentile(numericXValues, 0.25) : NaN;
  const xP50 = numericXValues.length > 0 ? percentile(numericXValues, 0.5) : NaN;
  const xP75 = numericXValues.length > 0 ? percentile(numericXValues, 0.75) : NaN;
  const xP90 = numericXValues.length > 0 ? percentile(numericXValues, 0.9) : NaN;
  const avgX = numericXValues.length > 0 ? numericXValues.reduce((a, b) => a + b, 0) / numericXValues.length : NaN;
  const minX = numericXValues.length > 0 ? Math.min(...numericXValues) : NaN;
  const maxX = numericXValues.length > 0 ? Math.max(...numericXValues) : NaN;
  
  // Find X values corresponding to top Y performers (to identify optimal X range)
  const topYIndices = chartData
    .map((row, idx) => ({ idx, y: Number(String(row[chartSpec.y]).replace(/[%,,]/g, '')) }))
    .filter(item => !isNaN(item.y))
    .sort((a, b) => b.y - a.y)
    .slice(0, Math.min(10, Math.floor(chartData.length * 0.2))) // Top 20% or top 10, whichever is smaller
    .map(item => item.idx);
  const xValuesForTopY = topYIndices.map(idx => Number(String(chartData[idx][chartSpec.x]).replace(/[%,,]/g, ''))).filter(v => !isNaN(v));
  const avgXForTopY = xValuesForTopY.length > 0 ? xValuesForTopY.reduce((a, b) => a + b, 0) / xValuesForTopY.length : NaN;
  const xRangeForTopY = xValuesForTopY.length > 0 ? {
    min: Math.min(...xValuesForTopY),
    max: Math.max(...xValuesForTopY),
    p25: percentile(xValuesForTopY, 0.25),
    p75: percentile(xValuesForTopY, 0.75),
  } : null;

  // Detect if X-axis is percentage
  const xIsPercent = chartData.some(row => {
    const xVal = row[chartSpec.x];
    return typeof xVal === 'string' && xVal.includes('%');
  });
  const formatX = (val: number): string => {
    if (isNaN(val)) return 'N/A';
    if (xIsPercent) return `${roundSmart(val)}%`;
    return roundSmart(val);
  };

  // Fallback to model for non-numeric cases; request quantified recommendations explicitly
  const correlationContext = isCorrelationChart ? `
CRITICAL: This is a CORRELATION/IMPACT ANALYSIS chart.
- Y-axis (${chartSpec.y}) = TARGET VARIABLE we want to IMPROVE (${targetVariable})
- X-axis (${chartSpec.x}) = FACTOR VARIABLE we can CHANGE (${factorVariable})
- Recommendations MUST focus on: "How to change ${factorVariable} to improve ${targetVariable}"

X-AXIS STATISTICS (${factorVariable} - what we can change):
- Range: ${formatX(minX)} to ${formatX(maxX)}
- Average: ${formatX(avgX)}
- Median (P50): ${formatX(xP50)}
- Percentiles: P25=${formatX(xP25)}, P75=${formatX(xP75)}, P90=${formatX(xP90)}
${xRangeForTopY ? `- Optimal ${factorVariable} range for top Y performers: ${formatX(xRangeForTopY.min)}-${formatX(xRangeForTopY.max)} (avg: ${formatX(avgXForTopY)}, P25-P75: ${formatX(xRangeForTopY.p25)}-${formatX(xRangeForTopY.p75)})` : ''}

RECOMMENDATION FORMAT:
- Must explain how to CHANGE ${factorVariable} (X-axis) to IMPROVE ${targetVariable} (Y-axis)
- Use specific X-axis values/ranges from statistics above
- Example: "To improve ${targetVariable} to ${formatY(yP75)} or higher, adjust ${factorVariable} to ${formatX(xRangeForTopY?.p75 || xP75)}"
- Focus on actionable steps: "Adjust ${factorVariable} from current average of ${formatX(avgX)} to target range of ${formatX(xRangeForTopY?.p25 || xP25)}-${formatX(xRangeForTopY?.p75 || xP75)}"

` : '';

  const prompt = `Analyze this specific chart and provide 3-5 comprehensive key insights with quantified recommendations. Each insight must be detailed and actionable.

${correlationContext}

CHART DETAILS:
- Type: ${chartSpec.type}
- Title: ${chartSpec.title}
- X-axis: ${chartSpec.x}${isCorrelationChart ? ` (FACTOR - what we can change to impact ${targetVariable})` : ''}
- Y-axis (Left): ${chartSpec.y}${isCorrelationChart ? ` (TARGET - what we want to improve)` : ''}${isDualAxis ? ` - First variable on left axis` : ''}
${isDualAxis ? `- Y-axis (Right): ${y2Label} - Second variable on right axis` : ''}
- Data points: ${chartData.length}
${isCorrelationChart ? `- Correlation: This chart shows how ${factorVariable} affects ${targetVariable}` : ''}

COMPREHENSIVE STATISTICS FOR ${chartSpec.y} (Left Axis):
- Range: ${formatY(minY)} to ${formatY(maxY)}
- Average: ${formatY(avgY)}
- Median (P50): ${formatY(yMedian)}
- 25th percentile (P25): ${formatY(yP25)}
- 75th percentile (P75): ${formatY(yP75)}
- 90th percentile (P90): ${formatY(yP90)}
- Standard deviation: ${roundSmart(yStdDev)}
- Coefficient of variation: ${roundSmart(cv)}% (${variability} variability)

TOP PERFORMERS for ${chartSpec.y} (highest values):
${topPerformerStr}

BOTTOM PERFORMERS for ${chartSpec.y} (lowest values):
${bottomPerformerStr}

${isDualAxis ? `
COMPREHENSIVE STATISTICS FOR ${y2Label} (Right Axis):
- Range: ${formatY2(minY2)} to ${formatY2(maxY2)}
- Average: ${formatY2(avgY2)}
- Median (P50): ${formatY2(y2Median)}
- 25th percentile (P25): ${formatY2(y2P25)}
- 75th percentile (P75): ${formatY2(y2P75)}
- 90th percentile (P90): ${formatY2(y2P90)}
- Standard deviation: ${roundSmart(y2StdDev)}
- Coefficient of variation: ${roundSmart(y2CV)}% (${y2Variability} variability)

TOP PERFORMERS for ${y2Label} (highest values):
${topPerformerStrY2}

BOTTOM PERFORMERS for ${y2Label} (lowest values):
${bottomPerformerStrY2}
` : ''}

${topCategories ? `TOP CATEGORIES:\n${topCategories}\n` : ''}

SAMPLE DATA (first 5 points):
${chartData.slice(0, 5).map((row, idx) => `${idx + 1}. ${row[chartSpec.x]}: ${chartSpec.y}=${row[chartSpec.y]}${isDualAxis ? `, ${y2Label}=${row[y2Variable]}` : ''}`).join('\n')}

Generate 3-5 insights. Each insight MUST follow this exact format:

**1. [Bold Title/Headline]**
[Observation with specific numbers and metrics from the statistics above. Include actual values like ranges, averages, percentiles, top/bottom performers.]

**Why it matters:** [Business impact explanation - 2-3 sentences explaining WHY this finding is important for the business]

**Actionable Recommendation:** [Quantified recommendation with specific targets - ${isCorrelationChart ? `explain how to CHANGE ${factorVariable} to IMPROVE ${targetVariable}` : 'include specific numbers, percentages, or thresholds'}]

${isCorrelationChart ? `
FOR CORRELATION CHARTS - Each recommendation must:
- Explain how to CHANGE ${factorVariable} (X-axis) to IMPROVE ${targetVariable} (Y-axis)
- Use specific X-axis values/ranges: "adjust ${factorVariable} to ${formatX(xRangeForTopY?.p75 || xP75)}"
- Reference optimal X values from top Y performers: "target ${formatX(avgXForTopY)}"
` : `
FOR ALL CHARTS - Each recommendation must:
- Include explicit numeric targets (e.g., "target ${chartSpec.y} above ${formatY(yP75)}")
- Reference specific categories/values (e.g., "prioritize ${topPerformers.length > 0 ? topPerformers[0].x : 'top performers'}")
- Include quantified improvement goals (e.g., "increase by 15%", "reach P75 level")
`}

CRITICAL REQUIREMENTS:
${isDualAxis ? `
🚨 MANDATORY FOR DUAL-AXIS CHARTS 🚨
- This is a DUAL-AXIS LINE CHART with TWO variables: ${chartSpec.y} (left axis) and ${y2Label} (right axis)
- You MUST generate insights for BOTH variables - this is REQUIRED, not optional
- Generate at least 3-5 insights total, with MINIMUM 2 insights for ${chartSpec.y} and MINIMUM 2 insights for ${y2Label}
- Each insight should clearly specify which variable it addresses:
  * Insights 1-2: Focus on ${chartSpec.y} (left axis) - use statistics from "COMPREHENSIVE STATISTICS FOR ${chartSpec.y}"
  * Insights 3-4: Focus on ${y2Label} (right axis) - use statistics from "COMPREHENSIVE STATISTICS FOR ${y2Label}"
  * Insight 5 (optional): Comparative analysis between both variables
- DO NOT generate insights that only mention ${chartSpec.y} - you MUST include insights for ${y2Label}
- Every insight must reference the specific variable name (${chartSpec.y} or ${y2Label}) in the title or observation
- If you only analyze ${chartSpec.y}, your response is INCOMPLETE and INCORRECT
` : `
- Generate 3-5 distinct insights covering different aspects of the data
`}
- Each insight must have specific numbers from the statistics above
- Use ACTUAL values - no vague language
- Insights should cover: performance patterns, variability, top/bottom performers, percentile analysis, and actionable targets
${isCorrelationChart ? `
- All recommendations must focus on "how to change ${factorVariable} to improve ${targetVariable}"
` : ''}

Output JSON:
{
  "insights": [
    {
      "title": "**Bold Title Here**",
      "observation": "Observation with specific numbers...",
      "whyItMatters": "Why this matters for the business...",
      "recommendation": "Quantified actionable recommendation with specific targets..."
    },
    ...
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL as string,
      messages: [
        {
          role: 'system',
          content: isCorrelationChart 
            ? `You are a data analyst providing specific insights and recommendations for correlation/impact analysis charts. 
            CRITICAL CONTEXT: 
            - Y-axis (${targetVariable}) = TARGET we want to IMPROVE
            - X-axis (${factorVariable}) = FACTOR we can CHANGE
            - Recommendations MUST explain: "How to CHANGE ${factorVariable} to IMPROVE ${targetVariable}"
            - Use specific X-axis values/ranges from the statistics provided
            - Be concise, specific, and actionable. Output valid JSON. 
            - Recommendations must be quantified with actual numbers from the data (ranges, thresholds, targets). No hallucinations.`
            : isDualAxis 
            ? `You are a data analyst providing specific insights and recommendations for dual-axis line charts. 
            🚨 CRITICAL MANDATORY REQUIREMENTS 🚨
            - This chart has TWO variables: ${chartSpec.y} (left axis) and ${y2Label} (right axis)
            - You MUST generate insights for BOTH variables - this is MANDATORY
            - Generate at least 2 insights for ${chartSpec.y} and at least 2 insights for ${y2Label}
            - Each insight MUST clearly specify which variable it addresses in the title or observation
            - DO NOT focus only on ${chartSpec.y} - you MUST analyze ${y2Label} as well
            - If your response only mentions ${chartSpec.y} and ignores ${y2Label}, it is WRONG and INCOMPLETE
            - Balance your insights - analyze both ${chartSpec.y} and ${y2Label} equally
            - Be concise, specific, and actionable. Output valid JSON. 
            - Recommendations must be quantified with actual numbers from the data (ranges, thresholds, targets). No hallucinations.`
            : 'You are a data analyst providing specific insights and recommendations for individual charts. Be concise, specific, and actionable. Output valid JSON. CRITICAL: Recommendations must be quantified with actual numbers from the data (ranges, thresholds, targets). No hallucinations.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6,
      max_tokens: 1200,
    });

    const content = response.choices[0].message.content || '{}';
    const result = JSON.parse(content);

    // Format multiple insights into a single string for keyInsight
    if (result.insights && Array.isArray(result.insights) && result.insights.length > 0) {
      // For dual-axis charts, validate that both variables are covered
      if (isDualAxis) {
        const insightsText = result.insights.map((i: any) => 
          `${i.title || ''} ${i.observation || ''} ${i.text || ''}`.toLowerCase()
        ).join(' ');
        
        const mentionsY = insightsText.includes(chartSpec.y.toLowerCase());
        const mentionsY2 = insightsText.includes(y2Label.toLowerCase()) || insightsText.includes(y2Variable.toLowerCase());
        
        // If only one variable is mentioned, add a fallback insight for the missing one
        if (mentionsY && !mentionsY2) {
          console.warn(`⚠️ Dual-axis chart insights only mention ${chartSpec.y}, missing ${y2Label}. Adding fallback insight.`);
          
          // Generate comprehensive fallback insight for y2 using all calculated statistics
          const y2TopPerformer = topPerformersY2.length > 0 ? topPerformersY2[0] : null;
          const y2BottomPerformer = bottomPerformersY2.length > 0 ? bottomPerformersY2[0] : null;
          
          // Build comprehensive observation using all available statistics
          let observationParts: string[] = [];
          
          // Range and central tendency
          observationParts.push(`${y2Label} ranges from ${formatY2(minY2)} to ${formatY2(maxY2)} (average: ${formatY2(avgY2)}, median: ${formatY2(y2Median)})`);
          
          // Variability
          if (!isNaN(y2CV)) {
            observationParts.push(`demonstrates ${y2Variability} variability (CV: ${roundSmart(y2CV)}%)`);
          }
          
          // Percentiles
          if (!isNaN(y2P90) && !isNaN(y2P25)) {
            observationParts.push(`with 90th percentile at ${formatY2(y2P90)} and 25th percentile at ${formatY2(y2P25)}`);
          }
          
          // Top performers
          if (y2TopPerformer) {
            observationParts.push(`Peak performance observed at ${y2TopPerformer.x} (${formatY2(y2TopPerformer.y)})`);
          }
          
          // Bottom performers
          if (y2BottomPerformer) {
            observationParts.push(`lowest value recorded at ${y2BottomPerformer.x} (${formatY2(y2BottomPerformer.y)})`);
          }
          
          const fallbackObservation = observationParts.join('. ') + '.';
          
          // Build comprehensive recommendation
          let recommendationParts: string[] = [];
          if (!isNaN(y2P75)) {
            recommendationParts.push(`Target ${y2Label} above the 75th percentile threshold of ${formatY2(y2P75)} to align with top-performing periods`);
          }
          if (topPerformersY2.length > 0) {
            const topPeriods = topPerformersY2.slice(0, 2).map(p => `${p.x} (${formatY2(p.y)})`).join(' and ');
            recommendationParts.push(`Focus on replicating strategies from top-performing periods like ${topPeriods}`);
          }
          if (y2BottomPerformer && !isNaN(y2P75)) {
            const improvement = ((y2P75 - y2BottomPerformer.y) / y2BottomPerformer.y * 100).toFixed(0);
            recommendationParts.push(`Increase values in underperforming periods such as ${y2BottomPerformer.x} (${formatY2(y2BottomPerformer.y)}) by at least ${improvement}% to reach the median of ${formatY2(y2Median)}`);
          }
          
          const fallbackRecommendation = recommendationParts.join('. ') + '.';
          
          result.insights.push({
            title: `**${y2Label} Performance Analysis**`,
            observation: fallbackObservation,
            whyItMatters: `Monitoring ${y2Label} performance is critical for understanding overall business trends and identifying optimization opportunities. Consistent performance above benchmark levels indicates strong operational efficiency.`,
            recommendation: fallbackRecommendation
          });
        } else if (!mentionsY && mentionsY2) {
          console.warn(`⚠️ Dual-axis chart insights only mention ${y2Label}, missing ${chartSpec.y}. Adding fallback insight.`);
          
          // Generate comprehensive fallback insight for y using all calculated statistics
          const yTopPerformer = topPerformers.length > 0 ? topPerformers[0] : null;
          const yBottomPerformer = bottomPerformers.length > 0 ? bottomPerformers[0] : null;
          
          // Build comprehensive observation using all available statistics
          let observationParts: string[] = [];
          
          // Range and central tendency
          observationParts.push(`${chartSpec.y} ranges from ${formatY(minY)} to ${formatY(maxY)} (average: ${formatY(avgY)}, median: ${formatY(yMedian)})`);
          
          // Variability
          if (!isNaN(cv)) {
            observationParts.push(`demonstrates ${variability} variability (CV: ${roundSmart(cv)}%)`);
          }
          
          // Percentiles
          if (!isNaN(yP90) && !isNaN(yP25)) {
            observationParts.push(`with 90th percentile at ${formatY(yP90)} and 25th percentile at ${formatY(yP25)}`);
          }
          
          // Top performers
          if (yTopPerformer) {
            observationParts.push(`Peak performance observed at ${yTopPerformer.x} (${formatY(yTopPerformer.y)})`);
          }
          
          // Bottom performers
          if (yBottomPerformer) {
            observationParts.push(`lowest value recorded at ${yBottomPerformer.x} (${formatY(yBottomPerformer.y)})`);
          }
          
          const fallbackObservation = observationParts.join('. ') + '.';
          
          // Build comprehensive recommendation
          let recommendationParts: string[] = [];
          if (!isNaN(yP75)) {
            recommendationParts.push(`Target ${chartSpec.y} above the 75th percentile threshold of ${formatY(yP75)} to align with top-performing periods`);
          }
          if (topPerformers.length > 0) {
            const topPeriods = topPerformers.slice(0, 2).map(p => `${p.x} (${formatY(p.y)})`).join(' and ');
            recommendationParts.push(`Focus on replicating strategies from top-performing periods like ${topPeriods}`);
          }
          if (yBottomPerformer && !isNaN(yP75)) {
            const improvement = ((yP75 - yBottomPerformer.y) / yBottomPerformer.y * 100).toFixed(0);
            recommendationParts.push(`Increase values in underperforming periods such as ${yBottomPerformer.x} (${formatY(yBottomPerformer.y)}) by at least ${improvement}% to reach the median of ${formatY(yMedian)}`);
          }
          
          const fallbackRecommendation = recommendationParts.join('. ') + '.';
          
          result.insights.unshift({
            title: `**${chartSpec.y} Performance Analysis**`,
            observation: fallbackObservation,
            whyItMatters: `Monitoring ${chartSpec.y} performance is critical for understanding overall business trends and identifying optimization opportunities. Consistent performance above benchmark levels indicates strong operational efficiency.`,
            recommendation: fallbackRecommendation
          });
        }
      }
      
      const formattedInsights = result.insights.slice(0, 5).map((insight: any, idx: number) => {
        const title = insight.title || `**Insight ${idx + 1}**`;
        const observation = insight.observation || insight.text || '';
        const whyItMatters = insight.whyItMatters || '';
        const recommendation = insight.recommendation || '';
        
        return `${title}\n${observation}\n\n**Why it matters:** ${whyItMatters}\n\n**Actionable Recommendation:** ${recommendation}`;
      }).join('\n\n---\n\n');
      
      // Combine all recommendations for the recommendation field
      const allRecommendations = result.insights
        .slice(0, 5)
        .map((insight: any) => insight.recommendation || '')
        .filter((rec: string) => rec.length > 0)
        .join(' | ');
      
      return {
        keyInsight: formattedInsights,
        recommendation: allRecommendations || result.insights[0]?.recommendation || "Consider further analysis to understand the underlying factors"
      };
    }

    // Fallback to single insight format if AI didn't return array
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


