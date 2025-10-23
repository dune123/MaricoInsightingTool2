import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini configuration for Google's Generative AI API
let gemini: GoogleGenerativeAI;
let MODEL: string;

// Check if Gemini API key is configured
if (process.env.GEMINI_API_KEY) {
  console.log("Using Google Gemini configuration");
  gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  MODEL = "gemini-1.5-pro"; // Using the latest Gemini Pro model
} else {
  console.error("No Gemini configuration found!");
  console.error("Please set GEMINI_API_KEY environment variable");
  throw new Error("Gemini configuration is missing. Please set the GEMINI_API_KEY environment variable.");
}

// Helper function to convert OpenAI-style messages to Gemini format
export function convertMessagesToGemini(messages: any[]) {
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: [{ text: msg.content }]
  }));
}

// Helper function to create a chat completion similar to OpenAI's API
export async function createChatCompletion(messages: any[], options: any = {}) {
  try {
    const model = gemini.getGenerativeModel({ model: MODEL });
    
    // Convert messages to Gemini format
    const geminiMessages = convertMessagesToGemini(messages);
    
    // Start a chat session
    const chat = model.startChat({
      history: geminiMessages.slice(0, -1), // All messages except the last one
    });
    
    // Get the last message (user's current message)
    const lastMessage = messages[messages.length - 1];
    
    // Send the message and get response
    const result = await chat.sendMessage(lastMessage.content);
    const response = await result.response;
    const text = response.text();
    
    // Return in OpenAI-compatible format
    return {
      choices: [{
        message: {
          role: 'assistant',
          content: text
        }
      }]
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// Helper function for simple text generation
export async function generateText(prompt: string, options: any = {}) {
  try {
    const model = gemini.getGenerativeModel({ model: MODEL });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini text generation error:', error);
    throw error;
  }
}

export { gemini, MODEL };
