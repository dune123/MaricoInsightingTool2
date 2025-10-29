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


