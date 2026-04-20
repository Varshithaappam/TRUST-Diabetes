import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const result = await pool.query(
            'SELECT id, email, password, name, role, status FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = result.rows[0];

        // Status Block Logic
        if (user.status === 'pending') {
            return res.status(403).json({ message: 'Your account is pending approval.' });
        }
        if (user.status === 'rejected') {
            return res.status(403).json({ message: 'Your account has been rejected.' });
        }
        if (user.status === 'deactive') {
            return res.status(403).json({ message: 'Account deactivated. Contact administrator.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Get user's allotted sites and clinics for frontend
        let allottedSites = [];
        let allottedClinics = [];
        
        if (user.role !== 'Administrator') {
            // Get allotted sites
            const sitesResult = await pool.query(
                `SELECT sm.site_name 
                 FROM site_master sm
                 JOIN user_site_mapping usm ON sm.site_id = usm.site_id
                 WHERE usm.user_id = $1 AND sm.site_name IS NOT NULL
                 ORDER BY sm.site_name`,
                [user.id]
            );
            allottedSites = sitesResult.rows.map(r => r.site_name);
            
            // Get allotted clinics from both site assignments and direct clinic assignments
            const clinicsResult = await pool.query(
                `SELECT DISTINCT cm.clinic_name
                 FROM clinic_master cm
                 WHERE (
                    cm.site_id IN (
                        SELECT sm.site_id FROM site_master sm
                        JOIN user_site_mapping usm ON sm.site_id = usm.site_id
                        WHERE usm.user_id = $1
                    )
                    OR
                    cm.clinic_id IN (
                        SELECT ucm.clinic_id FROM user_clinic_mapping ucm
                        WHERE ucm.user_id = $1 AND ucm.is_active = true
                    )
                 )
                 AND cm.clinic_name IS NOT NULL
                 ORDER BY cm.clinic_name`,
                [user.id]
            );
            allottedClinics = clinicsResult.rows.map(r => r.clinic_name);
        }

        res.json({
            message: 'Login successful',
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.name, 
                role: user.role, 
                status: user.status,
                allottedSites,
                allottedClinics
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

export const getMe = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(
            'SELECT id, email, name, role, status, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });
        
        const user = result.rows[0];
        
        // Get user's allotted sites and clinics
        let allottedSites = [];
        let allottedClinics = [];
        
        if (user.role !== 'Administrator') {
            // Get allotted sites
            const sitesResult = await pool.query(
                `SELECT sm.site_name 
                 FROM site_master sm
                 JOIN user_site_mapping usm ON sm.site_id = usm.site_id
                 WHERE usm.user_id = $1 AND sm.site_name IS NOT NULL
                 ORDER BY sm.site_name`,
                [userId]
            );
            allottedSites = sitesResult.rows.map(r => r.site_name);
            
            // Get allotted clinics
            const clinicsResult = await pool.query(
                `SELECT DISTINCT cm.clinic_name
                 FROM clinic_master cm
                 WHERE (
                    cm.site_id IN (
                        SELECT sm.site_id FROM site_master sm
                        JOIN user_site_mapping usm ON sm.site_id = usm.site_id
                        WHERE usm.user_id = $1
                    )
                    OR
                    cm.clinic_id IN (
                        SELECT ucm.clinic_id FROM user_clinic_mapping ucm
                        WHERE ucm.user_id = $1 AND ucm.is_active = true
                    )
                 )
                 AND cm.clinic_name IS NOT NULL
                 ORDER BY cm.clinic_name`,
                [userId]
            );
            allottedClinics = clinicsResult.rows.map(r => r.clinic_name);
        }
        
        res.json({ 
            user: {
                ...user,
                allottedSites,
                allottedClinics
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};