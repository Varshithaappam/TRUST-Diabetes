// backend/routes/aiAnalystRoutes.js
import express from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { handleAIAnalysis } from '../../controllers/components/aiAnalystController.js';
const router = express.Router();

/**
 * @route   POST /api/ai-analyst/query
 * @desc    Process natural language queries using Gemini 3 Flash and SQL
 * @access  Private (Ensure you have auth middleware if needed)
 */
router.post('/query', authenticate, handleAIAnalysis);

export default router;