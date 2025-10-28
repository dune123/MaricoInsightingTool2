import { parseFile, createDataSummary } from './lib/fileParser.js';
import fs from 'fs';

// Import the correlation calculation function directly
function calculateCorrelations(
  data: Record<string, any>[],
  targetVariable: string,
  numericColumns: string[]
): Array<{ variable: string; correlation: number; nPairs?: number }> {
  const correlations: Array<{ variable: string; correlation: number; nPairs?: number }> = [];

  // Helper to clean numeric values (strip %, commas, etc.) - NO ROUNDING
  function toNumber(value: any): number {
    if (value === null || value === undefined || value === '') return NaN;
    
    // If already a number, return as-is to preserve full precision
    if (typeof value === 'number') return value;
    
    // For strings, clean and convert - use parseFloat to preserve precision
    const cleaned = String(value).replace(/[%,]/g, '').trim();
    return parseFloat(cleaned);
  }

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

async function checkSpecificCorrelations() {
  try {
    console.log('🔍 Checking specific correlations for PA TOM and PAEC nGRP Adstocked...');
    
    // Read the Excel file
    const filePath = './PA Modelling Data Adstocked.xlsx';
    const buffer = fs.readFileSync(filePath);
    
    console.log('📊 Parsing Excel file...');
    const data = await parseFile(buffer, 'PA Modelling Data Adstocked.xlsx');
    console.log(`✅ Parsed ${data.length} rows`);
    
    // Create data summary
    const summary = createDataSummary(data);
    
    // Test correlation analysis with PAB 3+ Adstocked as target
    const targetVariable = 'PAB 3+ Adstocked';
    const numericColumns = summary.numericColumns.filter(col => col !== targetVariable);
    
    console.log(`🎯 Analyzing correlations with target: ${targetVariable}`);
    
    const correlations = calculateCorrelations(data, targetVariable, numericColumns);
    
    // Find specific correlations
    const paTomCorrelation = correlations.find(corr => corr.variable === 'PA TOM');
    const paecCorrelation = correlations.find(corr => corr.variable === 'PAEC nGRP Adstocked');
    
    console.log('\n📊 SPECIFIC CORRELATION RESULTS:');
    console.log('================================');
    
    if (paTomCorrelation) {
      console.log(`PA TOM: ${paTomCorrelation.correlation} (n=${paTomCorrelation.nPairs})`);
      console.log(`  - Correlation strength: ${Math.abs(paTomCorrelation.correlation) < 0.3 ? 'Weak' : Math.abs(paTomCorrelation.correlation) < 0.7 ? 'Moderate' : 'Strong'}`);
      console.log(`  - Direction: ${paTomCorrelation.correlation > 0 ? 'Positive' : 'Negative'}`);
    } else {
      console.log('PA TOM: Not found in correlations');
    }
    
    if (paecCorrelation) {
      console.log(`PAEC nGRP Adstocked: ${paecCorrelation.correlation} (n=${paecCorrelation.nPairs})`);
      console.log(`  - Correlation strength: ${Math.abs(paecCorrelation.correlation) < 0.3 ? 'Weak' : Math.abs(paecCorrelation.correlation) < 0.7 ? 'Moderate' : 'Strong'}`);
      console.log(`  - Direction: ${paecCorrelation.correlation > 0 ? 'Positive' : 'Negative'}`);
    } else {
      console.log('PAEC nGRP Adstocked: Not found in correlations');
    }
    
    console.log('\n📈 ALL CORRELATIONS (sorted by absolute value):');
    console.log('=============================================');
    const sortedCorrelations = correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    sortedCorrelations.forEach((corr, idx) => {
      const strength = Math.abs(corr.correlation) < 0.3 ? 'Weak' : Math.abs(corr.correlation) < 0.7 ? 'Moderate' : 'Strong';
      const direction = corr.correlation > 0 ? 'Positive' : 'Negative';
      console.log(`${idx + 1}. ${corr.variable}: ${corr.correlation} (${strength} ${direction}, n=${corr.nPairs})`);
    });
    
    return { paTomCorrelation, paecCorrelation, allCorrelations: sortedCorrelations };
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
checkSpecificCorrelations()
  .then(() => {
    console.log('\n🎉 Correlation check completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
