import express from 'express';
import { 
    getPendingUsers, 
    getAllUsers, 
    approveUser,
    getAllSites,
    getAllClinics,
    createUser,
    createSite,
    getAllUsersWithMappings
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/users/pending - Get pending registrations (Admin only)
router.get('/pending', authenticate, authorize(['Administrator']), getPendingUsers);

// GET /api/users - Get all active users (Admin only)
router.get('/', authenticate, authorize(['Administrator']), getAllUsers);

// GET /api/users/with-mappings - Get all users with site/clinic mappings (Admin only)
router.get('/with-mappings', authenticate, authorize(['Administrator']), getAllUsersWithMappings);

// PUT /api/users/:id/approve - Approve or reject user (Admin only)
router.put('/:id/approve', authenticate, authorize(['Administrator']), approveUser);

// GET /api/users/sites - Get all sites for dropdown (Admin only)
router.get('/sites', authenticate, authorize(['Administrator']), getAllSites);

// GET /api/users/clinics - Get all clinics for dropdown (Admin only)
router.get('/clinics', authenticate, authorize(['Administrator']), getAllClinics);

// POST /api/users - Create new user with site/clinic mappings (Admin only)
router.post('/', authenticate, authorize(['Administrator']), createUser);

// POST /api/users/sites - Create new site in Site Master (Admin only)
router.post('/sites', authenticate, authorize(['Administrator']), createSite);

export default router;