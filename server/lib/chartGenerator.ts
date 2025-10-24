import { ChartSpec } from '@shared/schema.js';

// Helper to clean numeric values (strip %, commas, etc.)
function toNumber(value: any): number {
  if (value === null || value === undefined || value === '') return NaN;
  const cleaned = String(value).replace(/[%,]/g, '').trim();
  return Number(cleaned);
}

export function processChartData(
  data: Record<string, any>[],
  chartSpec: ChartSpec
): Record<string, any>[] {
  const { type, x, y, aggregate = 'none' } = chartSpec;
  
  console.log(`🔍 Processing chart: "${chartSpec.title}"`);
  console.log(`   Type: ${type}, X: "${x}", Y: "${y}", Aggregate: ${aggregate}`);
  
  // Check if data is empty
  if (!data || data.length === 0) {
    console.warn(`❌ No data provided for chart: ${chartSpec.title}`);
    return [];
  }
  
  console.log(`   Data rows available: ${data.length}`);
  
  // Check if columns exist in data
  const firstRow = data[0];
  if (!firstRow) {
    console.warn(`❌ No rows in data for chart: ${chartSpec.title}`);
    return [];
  }
  
  const availableColumns = Object.keys(firstRow);
  console.log(`   Available columns: [${availableColumns.join(', ')}]`);
  
  // Check if required columns exist
  if (!firstRow.hasOwnProperty(x)) {
    console.warn(`❌ Column "${x}" not found in data for chart: ${chartSpec.title}`);
    console.log(`   Available columns: [${availableColumns.join(', ')}]`);
    return [];
  }
  
  if (!firstRow.hasOwnProperty(y)) {
    console.warn(`❌ Column "${y}" not found in data for chart: ${chartSpec.title}`);
    console.log(`   Available columns: [${availableColumns.join(', ')}]`);
    return [];
  }
  
  // Check for valid data in the columns
  const xValues = data.map(row => row[x]).filter(v => v !== null && v !== undefined && v !== '');
  const yValues = data.map(row => row[y]).filter(v => v !== null && v !== undefined && v !== '');
  
  console.log(`   X column "${x}": ${xValues.length} valid values (sample: ${xValues.slice(0, 3).join(', ')})`);
  console.log(`   Y column "${y}": ${yValues.length} valid values (sample: ${yValues.slice(0, 3).join(', ')})`);
  
  if (xValues.length === 0) {
    console.warn(`❌ No valid X values in column "${x}" for chart: ${chartSpec.title}`);
    console.log(`   Trying to find alternative X column...`);
    
    // Try to find a similar column
    const alternativeX = availableColumns.find(col => 
      col.toLowerCase().includes(x.toLowerCase().split(' ')[0]) ||
      x.toLowerCase().split(' ')[0].includes(col.toLowerCase())
    );
    
    if (alternativeX) {
      console.log(`   Using alternative X column: "${alternativeX}"`);
      const newXValues = data.map(row => row[alternativeX]).filter(v => v !== null && v !== undefined && v !== '');
      if (newXValues.length > 0) {
        console.log(`   Alternative X column has ${newXValues.length} valid values`);
        // Update the chart spec to use the alternative column
        chartSpec.x = alternativeX;
        return processChartData(data, chartSpec);
      }
    }
    
    return [];
  }
  
  if (yValues.length === 0) {
    console.warn(`❌ No valid Y values in column "${y}" for chart: ${chartSpec.title}`);
    console.log(`   Trying to find alternative Y column...`);
    
    // Try to find a similar column
    const alternativeY = availableColumns.find(col => 
      col.toLowerCase().includes(y.toLowerCase().split(' ')[0]) ||
      y.toLowerCase().split(' ')[0].includes(col.toLowerCase())
    );
    
    if (alternativeY) {
      console.log(`   Using alternative Y column: "${alternativeY}"`);
      const newYValues = data.map(row => row[alternativeY]).filter(v => v !== null && v !== undefined && v !== '');
      if (newYValues.length > 0) {
        console.log(`   Alternative Y column has ${newYValues.length} valid values`);
        // Update the chart spec to use the alternative column
        chartSpec.y = alternativeY;
        return processChartData(data, chartSpec);
      }
    }
    
    return [];
  }

  if (type === 'scatter') {
    // For scatter plots, filter numeric values and sample if needed
    let scatterData = data
      .map((row) => ({
        [x]: toNumber(row[x]),
        [y]: toNumber(row[y]),
      }))
      .filter((row) => !isNaN(row[x]) && !isNaN(row[y]));

    console.log(`   Scatter plot: ${scatterData.length} valid numeric points`);

    // Sample to 1000 points if dataset is large
    if (scatterData.length > 1000) {
      const step = Math.floor(scatterData.length / 1000);
      scatterData = scatterData.filter((_, idx) => idx % step === 0).slice(0, 1000);
      console.log(`   Sampled to ${scatterData.length} points for performance`);
    }

    return scatterData;
  }

  if (type === 'pie') {
    // Aggregate and get top 5 categories
    console.log(`   Processing pie chart with aggregation: ${aggregate || 'sum'}`);
    const aggregated = aggregateData(data, x, y, aggregate || 'sum');
    console.log(`   Aggregated data points: ${aggregated.length}`);
    
    const result = aggregated
      .sort((a, b) => toNumber(b[y]) - toNumber(a[y]))
      .slice(0, 5);
    
    console.log(`   Pie chart result: ${result.length} segments`);
    return result;
  }

  if (type === 'bar') {
    // Aggregate and get top 10 for bar charts
    console.log(`   Processing bar chart with aggregation: ${aggregate || 'sum'}`);
    const aggregated = aggregateData(data, x, y, aggregate || 'sum');
    console.log(`   Aggregated data points: ${aggregated.length}`);
    
    const result = aggregated
      .sort((a, b) => toNumber(b[y]) - toNumber(a[y]))
      .slice(0, 10);
    
    console.log(`   Bar chart result: ${result.length} bars`);
    return result;
  }

  if (type === 'line' || type === 'area') {
    console.log(`   Processing ${type} chart`);
    
    // Sort by x and optionally aggregate
    if (aggregate && aggregate !== 'none') {
      console.log(`   Using aggregation: ${aggregate}`);
      const aggregated = aggregateData(data, x, y, aggregate);
      console.log(`   Aggregated data points: ${aggregated.length}`);
      const result = aggregated.sort((a, b) => String(a[x]).localeCompare(String(b[x])));
      console.log(`   ${type} chart result: ${result.length} points`);
      return result;
    }

    const result = data
      .map((row) => ({
        [x]: row[x],
        [y]: toNumber(row[y]),
      }))
      .filter((row) => !isNaN(row[y])) // Filter out NaN values
      .sort((a, b) => String(a[x]).localeCompare(String(b[x])));
    
    console.log(`   ${type} chart result: ${result.length} points`);
    return result;
  }

  console.warn(`❌ Unknown chart type: ${type} for chart: ${chartSpec.title}`);
  return [];
}

