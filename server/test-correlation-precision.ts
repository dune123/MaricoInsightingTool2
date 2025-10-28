import { parseFile, createDataSummary } from './lib/fileParser.ts';
import { analyzeCorrelations } from './lib/correlationAnalyzer.ts';
import fs from 'fs';

async function testCorrelationPrecision() {
  try {
    console.log('🧪 Testing correlation precision...');
    
    // Read the Excel file
    const filePath = './PA Modelling Data Adstocked.xlsx';
    const buffer = fs.readFileSync(filePath);
    
    console.log('📊 Parsing Excel file...');
    const data = await parseFile(buffer, 'PA Modelling Data Adstocked.xlsx');
    console.log(`✅ Parsed ${data.length} rows`);
    
    // Create data summary
    const summary = createDataSummary(data);
    console.log('📈 Numeric columns:', summary.numericColumns);
    
    // Test correlation analysis with a target variable
    const targetVariable = 'PAB 3+ Adstocked';
    const numericColumns = summary.numericColumns.filter(col => col !== targetVariable);
    
    console.log(`🎯 Analyzing correlations with target: ${targetVariable}`);
    console.log(`📊 Analyzing ${numericColumns.length} numeric columns`);
    
    const result = await analyzeCorrelations(data, targetVariable, numericColumns);
    
    console.log('✅ Correlation analysis completed!');
    console.log(`📈 Generated ${result.charts.length} charts`);
    console.log(`💡 Generated ${result.insights.length} insights`);
    
    // Show first few correlations with full precision
    const barChart = result.charts.find(chart => chart.type === 'bar');
    if (barChart && barChart.data) {
      console.log('\n🔍 First 5 correlations (full precision):');
      barChart.data.slice(0, 5).forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.variable}: ${item.correlation}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testCorrelationPrecision()
  .then(() => {
    console.log('🎉 Correlation precision test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
