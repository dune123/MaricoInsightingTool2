import { Express } from "express";
import { createServer, type Server } from "http";
import uploadRoutes from "./upload.js";
import chatRoutes from "./chat.js";
import chatManagementRoutes from "./chatManagement.js";
import blobStorageRoutes from "./blobStorage.js";
import sessionRoutes from "./sessions.js";
import dataRetrievalRoutes from "./dataRetrieval.js";
import dashboardRoutes from "./dashboards.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register route modules
  app.use('/api', uploadRoutes);
  app.use('/api', chatRoutes);
  app.use('/api', chatManagementRoutes);
  app.use('/api', blobStorageRoutes);
  app.use('/api', sessionRoutes);
  app.use('/api/data', dataRetrievalRoutes);
  app.use('/api', dashboardRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
