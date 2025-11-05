import { Request, Response } from "express";
import { parseFile, createDataSummary } from "../lib/fileParser.js";
import { analyzeUpload } from "../lib/dataAnalyzer.js";
import { uploadResponseSchema } from "@shared/schema.js";
import { createChatDocument, generateColumnStatistics } from "../lib/cosmosDB.js";
import { uploadFileToBlob, uploadJsonToBlob } from "../lib/blobStorage.js";

export const uploadFile = async (
  req: Request & { file?: any },
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

    // Sanitize charts and prepare preview + dataRef
    console.log('🧹 Sanitizing charts...');
    const PREVIEW_CAP = 0; // store no chart points in Cosmos
    const timestampForCharts = Date.now();
    const safeUser = (username as string).toString().replace(/[^a-zA-Z0-9]/g, '_');
    const safeFile = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');

    const sanitizedCharts = await Promise.all(charts.map(async (chart, index) => {
      const originalLength = chart.data?.length || 0;
      const sanitizedData = chart.data?.filter(row => {
        return !Object.values(row).some(value => typeof value === 'number' && isNaN(value));
      }) || [];

      console.log(`Chart ${index + 1} sanitization: ${originalLength} → ${sanitizedData.length} data points`);

      // Upload full series to blob as JSON if present
      let dataRef: { blobName: string; kind: string } | undefined = undefined;
      if (sanitizedData.length > 0) {
        const chartBlobName = `${safeUser}/${timestampForCharts}/${safeFile}.chart-${index}.json`;
        try {
          await uploadJsonToBlob(sanitizedData, chartBlobName);
          dataRef = { blobName: chartBlobName, kind: 'chartSeries' };
        } catch (e) {
          console.error('Failed to upload chart series to blob:', e);
        }
      }

      // Keep no data in Cosmos; rely on dataRef to blob
      const preview = sanitizedData.slice(0, PREVIEW_CAP);
      const slim: any = {
        title: (chart as any).title,
        type: (chart as any).type,
        x: (chart as any).x,
        y: (chart as any).y,
        xLabel: (chart as any).xLabel,
        yLabel: (chart as any).yLabel,
        options: (chart as any).options || undefined,
        data: [],
        dataRef,
      };
      if ((chart as any).keyInsight) slim.keyInsight = (chart as any).keyInsight;
      if ((chart as any).recommendation) slim.recommendation = (chart as any).recommendation;
      return slim;
    }));

    // Generate a unique session ID for this upload
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Generate column statistics for numeric columns
    const columnStatistics = generateColumnStatistics(data, summary.numericColumns);
    // Upload column statistics to blob and avoid storing large stats in Cosmos
    let statsRef: { blobName: string; kind: string } | undefined = undefined;
    try {
      if (columnStatistics && Object.keys(columnStatistics).length > 0) {
        const statsBlobName = `${safeUser}/${timestampForCharts}/${safeFile}.columnStatistics.json`;
        await uploadJsonToBlob(columnStatistics, statsBlobName);
        statsRef = { blobName: statsBlobName, kind: 'columnStatistics' };
      }
    } catch (e) {
      console.error('Failed to upload column statistics to blob:', e);
    }
    
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
      // Cap insights size to keep payload small
      const cappedInsights = Array.isArray(insights)
        ? insights.slice(0, 5).map((ins: any, i: number) => ({ id: ins.id ?? i + 1, text: String(ins.text || '').slice(0, 300) }))
        : [];

      // Column stats will be loaded from blob; store empty in Cosmos
      const columnStatsForCosmos = {} as Record<string, any>;

      // Safety: if payload still large, drop preview data entirely
      const roughSizeInBytes = (obj: any) => Buffer.byteLength(JSON.stringify(obj), 'utf-8');
      const baseDocForSize = {
        summary,
        charts: sanitizedCharts,
        insights: cappedInsights,
        sampleRows,
        columnStatistics: columnStatsForCosmos,
        statsRef,
      };
      let estSize = roughSizeInBytes(baseDocForSize);
      if (estSize > 1.6 * 1024 * 1024) {
        console.warn(`⚠️ Payload estimate ${Math.round(estSize/1024)}KB too large, removing chart previews to fit.`);
        for (let i = 0; i < sanitizedCharts.length; i++) {
          (sanitizedCharts[i] as any).data = [];
          (sanitizedCharts[i] as any).options = undefined;
        }
      }

      chatDocument = await createChatDocument(
        username,
        req.file.originalname,
        sessionId,
        summary,
        sanitizedCharts,
        [], // Do NOT store raw data in CosmosDB; rely on blob storage
        sampleRows, // Sample rows
        columnStatsForCosmos, // Column statistics kept empty; use statsRef
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
        cappedInsights // AI-generated insights (capped)
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
