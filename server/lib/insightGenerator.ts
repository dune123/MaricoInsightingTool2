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

  const xValues = chartData.map(row => row[chartSpec.x]).filter(v => v !== null && v !== undefined);
  const yValues = chartData.map(row => row[chartSpec.y]).filter(v => v !== null && v !== undefined);

  const numericX: number[] = xValues.map(v => Number(String(v).replace(/[%,,]/g, ''))).filter(v => !isNaN(v));
  const numericY: number[] = yValues.map(v => Number(String(v).replace(/[%,,]/g, ''))).filter(v => !isNaN(v));

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

  // If both axes are numeric (especially scatter), produce a quantified X-range tied to high Y
  const bothNumeric = numericX.length > 0 && numericY.length > 0;
  if (bothNumeric) {
    // Identify X range corresponding to top 20% of Y outcomes
    const yP80 = percentile(numericY, 0.8);
    const pairs = chartData
      .map(r => [Number(String(r[chartSpec.x]).replace(/[%,,]/g, '')), Number(String(r[chartSpec.y]).replace(/[%,,]/g, ''))] as [number, number])
      .filter(([vx, vy]) => !isNaN(vx) && !isNaN(vy));
    const topPairs = pairs.filter(([, vy]) => vy >= yP80);
    const xInTop = topPairs.map(([vx]) => vx);
    const xLow = percentile(xInTop.length ? xInTop : numericX, 0.1);
    const xHigh = percentile(xInTop.length ? xInTop : numericX, 0.9);

    const r = pearsonR(numericX, numericY);
    const trend = isNaN(r) ? '' : r > 0.15 ? 'positive' : r < -0.15 ? 'negative' : 'weak';

    const keyInsight = isNaN(r)
      ? `Observed ${pairs.length} valid points. ${chartSpec.y} ranges ${roundSmart(minY)}–${roundSmart(maxY)} (avg ${roundSmart(avgY)}).`
      : `Observed ${pairs.length} valid points with ${trend} correlation (r=${roundSmart(r)}). ${chartSpec.y} ranges ${roundSmart(minY)}–${roundSmart(maxY)} (avg ${roundSmart(avgY)}).`;

    const recommendation = `Keep ${chartSpec.x} within ${roundSmart(xLow)}–${roundSmart(xHigh)} to sustain top-20% ${chartSpec.y} outcomes (p80=${roundSmart(yP80)}).`;

    return { keyInsight, recommendation };
  }

  // Fallback to model for non-numeric cases; request quantified recommendations explicitly
  const prompt = `Analyze this specific chart and provide a key insight and an actionable, QUANTIFIED recommendation using only the provided data (no assumptions).

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
2. An ACTIONABLE RECOMMENDATION (1-2 sentences) that includes explicit numeric thresholds or ranges derived from the data (e.g., "keep ${chartSpec.x} between A–B"), not vague language

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
      content: 'You are a data analyst providing specific insights and recommendations for individual charts. Be concise, specific, and actionable. Output valid JSON. CRITICAL: Recommendations must be quantified with actual numbers from the data (ranges, thresholds, targets). No hallucinations.',
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


