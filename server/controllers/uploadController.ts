import { Request, Response } from "express";
import { parseFile, createDataSummary } from "../lib/fileParser.js";
import { analyzeUpload } from "../lib/dataAnalyzer.js";
import { storage } from "../storage.js";
import { uploadResponseSchema } from "@shared/schema.js";

export const uploadFile = async (
  req: Request & { file?: Express.Multer.File },
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
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

    // Store session
    const sessionId = storage.createSession({
      data,
      summary,
      fileName: req.file.originalname,
      uploadedAt: Date.now(),
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
    
    console.log('✅ Chart processing complete');

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

    const response = {
      sessionId,
      summary,
      charts: sanitizedCharts,
      insights,
      sampleRows,
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
