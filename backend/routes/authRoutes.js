import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { login, getMe } from '../controllers/authController.js';
import { register } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import pool from '../config/db.js';
import { sendPasswordResetEmail, testEmailConnection } from '../config/email.js';

const router = express.Router();

// POST /api/auth/login - Login with email and password
router.post('/login', login);

// POST /api/auth/register - Public registration
router.post('/register', register);

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        
        // Check if user exists
        const userResult = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
        
        if (userResult.rows.length === 0) {
            // Don't reveal if email exists for security
            return res.status(200).json({ message: 'If the email exists, a reset link will be sent' });
        }
        
        // Generate reset token
        const resetToken = uuidv4();
        
        // Try to save token to database
        try {
            // First delete any existing tokens for this user, then insert new one
            await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userResult.rows[0].id]);
            await pool.query(
                `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
                 VALUES ($1, $2, $3)`,
                [userResult.rows[0].id, resetToken, new Date(Date.now() + 3600000)]
            );
            console.log(`✅ Token saved for user ${userResult.rows[0].id}`);
        } catch (tableErr) {
            console.error('❌ Failed to save token:', tableErr.message);
        }
        
        // Send password reset email
        console.log(`Attempting to send password reset email to: ${email}`);
        const emailSent = await sendPasswordResetEmail(email, resetToken);
        
        if (!emailSent) {
            console.error('Failed to send password reset email');
        }
        
        res.status(200).json({ 
            message: 'If the email exists, a reset link will be sent'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to process request' });
    }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        console.log('Reset password attempt with token:', token);
        
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }
        
        // Find the token in database
        let userResult;
        try {
            console.log('Looking for token in database...');
            const tokenResult = await pool.query(
                `SELECT prt.user_id, prt.expires_at 
                 FROM password_reset_tokens prt 
                 WHERE prt.token = $1`,
                [token]
            );
            
            console.log('Token search result:', tokenResult.rows.length, 'rows');
            
            if (tokenResult.rows.length === 0) {
                return res.status(400).json({ message: 'Invalid reset token' });
            }
            
            // Check if token is expired
            if (new Date(tokenResult.rows[0].expires_at) < new Date()) {
                return res.status(400).json({ message: 'Reset token has expired' });
            }
            
            userResult = await pool.query('SELECT id FROM users WHERE id = $1', [tokenResult.rows[0].user_id]);
        } catch (tableErr) {
            console.error('Database error:', tableErr.message);
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }
        
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update the user's password
        await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', 
            [hashedPassword, userResult.rows[0].id]);
        
        // Delete the reset token
        try {
            await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userResult.rows[0].id]);
        } catch (deleteErr) {
            // Ignore if delete fails
        }
        
        console.log(`Password reset successful for user ID: ${userResult.rows[0].id}`);
        
        res.status(200).json({ message: 'Password reset successfully!' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

// GET /api/auth/me - Get current user (protected route)
router.get('/me', authenticate, getMe);

// POST /api/auth/test-email - Test email connection (for debugging)
router.post('/test-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Test email address required' });
        }
        
        console.log('Testing email connection and sending...')
        
        // First test the connection
        const connectionTest = await testEmailConnection();
        
        if (!connectionTest.success) {
            return res.status(500).json({ 
                message: 'SMTP connection failed',
                error: connectionTest.error
            });
        }
        
        // Then try sending
        const testToken = 'test-' + uuidv4();
        const sent = await sendPasswordResetEmail(email, testToken);
        
        if (sent) {
            res.status(200).json({ message: 'Test email sent successfully!' });
        } else {
            res.status(500).json({ message: 'Failed to send test email. Check server console.' });
        }
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({ message: 'Test failed: ' + error.message });
    }
});

export default router;