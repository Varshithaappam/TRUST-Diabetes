import express from 'express';
import { 
    getPendingUsers, 
    getAllUsers, 
    approveUser,
    getAllSites,
    getAllSpecialties,
    getAllHospitals,
    addHospital,
    getAllClinics,
    createUser,
    createSite,
    toggleUserStatus,
    getAllUsersWithMappings,
    addSite,
    addClinic,
    getUserProfile,
    updateUserProfile
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

// GET /api/users/specialties - Get all specialties for dropdown (Admin only)
router.get('/specialties', authenticate, authorize(['Administrator']), getAllSpecialties);

// GET /api/users/hospitals - Get all hospitals for dropdown (Admin only)
router.get('/hospitals', authenticate, authorize(['Administrator']), getAllHospitals);

// POST /api/users/add-hospital - Add new hospital (Admin only)
router.post('/add-hospital', authenticate, authorize(['Administrator']), addHospital);

// POST /api/users - Create new user with site/clinic mappings (Admin only)
router.post('/', authenticate, authorize(['Administrator']), createUser);

// POST /api/users/sites - Create new site in Site Master (Admin only)
router.post('/sites', authenticate, authorize(['Administrator']), createSite);

// Add this to your existing routes
router.patch('/:id/status', authenticate, authorize(['Administrator']), toggleUserStatus);

router.post('/add-site', authenticate, authorize(['Administrator']), addSite);
router.post('/add-clinic', authenticate, authorize(['Administrator']), addClinic);

// GET /api/users/profile - Get current user's profile (any authenticated user)
router.get('/profile', authenticate, getUserProfile);

// PUT /api/users/profile - Update current user's profile (any authenticated user)
router.put('/profile', authenticate, updateUserProfile);

export default router;