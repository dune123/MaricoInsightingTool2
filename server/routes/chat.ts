import { Router } from "express";
import { chatWithAI } from "../controllers/chatController.js";

const router = Router();

// Chat endpoint
router.post('/chat', chatWithAI);

export default router;
