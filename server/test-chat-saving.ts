/**
 * Test script to verify chat saving functionality
 * This script tests the complete flow of saving chat messages and charts to CosmosDB
 */

import { initializeCosmosDB, getChatBySessionIdEfficient, addMessageToChat, getAllSessions } from './lib/cosmosDB.ts';

async function testChatSaving() {
  try {
    console.log('🧪 Starting chat saving test...');
    
    // Initialize CosmosDB connection
    await initializeCosmosDB();
    console.log('✅ CosmosDB initialized');
    
    // Get all sessions to find a test session
    const sessions = await getAllSessions();
    
    if (sessions.length === 0) {
      console.log('❌ No sessions found. Please upload a file first.');
      return;
    }
    
    // Use the first session for testing
    const testSession = sessions[0];
    console.log(`📋 Testing with session: ${testSession.sessionId}`);
    console.log(`📁 File: ${testSession.fileName}`);
    console.log(`👤 User: ${testSession.username}`);
    console.log(`💬 Current messages: ${testSession.messages.length}`);
    console.log(`📊 Current charts: ${testSession.charts.length}`);
    
    // Test adding a user message
    console.log('\n🧪 Testing user message...');
    const userMessage = {
      role: 'user',
      content: 'Test message: What are the top 5 values in the data?',
      timestamp: Date.now(),
    };
    
    await addMessageToChat(testSession.id, testSession.username, userMessage);
    console.log('✅ User message added successfully');
    
    // Test adding an assistant response with charts
    console.log('\n🧪 Testing assistant response with charts...');
    const assistantMessage = {
      role: 'assistant',
      content: 'Based on the data analysis, here are the top 5 values with their corresponding metrics.',
      charts: [
        {
          type: 'bar',
          title: 'Top 5 Values',
          x: 'category',
          y: 'value',
          aggregate: 'sum',
          keyInsight: 'The top category shows significantly higher values',
          recommendation: 'Focus on optimizing the top-performing category'
        }
      ],
      insights: [
        {
          id: 1,
          text: 'The data shows a clear hierarchy with one category dominating'
        },
        {
          id: 2,
          text: 'There is potential for growth in the lower-performing categories'
        }
      ],
      timestamp: Date.now(),
    };
    
    await addMessageToChat(testSession.id, testSession.username, assistantMessage);
    console.log('✅ Assistant message with charts and insights added successfully');
    
    // Verify the data was saved
    console.log('\n🔍 Verifying saved data...');
    const updatedSession = await getChatBySessionIdEfficient(testSession.sessionId);
    
    if (updatedSession) {
      console.log(`✅ Session retrieved successfully`);
      console.log(`💬 Total messages: ${updatedSession.messages.length}`);
      console.log(`📊 Total charts: ${updatedSession.charts.length}`);
      console.log(`💡 Total insights: ${updatedSession.insights.length}`);
      console.log(`🕒 Last updated: ${new Date(updatedSession.lastUpdatedAt).toISOString()}`);
      
      // Show the last few messages
      console.log('\n📝 Recent messages:');
      updatedSession.messages.slice(-4).forEach((msg, index) => {
        console.log(`${index + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
        if (msg.charts && msg.charts.length > 0) {
          console.log(`   📊 Charts: ${msg.charts.length}`);
        }
        if (msg.insights && msg.insights.length > 0) {
          console.log(`   💡 Insights: ${msg.insights.length}`);
        }
      });
      
      // Show recent charts
      if (updatedSession.charts.length > 0) {
        console.log('\n📊 Recent charts:');
        updatedSession.charts.slice(-3).forEach((chart, index) => {
          console.log(`${index + 1}. ${chart.title} (${chart.type}) - ${chart.x} vs ${chart.y}`);
        });
      }
      
      // Show recent insights
      if (updatedSession.insights.length > 0) {
        console.log('\n💡 Recent insights:');
        updatedSession.insights.slice(-3).forEach((insight, index) => {
          console.log(`${index + 1}. ${insight.text.substring(0, 80)}...`);
        });
      }
      
    } else {
      console.log('❌ Failed to retrieve updated session');
    }
    
    console.log('\n🎉 Chat saving test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

// Run the test
testChatSaving().then(() => {
  console.log('\n✅ Test script finished');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
