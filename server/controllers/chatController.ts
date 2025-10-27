import { Request, Response } from "express";
import { answerQuestion } from "../lib/dataAnalyzer.js";
import { chatResponseSchema } from "@shared/schema.js";
import { getChatBySessionIdEfficient, addMessageToChat } from "../lib/cosmosDB.js";

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

    // Validate response
    const validated = chatResponseSchema.parse(result);

    // Save messages to CosmosDB
    try {
      // Add user message
      await addMessageToChat(chatDocument.id, username, {
        role: 'user',
        content: message,
        timestamp: Date.now(),
      });

      // Add assistant response
      await addMessageToChat(chatDocument.id, username, {
        role: 'assistant',
        content: validated.answer,
        charts: validated.charts,
        insights: validated.insights,
        timestamp: Date.now(),
      });

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
