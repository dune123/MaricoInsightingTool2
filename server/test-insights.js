import { createChatDocument } from './lib/cosmosDB.js';
import { Insight } from '@shared/schema.js';

// Test insights
const testInsights: Insight[] = [
  {
    id: 1,
    text: "Test insight 1: This is a sample insight for testing purposes."
  },
  {
    id: 2,
    text: "Test insight 2: Another sample insight to verify storage."
  }
];

async function testInsightsStorage() {
  try {
    console.log('🧪 Testing insights storage...');
    
    const testDocument = await createChatDocument(
      'test@example.com',
      'test-file.csv',
      'test-session-123',
      {
        rowCount: 10,
        columnCount: 3,
        columns: [
          { name: 'col1', type: 'string', sampleValues: ['a', 'b', 'c'] },
          { name: 'col2', type: 'number', sampleValues: [1, 2, 3] },
          { name: 'col3', type: 'string', sampleValues: ['x', 'y', 'z'] }
        ],
        numericColumns: ['col2'],
        dateColumns: []
      },
      [], // charts
      [], // rawData
      [], // sampleRows
      {}, // columnStatistics
      undefined, // blobInfo
      {
        totalProcessingTime: 1000,
        aiModelUsed: 'gpt-4o',
        fileSize: 500,
        analysisVersion: '1.0.0'
      },
      testInsights // insights
    );
    
    console.log('✅ Test document created successfully!');
    console.log('📊 Document ID:', testDocument.id);
    console.log('💡 Insights count:', testDocument.insights.length);
    console.log('📝 First insight:', testDocument.insights[0]?.text);
    
    return testDocument;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testInsightsStorage()
  .then(() => {
    console.log('🎉 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
