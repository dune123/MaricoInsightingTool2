import { Request, Response } from "express";
import { parseFile, createDataSummary } from "../lib/fileParser.js";
import { analyzeUpload } from "../lib/dataAnalyzer.js";
import { uploadResponseSchema } from "@shared/schema.js";
import { createChatDocument, generateColumnStatistics } from "../lib/cosmosDB.js";
import { uploadFileToBlob } from "../lib/blobStorage.js";

export const uploadFile = async (
  req: Request & { file?: Express.Multer.File },
  res: Response
) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get username from request body or headers
    const username = req.body.username || req.headers['x-user-email'] || 'anonymous@example.com';

    // Upload file to Azure Blob Storage
    let blobInfo;
    try {
      blobInfo = await uploadFileToBlob(
        req.file.buffer,
        req.file.originalname,
        username,
        req.file.mimetype
      );
    } catch (blobError) {
      console.error("Failed to upload file to blob storage:", blobError);
      // Continue without failing the upload - blob storage is optional
    }

    // Parse the file
    const data = await parseFile(req.file.buffer, req.file.originalname);
    
    if (data.length === 0) {
      return res.status(400).json({ error: 'No data found in file' });
    }

    // Create data summary
    const summary = createDataSummary(data);

    // Analyze data with AI
    console.log('🤖 Starting AI analysis...');
    const { charts, insights } = await analyzeUpload(data, summary, req.file.originalname);
    
    console.log('📊 === CHART GENERATION RESULTS ===');
    console.log(`Generated ${charts.length} charts:`);
    charts.forEach((chart, index) => {
      console.log(`Chart ${index + 1}: "${chart.title}"`);
      console.log(`  Type: ${chart.type}`);
      console.log(`  X: "${chart.x}", Y: "${chart.y}"`);
      console.log(`  Data points: ${chart.data?.length || 0}`);
      if (chart.data && chart.data.length > 0) {
        console.log(`  Sample data:`, chart.data.slice(0, 2));
      } else {
        console.log(`  ⚠️  NO DATA - This chart will appear empty!`);
      }
    });

    // Sanitize charts to remove rows with any NaN values
    console.log('🧹 Sanitizing charts...');
    const sanitizedCharts = charts.map((chart, index) => {
      const originalLength = chart.data?.length || 0;
      const sanitizedData = chart.data?.filter(row => {
        // Filter out rows that contain any NaN values
        return !Object.values(row).some(value => typeof value === 'number' && isNaN(value));
      }) || [];
      
      console.log(`Chart ${index + 1} sanitization: ${originalLength} → ${sanitizedData.length} data points`);
      
      return {
        ...chart,
        data: sanitizedData
      };
    });

    // Generate a unique session ID for this upload
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate column statistics for numeric columns
    const columnStatistics = generateColumnStatistics(data, summary.numericColumns);
    
    // Get top 10 rows as sample data for preview, converting dates to strings
    const sampleRows = data.slice(0, 10).map(row => {
      const serializedRow: Record<string, any> = {};
      for (const [key, value] of Object.entries(row)) {
        // Convert Date objects to ISO strings
        if (value instanceof Date) {
          serializedRow[key] = value.toISOString();
        } else {
          serializedRow[key] = value;
        }
      }
      return serializedRow;
    });

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Create chat document in CosmosDB with all analysis data
    let chatDocument;
    try {
      chatDocument = await createChatDocument(
        username,
        req.file.originalname,
        sessionId,
        summary,
        sanitizedCharts,
        data, // Raw data
        sampleRows, // Sample rows
        columnStatistics, // Column statistics
        blobInfo ? {
          blobUrl: blobInfo.blobUrl,
          blobName: blobInfo.blobName,
        } : undefined, // Blob info
        {
          totalProcessingTime: processingTime,
          aiModelUsed: 'gpt-4o',
          fileSize: req.file.size,
          analysisVersion: '1.0.0'
        }, // Analysis metadata
        insights // AI-generated insights
      );
    } catch (cosmosError) {
      console.error("Failed to create chat document in CosmosDB:", cosmosError);
      // Continue without failing the upload - CosmosDB is optional
    }
    
    console.log('✅ Chart processing complete');

    const response = {
      sessionId,
      summary,
      charts: sanitizedCharts,
      insights,
      sampleRows, // Use the sampleRows we already created
      chatId: chatDocument?.id, // Include chat document ID if created
      blobInfo: blobInfo ? {
        blobUrl: blobInfo.blobUrl,
        blobName: blobInfo.blobName,
      } : undefined, // Include blob storage info if uploaded
    };

    // Validate response
    const validated = uploadResponseSchema.parse(response);

    res.json(validated);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process file',
    });
  }
};
