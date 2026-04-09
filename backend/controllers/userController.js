import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

// Static Mapping for Role UUIDs 
// Note: Ensure these match your database role_master exactly
const ROLE_MAP = {
    'Administrator': '5a65be55-1d32-4809-8870-6633d5badbd8',
    'Analyst': '1076a10e-aed4-43ea-ab5f-ae46f8ee2d57',
    'Clinician': 'd7ce5593-75e0-45eb-8f54-cf0c71ba109d'
};

/**
 * 1. REGISTER
 */
export const register = async (req, res) => {
    try {
        const { email, password, firstName, lastName, requestedRole } = req.body;

        if (!email || !password || !firstName) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const roleId = ROLE_MAP[requestedRole] || ROLE_MAP['Clinician'];

        const result = await pool.query(
            `INSERT INTO users (email, password, first_name, last_name, role_id, status, name) 
             VALUES ($1, $2, $3, $4, $5, 'active', $6) RETURNING id, email`,
            [email, hashedPassword, firstName, lastName, roleId, `${firstName} ${lastName}`.trim()]
        );

        res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Registration failed.' });
    }
};

/**
 * 2. GET ALL USERS (With Mappings)
 * Optimized to fetch sites and clinics for the frontend table
 */
// Internal implementation - called by getAllUsersWithMappings
export const getAllUsers = async (req, res) => {
    try {
        // Fetch users and join with role_master
        const usersResult = await pool.query(
            `SELECT 
                u.id, u.email, u.suffix, u.first_name, u.last_name,
                r."Role_Name" as role, u.gender,
                COALESCE(u.status, 'active') as status, u.created_at
             FROM users u 
             LEFT JOIN role_master r ON u.role_id = r."RoleID"
             ORDER BY u.created_at DESC`
        );

        const users = usersResult.rows;

        // Populate mappings for each user
        for (let user of users) {
            // Sites mapping
            const sites = await pool.query(
                `SELECT sm.site_id, sm.site_name 
                 FROM user_site_mapping usm
                 JOIN site_master sm ON usm.site_id = sm.site_id
                 WHERE usm.user_id = $1 AND usm.is_active = true`, [user.id]
            );
            user.sites = sites.rows;

            // Clinics mapping
            const clinics = await pool.query(
                `SELECT cm.clinic_id, cm.clinic_name 
                 FROM user_clinic_mapping ucm
                 JOIN clinic_master cm ON ucm.clinic_id = cm.clinic_id
                 WHERE ucm.user_id = $1 AND ucm.is_active = true`, [user.id]
            );
            user.clinics = clinics.rows;
        }
        
        res.json({ users });
    } catch (error) {
        console.error('[getAllUsers] Error:', error);
        res.status(500).json({ message: 'Error fetching users with mappings.' });
    }
};

// Alias: getAllUsersWithMappings for route compatibility
export const getAllUsersWithMappings = getAllUsers;

/**
 * 3. CREATE USER (Admin Form)
 * Wraps User, Site mappings, and Clinic mappings in a single transaction
 */
export const createUser = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { email, password, suffix, firstName, lastName, role, gender, status, siteIds = [], clinicIds = [] } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        // Prevent duplicate emails
        const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Validate that provided siteIds exist in site_master
        let validSiteIds = siteIds;
        if (siteIds.length > 0) {
            const validSites = await client.query(
                'SELECT site_id FROM site_master WHERE site_id = ANY($1::uuid[])',
                [siteIds]
            );
            const validSiteIdsArr = validSites.rows.map(s => s.site_id);
            // Filter to only valid site IDs
            validSiteIds = siteIds.filter(id => validSiteIdsArr.includes(id));
        }

        // Validate that provided clinicIds exist in clinic_master
        let validClinicIds = clinicIds;
        if (clinicIds.length > 0) {
            const validClinics = await client.query(
                'SELECT clinic_id FROM clinic_master WHERE clinic_id = ANY($1::uuid[])',
                [clinicIds]
            );
            const validClinicIdsArr = validClinics.rows.map(c => c.clinic_id);
            // Filter to only valid clinic IDs
            validClinicIds = clinicIds.filter(id => validClinicIdsArr.includes(id));
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const roleId = ROLE_MAP[role] || ROLE_MAP['Clinician'];
        const userStatus = (typeof status === 'string') ? status : (status === false ? 'deactive' : 'active');
        const fullName = `${firstName} ${lastName}`.trim();
        const roleText = role || 'Clinician';

        const userResult = await client.query(
            `INSERT INTO users (email, password, name, suffix, first_name, last_name, role, role_id, gender, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, email, first_name, last_name, role, role_id`,
            [email, hashedPassword, fullName, suffix, firstName, lastName, roleText, roleId, gender, userStatus]
        );
        const userId = userResult.rows[0].id;

        // Using distinct loops to ensure exact mapping of Site and Clinic IDs
        for (const sId of validSiteIds) {
            await client.query(`INSERT INTO user_site_mapping (user_id, site_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, sId]);
        }
        for (const cId of validClinicIds) {
            await client.query(`INSERT INTO user_clinic_mapping (user_id, clinic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, cId]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'User created successfully', user: userResult.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        client.release();
    }
};

/**
 * 4. GET ALL SITES
 */
export const getAllSites = async (req, res) => {
    try {
        const result = await pool.query('SELECT site_id, site_name FROM site_master ORDER BY site_name');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sites' });
    }
};

/**
 * 5. GET CLINICS BY SITES
 * Dynamically filters clinics based on the sites selected in the frontend
 */
export const getAllClinics = async (req, res) => {
    try {
        const { siteIds } = req.query; 
        
        if (!siteIds || siteIds.trim() === "") {
            return res.json([]); 
        }

        const idsArray = siteIds.split(',').map(id => id.trim()).filter(id => id !== "");

        const result = await pool.query(
            `SELECT clinic_id, clinic_name, site_id 
             FROM clinic_master 
             WHERE site_id = ANY($1::uuid[]) 
             AND is_active = true
             ORDER BY clinic_name`,
            [idsArray]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching filtered clinics:', error);
        res.status(500).json({ message: 'Error fetching clinics' });
    }
};

/**
 * 6. GET PENDING USERS (For Admin Approval)
 */
export const getPendingUsers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, email, first_name, last_name, status, created_at 
             FROM users WHERE status = 'pending' ORDER BY created_at DESC`
        );
        res.json({ users: result.rows });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending users' });
    }
};

/**
 * 7. APPROVE/REJECT USER
 */
export const approveUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const newStatus = action === 'approve' ? 'active' : 'rejected';
        
        const result = await pool.query(
            `UPDATE users SET status = $1 WHERE id = $2 AND status = 'pending' RETURNING *`,
            [newStatus, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found or already processed' });
        }
        
        res.json({ message: `User ${action}ed successfully`, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user' });
    }
};

/**
 * 8. CREATE SITE
 */
export const createSite = async (req, res) => {
    try {
        const { siteName, siteAddress, phoneNumber, contactPersonName, contactPersonEmail, status } = req.body;
        
        const result = await pool.query(
            `INSERT INTO site_master (site_name, site_address, phone_number, contact_person_name, contact_person_email, status) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [siteName, siteAddress, phoneNumber, contactPersonName, contactPersonEmail, status || 'active']
        );
        
        res.status(201).json({ message: 'Site created successfully', site: result.rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'Error creating site' });
    }
};

export default { 
    register, 
    getAllUsers, 
    getAllUsersWithMappings, 
    createUser, 
    getAllSites, 
    getAllClinics, 
    getPendingUsers, 
    approveUser, 
    createSite 
};