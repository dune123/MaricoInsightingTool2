// Main server file
import 'dotenv/config';
import express from "express";
import { corsConfig } from "./middleware/index.js";
import { registerRoutes } from "./routes/index.js";
import { initializeCosmosDB } from "./lib/cosmosDB.js";
import { initializeBlobStorage } from "./lib/blobStorage.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Handle preflight requests explicitly
app.options('*', corsConfig);

app.use(corsConfig);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

(async () => {
  try {
    // Initialize CosmosDB (optional)
    try {
      await initializeCosmosDB();
    } catch (cosmosError) {
      console.warn("⚠️ CosmosDB initialization failed, continuing without it:", cosmosError.message);
    }
    
    // Initialize Azure Blob Storage (optional)
    try {
      await initializeBlobStorage();
    } catch (blobError) {
      console.warn("⚠️ Azure Blob Storage initialization failed, continuing without it:", blobError.message);
    }
    
    const server = await registerRoutes(app);
    
    const port = process.env.PORT || 3003;
    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();