import { Router } from "express";
import { 
  getUserAnalysisSessions,
  getAnalysisData,
  getAnalysisDataBySession,
  getColumnStatistics,
  getRawData
} from "../controllers/dataRetrievalController.js";

const router = Router();

// Get all analysis sessions for a user
router.get('/user/:username/sessions', getUserAnalysisSessions);

// Get complete analysis data for a specific chat
router.get('/chat/:chatId', getAnalysisData);

// Get analysis data by session ID
router.get('/session/:sessionId', getAnalysisDataBySession);

// Get column statistics for a specific analysis
router.get('/chat/:chatId/statistics', getColumnStatistics);

// Get raw data for a specific analysis (with pagination)
router.get('/chat/:chatId/raw-data', getRawData);

export default router;
