import { Router } from "express";
import { 
  getUserChatHistory, 
  getChatDetails, 
  deleteChat, 
  getChatStatistics 
} from "../controllers/chatManagementController.js";

const router = Router();

// Get all chats for a user
router.get('/chats/user/:username', getUserChatHistory);
router.get('/chats/user', getUserChatHistory); // Alternative endpoint

// Get specific chat details
router.get('/chats/:chatId', getChatDetails);

// Delete a chat
router.delete('/chats/:chatId', deleteChat);

// Get chat statistics for a user
router.get('/chats/user/:username/statistics', getChatStatistics);
router.get('/chats/user/statistics', getChatStatistics); // Alternative endpoint

export default router;

