import { Router } from "express";
import { chatWithAI, getFullChartSeries } from "../controllers/chatController.js";

const router = Router();

// Chat endpoint
router.post('/chat', chatWithAI);

// Full chart series (from blob)
router.get('/charts/:sessionId/:chartIndex/full', getFullChartSeries);

export default router;
