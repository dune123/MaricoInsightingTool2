import { Request, Response } from "express";
import { answerQuestion } from "../lib/dataAnalyzer.js";
import { processChartData } from "../lib/chartGenerator.js";
import { generateChartInsights } from "../lib/insightGenerator.js";
import { chatResponseSchema } from "@shared/schema.js";
import { getChatBySessionIdEfficient, addMessageToChat, addMessagesBySessionId } from "../lib/cosmosDB.js";
import { loadAndParseFromBlob, uploadJsonToBlob } from "../lib/blobStorage.js";

export const chatWithAI = async (req: Request, res: Response) => {
  try {
    const { sessionId, message, chatHistory } = req.body;
    const username = req.body.username || req.headers['x-user-email'] || 'anonymous@example.com';

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get chat document from CosmosDB by session ID
    const chatDocument = await getChatBySessionIdEfficient(sessionId);

    if (!chatDocument) {
      return res.status(404).json({ error: 'Session not found. Please upload a file first.' });
    }

    // Determine dataset source (CosmosDB rawData or Blob fallback)
    const rawData = (Array.isArray(chatDocument.rawData) && chatDocument.rawData.length > 0)
      ? chatDocument.rawData
      : (chatDocument.blobInfo?.blobName
          ? await loadAndParseFromBlob(chatDocument.blobInfo.blobName, chatDocument.fileName)
          : []);

    // Answer the question using dataset
    const result = await answerQuestion(
      rawData,
      message,
      chatHistory || [],
      chatDocument.dataSummary
    );

    // Ensure every chart has per-chart keyInsight and recommendation before validation
    if (result.charts && Array.isArray(result.charts)) {
      try {
        result.charts = await Promise.all(
          result.charts.map(async (c: any) => {
            const dataForChart = c.data && Array.isArray(c.data)
              ? c.data
              : processChartData(rawData, c);
            const insights = (!('keyInsight' in c) || !('recommendation' in c))
              ? await generateChartInsights(c, dataForChart, chatDocument.dataSummary)
              : null;
            return {
              ...c,
              data: dataForChart,
              keyInsight: c.keyInsight ?? insights?.keyInsight,
              recommendation: c.recommendation ?? insights?.recommendation,
            };
          })
        );
      } catch (e) {
        console.error('Final enrichment of chat charts failed:', e);
      }
    }

    // Validate response
    let validated = chatResponseSchema.parse(result);

    // Ensure overall chat insights always present: derive from charts if missing
    if ((!validated.insights || validated.insights.length === 0) && Array.isArray(validated.charts) && validated.charts.length > 0) {
      try {
        const derived = validated.charts
          .map((c: any, idx: number) => {
            const text = c?.keyInsight || (c?.title ? `Insight: ${c.title}` : null);
            return text ? { id: idx + 1, text } : null;
          })
          .filter(Boolean) as { id: number; text: string }[];
        if (derived.length > 0) {
          validated = { ...validated, insights: derived } as any;
        }
      } catch {}
    }

    // Upload chart data to blob storage and create dataRef before saving to CosmosDB
    const chartsForCosmos = validated.charts && Array.isArray(validated.charts) 
      ? await Promise.all(validated.charts.map(async (chart: any, idx: number) => {
          const chartData = chart.data || [];
          if (Array.isArray(chartData) && chartData.length > 0) {
            // Upload full chart data to blob
            const timestampForChart = Date.now();
            const safeUser = username.replace(/[^a-zA-Z0-9]/g, '_');
            const safeFile = chatDocument.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const chartBlobName = `${safeUser}/${timestampForChart}/${safeFile}.chat-chart-${Date.now()}-${idx}.json`;
            
            try {
              await uploadJsonToBlob(chartData, chartBlobName);
              // Return chart with dataRef but empty data array
              const { data, ...chartWithoutData } = chart;
              return {
                ...chartWithoutData,
                data: [],
                dataRef: { blobName: chartBlobName, kind: 'chartSeries' },
              };
            } catch (e) {
              console.error(`Failed to upload chart ${idx} to blob:`, e);
              // Fallback: return chart without data if blob upload fails
              const { data, ...chartWithoutData } = chart;
              return { ...chartWithoutData, data: [] };
            }
          }
          // If no data, return as-is but ensure data is empty
          const { data, ...chartWithoutData } = chart;
          return { ...chartWithoutData, data: [] };
        }))
      : [];

    // Save messages to CosmosDB (by sessionId to avoid partition mismatches)
    try {
      await addMessagesBySessionId(sessionId, [
        {
          role: 'user',
          content: message,
          timestamp: Date.now(),
        },
        {
          role: 'assistant',
          content: validated.answer,
          charts: chartsForCosmos, // Use charts with blob references, no data arrays
          insights: validated.insights,
          timestamp: Date.now(),
        },
      ]);

      console.log(`✅ Messages saved to chat: ${chatDocument.id}`);
    } catch (cosmosError) {
      console.error("⚠️ Failed to save messages to CosmosDB:", cosmosError);
      // Continue without failing the chat - CosmosDB is optional
    }

    // Return charts with full data for client display (but CosmosDB has blob references)
    res.json({
      ...validated,
      charts: validated.charts, // Return full data for immediate display
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process message',
    });
  }
};
// Return full chart series from blob for a chart in a session
// Can search in top-level charts array or in messages array
export const getFullChartSeries = async (req: Request, res: Response) => {
  try {
    const { sessionId, chartIndex } = req.params as { sessionId: string; chartIndex: string };
    const { messageIndex } = req.query; // Optional: if chart is in a specific message
    const chatDocument = await getChatBySessionIdEfficient(sessionId);
    if (!chatDocument) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const idx = parseInt(chartIndex, 10);
    let chart: any = undefined;
    
    // Check if chart is in a specific message
    if (messageIndex !== undefined) {
      const msgIdx = parseInt(messageIndex as string, 10);
      const message = Array.isArray(chatDocument.messages) ? chatDocument.messages[msgIdx] : undefined;
      if (message?.charts && Array.isArray(message.charts)) {
        chart = message.charts[idx];
      }
    }
    
    // Fallback to top-level charts array
    if (!chart && Array.isArray(chatDocument.charts)) {
      chart = chatDocument.charts[idx];
    }
    
    // If still not found, search all messages for charts
    if (!chart && Array.isArray(chatDocument.messages)) {
      for (const msg of chatDocument.messages) {
        if (msg.charts && Array.isArray(msg.charts) && msg.charts[idx]) {
          chart = msg.charts[idx];
          break;
        }
      }
    }
    
    if (!chart) {
      return res.status(404).json({ error: 'Chart not found' });
    }
    
    const blobName = chart?.dataRef?.blobName;
    if (!blobName) {
      return res.status(404).json({ error: 'Full series not available for this chart' });
    }
    
    const buf = await (await import('../lib/blobStorage.js')).getFileFromBlob(blobName);
    const series = JSON.parse(buf.toString('utf-8'));
    return res.json({ series });
  } catch (error) {
    console.error('getFullChartSeries error:', error);
    return res.status(500).json({ error: 'Failed to load full chart series' });
  }
};

