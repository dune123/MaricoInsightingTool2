import { Request, Response } from "express";
import { answerQuestion } from "../lib/dataAnalyzer.js";
import { processChartData } from "../lib/chartGenerator.js";
import { generateChartInsights } from "../lib/insightGenerator.js";
import { chatResponseSchema } from "@shared/schema.js";
import { getChatBySessionIdEfficient, addMessageToChat, addMessagesBySessionId } from "../lib/cosmosDB.js";

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

    // Answer the question using data from CosmosDB
    const result = await answerQuestion(
      chatDocument.rawData, // Use the actual data stored in CosmosDB
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
              : processChartData(chatDocument.rawData, c);
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
          charts: validated.charts,
          insights: validated.insights,
          timestamp: Date.now(),
        },
      ]);

      console.log(`✅ Messages saved to chat: ${chatDocument.id}`);
    } catch (cosmosError) {
      console.error("⚠️ Failed to save messages to CosmosDB:", cosmosError);
      // Continue without failing the chat - CosmosDB is optional
    }

    res.json(validated);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process message',
    });
  }
};