function aggregateData(
  data: Record<string, any>[],
  groupBy: string,
  valueColumn: string,
  aggregateType: string
): Record<string, any>[] {
  console.log(`     Aggregating by "${groupBy}" with "${aggregateType}" of "${valueColumn}"`);
  
  const grouped = new Map<string, number[]>();
  let validValues = 0;
  let invalidValues = 0;

  for (const row of data) {
    const key = String(row[groupBy]);
    const value = toNumber(row[valueColumn]);

    if (!isNaN(value)) {
      validValues++;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(value);
    } else {
      invalidValues++;
    }
  }

  console.log(`     Valid values: ${validValues}, Invalid values: ${invalidValues}`);
  console.log(`     Unique groups: ${grouped.size}`);

  const result: Record<string, any>[] = [];

  for (const [key, values] of Array.from(grouped.entries())) {
    let aggregatedValue: number;

    switch (aggregateType) {
      case 'sum':
        aggregatedValue = values.reduce((a: number, b: number) => a + b, 0);
        break;
      case 'mean':
        aggregatedValue = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        break;
      case 'count':
        aggregatedValue = values.length;
        break;
      default:
        aggregatedValue = values[0];
    }

    result.push({
      [groupBy]: key,
      [valueColumn]: aggregatedValue,
    });
  }

  console.log(`     Aggregation result: ${result.length} groups`);
  return result;
}
