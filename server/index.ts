// Main server file
import 'dotenv/config';
import express from "express";
import { corsConfig } from "./middleware/index.js";
import { registerRoutes } from "./routes/index.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(corsConfig);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

(async () => {
  const server = await registerRoutes(app);
  
  const port = process.env.PORT || 3003;
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
})();