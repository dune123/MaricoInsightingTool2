import { Express } from "express";
import { createServer, type Server } from "http";
import uploadRoutes from "./upload.js";
import chatRoutes from "./chat.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register route modules
  app.use('/api', uploadRoutes);
  app.use('/api', chatRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
