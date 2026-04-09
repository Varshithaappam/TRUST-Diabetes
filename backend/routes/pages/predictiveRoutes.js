import express from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { generatePrognosis } from '../../controllers/pages/predictiveController.js';

const router = express.Router();

router.post('/generate-prognosis', authenticate, generatePrognosis);

export default router;