// backend/routes/components/statsRoutes.js
import express from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
// ADD 'getVisitHistory' to the list below:
import { getDashboardStats, getDashboardAnalytics } from '../../controllers/components/statsController.js';
import { generateAIAnalysis } from '../../controllers/components/aiController.js'; // Import the AI analysis function
const router = express.Router();

router.get('/summary', authenticate, getDashboardStats);
router.get('/analytics', authenticate, getDashboardAnalytics);
router.post('/generate-ai-summary', authenticate, generateAIAnalysis);
// This line will now work because the function is imported above

export default router;