import express from 'express';
import { login, getMe } from '../controllers/authController.js';
import { register } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/login - Login with email and password
router.post('/login', login);

// POST /api/auth/register - Public registration
router.post('/register', register);

// GET /api/auth/me - Get current user (protected route)
router.get('/me', authenticate, getMe);

export default router;