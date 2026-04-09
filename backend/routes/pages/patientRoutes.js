import express from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
import { getPatientRegistry, getPatientHistory } from '../../controllers/pages/patientController.js';

const router = express.Router();

router.get('/registry', authenticate, getPatientRegistry);
router.get('/history/:id', authenticate, getPatientHistory); // Target specific patient by ID

export default router;