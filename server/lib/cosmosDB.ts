import { CosmosClient, Database, Container } from "@azure/cosmos";
import { ChartSpec, Message, DataSummary } from "@shared/schema.js";

// CosmosDB configuration
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT || "";
const COSMOS_KEY = process.env.COSMOS_KEY || "";
const COSMOS_DATABASE_ID = process.env.COSMOS_DATABASE_ID || "marico-insights";
const COSMOS_CONTAINER_ID = process.env.COSMOS_CONTAINER_ID || "chats";

// Initialize CosmosDB client
const client = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY,
});

let database: Database;
let container: Container;

// Initialize database and container
export const initializeCosmosDB = async () => {
  try {
    if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
      throw new Error("CosmosDB endpoint or key not configured");
    }

    // Create database if it doesn't exist
    const { database: db } = await client.databases.createIfNotExists({
      id: COSMOS_DATABASE_ID,
    });
    database = db;

    // Create container if it doesn't exist
    const { container: cont } = await database.containers.createIfNotExists({
      id: COSMOS_CONTAINER_ID,
      partitionKey: "/username", // Partition by username for better performance
    });
    container = cont;

    console.log("CosmosDB initialized successfully");
  } catch (error) {
    console.error("Failed to initialize CosmosDB:", error);
    throw error;
  }
};

// Chat document interface
export interface ChatDocument {
  id: string; // Unique chat ID (fileName + timestamp)
  username: string; // User email
  fileName: string; // Original uploaded file name
  uploadedAt: number; // Upload timestamp
  createdAt: number; // Chat creation timestamp
  lastUpdatedAt: number; // Last update timestamp
  dataSummary: DataSummary; // Data summary from file upload
  messages: Message[]; // Chat messages with charts and insights
  charts: ChartSpec[]; // All charts generated for this chat
  sessionId: string; // Original session ID
  // Enhanced analysis data storage
  rawData: Record<string, any>[]; // Complete raw data from uploaded file
  sampleRows: Record<string, any>[]; // Sample rows for preview (first 10)
  columnStatistics: Record<string, any>; // Statistical analysis of numeric columns
  blobInfo?: { // Azure Blob Storage information
    blobUrl: string;
    blobName: string;
  };
  analysisMetadata: { // Additional metadata about the analysis
    totalProcessingTime: number; // Time taken to process the file
    aiModelUsed: string; // AI model used for analysis
    fileSize: number; // Original file size in bytes
    analysisVersion: string; // Version of analysis algorithm
  };
}

