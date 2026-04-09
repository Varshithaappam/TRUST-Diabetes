import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Ensure .env is loaded
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'trust-diabetes-jwt-secret-key-2024';

/**
 * Middleware to authenticate JWT tokens
 * Verifies the token from Authorization header and adds user to request object
 */
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    console.log('Auth middleware - Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            message: 'Access denied. No token provided.' 
        });
    }

    const token = authHeader.split(' ')[1];
    console.log('Auth middleware - Token:', token);
    console.log('Auth middleware - JWT_SECRET:', JWT_SECRET);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Auth middleware - Decoded:', decoded);
        req.user = decoded;
        next();
    } catch (error) {
        console.log('Auth middleware - Token verification failed:', error.message);
        return res.status(401).json({ 
            message: 'Invalid or expired token.' 
        });
    }
};

/**
 * Middleware to authorize specific roles
 * @param {string[]} roles - Array of allowed roles
 */
export const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                message: 'Authentication required.' 
            });
        }

        if (roles.length && !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                message: `Access denied. Required roles: ${roles.join(', ')}` 
            });
        }

        next();
    };
};

export default { authenticate, authorize };