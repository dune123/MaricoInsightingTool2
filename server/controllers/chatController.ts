import { Request, Response } from "express";
import { answerQuestion } from "../lib/dataAnalyzer.js";
import { storage } from "../storage.js";
import { chatResponseSchema } from "@shared/schema.js";

export const chatWithAI = async (req: Request, res: Response) => {
  try {
    const { sessionId, message, chatHistory } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get session data
    const session = storage.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found. Please upload a file first.' });
    }

    // Answer the question
    const result = await answerQuestion(
      session.data,
      message,
      chatHistory || [],
      session.summary
    );

    // Validate response
    const validated = chatResponseSchema.parse(result);

    res.json(validated);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process message',
    });
  }
};
