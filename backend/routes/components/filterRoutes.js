import express from 'express';
import { authenticate } from '../../middleware/authMiddleware.js';
const router = express.Router();
import { getFilterOptions, getUserAssignedSites } from '../../controllers/components/filterController.js';

// Route for dynamic dropdown data
router.get('/options', authenticate, getFilterOptions);

// Route for user's assigned sites (for Analysts/Clinicians)
router.get('/my-sites', authenticate, getUserAssignedSites);

// CRITICAL FIX: Use export default for ES Modules
export default router;