// Create a new chat document
export const createChatDocument = async (
  username: string,
  fileName: string,
  sessionId: string,
  dataSummary: DataSummary,
  initialCharts: ChartSpec[] = [],
  rawData: Record<string, any>[] = [],
  sampleRows: Record<string, any>[] = [],
  columnStatistics: Record<string, any> = {},
  blobInfo?: { blobUrl: string; blobName: string },
  analysisMetadata?: {
    totalProcessingTime: number;
    aiModelUsed: string;
    fileSize: number;
    analysisVersion: string;
  }
): Promise<ChatDocument> => {
  const timestamp = Date.now();
  const chatId = `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
  
  const chatDocument: ChatDocument = {
    id: chatId,
    username,
    fileName,
    uploadedAt: timestamp,
    createdAt: timestamp,
    lastUpdatedAt: timestamp,
    dataSummary,
    messages: [],
    charts: initialCharts,
    sessionId,
    rawData,
    sampleRows,
    columnStatistics,
    blobInfo,
    analysisMetadata: analysisMetadata || {
      totalProcessingTime: 0,
      aiModelUsed: 'gpt-4o',
      fileSize: 0,
      analysisVersion: '1.0.0'
    }
  };

  try {
    if (!container) {
      throw new Error("CosmosDB container not initialized. Make sure initializeCosmosDB() was called successfully.");
    }
    
    const { resource } = await container.items.create(chatDocument);
    return resource as ChatDocument;
  } catch (error) {
    console.error("Failed to create chat document:", error);
    throw error;
  }
};

// Get chat document by ID
export const getChatDocument = async (chatId: string, username: string): Promise<ChatDocument | null> => {
  try {
    if (!container) {
      return null;
    }
    
    const { resource } = await container.item(chatId, username).read();
    return resource;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    console.error("Failed to get chat document:", error);
    throw error;
  }
};

// Update chat document
export const updateChatDocument = async (chatDocument: ChatDocument): Promise<ChatDocument> => {
  try {
    chatDocument.lastUpdatedAt = Date.now();
    const { resource } = await container.items.upsert(chatDocument);
    console.log(`✅ Updated chat document: ${chatDocument.id}`);
    return resource as ChatDocument;
  } catch (error) {
    console.error("❌ Failed to update chat document:", error);
    throw error;
  }
};

// Add message to chat
export const addMessageToChat = async (
  chatId: string,
  username: string,
  message: Message
): Promise<ChatDocument> => {
  try {
    const chatDocument = await getChatDocument(chatId, username);
    if (!chatDocument) {
      throw new Error("Chat document not found");
    }

    chatDocument.messages.push(message);
    
    // Add any new charts from the message to the main charts array
    if (message.charts) {
      message.charts.forEach(chart => {
        const existingChart = chatDocument.charts.find(c => 
          c.title === chart.title && c.type === chart.type
        );
        if (!existingChart) {
          chatDocument.charts.push(chart);
        }
      });
    }

    return await updateChatDocument(chatDocument);
  } catch (error) {
    console.error("❌ Failed to add message to chat:", error);
    throw error;
  }
};

// Get all chats for a user
export const getUserChats = async (username: string): Promise<ChatDocument[]> => {
  try {
    const query = "SELECT * FROM c WHERE c.username = @username ORDER BY c.createdAt DESC";
    const { resources } = await container.items.query({
      query,
      parameters: [{ name: "@username", value: username }]
    }).fetchAll();
    
    return resources;
  } catch (error) {
    console.error("❌ Failed to get user chats:", error);
    throw error;
  }
};

// Get chat by session ID
export const getChatBySessionId = async (sessionId: string): Promise<ChatDocument | null> => {
  try {
    const query = "SELECT * FROM c WHERE c.sessionId = @sessionId";
    const { resources } = await container.items.query({
      query,
      parameters: [{ name: "@sessionId", value: sessionId }]
    }).fetchAll();
    
    return resources.length > 0 ? resources[0] : null;
  } catch (error) {
    console.error("❌ Failed to get chat by session ID:", error);
    throw error;
  }
};

// Delete chat document
export const deleteChatDocument = async (chatId: string, username: string): Promise<void> => {
  try {
    await container.item(chatId, username).delete();
    console.log(`✅ Deleted chat document: ${chatId}`);
  } catch (error) {
    console.error("❌ Failed to delete chat document:", error);
    throw error;
  }
};

// Generate column statistics for numeric columns
export const generateColumnStatistics = (data: Record<string, any>[], numericColumns: string[]): Record<string, any> => {
  const stats: Record<string, any> = {};
  
  for (const column of numericColumns) {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
    
    if (values.length > 0) {
      const sortedValues = [...values].sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      
      // Calculate median
      const mid = Math.floor(sortedValues.length / 2);
      const median = sortedValues.length % 2 === 0 
        ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 
        : sortedValues[mid];
      
      // Calculate standard deviation
      const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
      const standardDeviation = Math.sqrt(variance);
      
      // Calculate quartiles
      const q1Index = Math.floor(sortedValues.length * 0.25);
      const q3Index = Math.floor(sortedValues.length * 0.75);
      const q1 = sortedValues[q1Index];
      const q3 = sortedValues[q3Index];
      
      stats[column] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        sum: sum,
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        standardDeviation: Number(standardDeviation.toFixed(2)),
        q1: Number(q1.toFixed(2)),
        q3: Number(q3.toFixed(2)),
        range: Math.max(...values) - Math.min(...values),
        variance: Number(variance.toFixed(2))
      };
    }
  }
  
  return stats;
};
