// Main server file
import 'dotenv/config';
import express from "express";
import { corsConfig } from "./middleware/index.js";
import { registerRoutes } from "./routes/index.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Handle preflight requests explicitly
app.options('*', corsConfig);

// Add request logging middleware for debugging CORS issues
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
  console.log('Headers:', {
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent'],
    'referer': req.headers['referer']
  });
  next();
});

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