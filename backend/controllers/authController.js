import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import dotenv from 'dotenv';

// Ensure .env is loaded
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'trust-diabetes-jwt-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Login controller - validates email/password and returns JWT token
 * POST /api/auth/login
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required.' 
            });
        }

        // Query user from database
        const result = await pool.query(
            'SELECT id, email, password, name, role, status FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                message: 'Invalid email or password.' 
            });
        }

        const user = result.rows[0];

        console.log('User login attempt:', user.email, 'status:', user.status);

        // Check account status - only block if status is explicitly set to pending/rejected
        // This allows existing users (without status column) to login
        const userStatus = user.status;
        console.log('userStatus:', userStatus);
        if (userStatus === 'pending') {
            return res.status(403).json({ 
                message: 'Your account is pending approval. Please contact administrator.' 
            });
        }

        if (userStatus === 'rejected') {
            return res.status(403).json({ 
                message: 'Your account has been rejected. Please contact administrator.' 
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log('Password validation result:', isPasswordValid);

        if (!isPasswordValid) {
            return res.status(401).json({ 
                message: 'Invalid email or password.' 
            });
        }

        // Generate JWT token with user info
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Return token and user info
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            message: 'Server error during login.' 
        });
    }
};

/**
 * Get current user info
 * GET /api/auth/me
 */
export const getMe = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: 'User not found.' 
            });
        }

        res.json({ user: result.rows[0] });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            message: 'Server error.' 
        });
    }
};

export default { login, getMe };