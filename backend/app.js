import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import patientRoutes from './routes/pages/patientRoutes.js';
import filterRoutes from './routes/components/filterRoutes.js';
import statsRoutes from './routes/components/statsRoutes.js';
import predictiveRoutes from './routes/pages/predictiveRoutes.js';
import aiAnalystRoutes from './routes/components/aiAnalystRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import pool from './config/db.js';


const app = express();

// Middleware
app.use(helmet()); 
app.use(cors());   
app.use(express.json()); 

// 2. Register Routes
app.use('/api/patients', patientRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/predictive', predictiveRoutes);
app.use('/api/ai', aiAnalystRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Base route for testing
app.get('/', (req, res) => {
  res.send('TRUST Diabetes API is running...');
});

const PORT = process.env.PORT || 5000;

// Create password_reset_tokens table if not exists
const initDatabase = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ password_reset_tokens table ready');
    } catch (err) {
        console.error('Error creating password_reset_tokens table:', err.message);
    }

    // Add user_id column if it doesn't exist (for existing databases created before this column was added)
    try {
        // First check if column exists
        const checkCol = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'password_reset_tokens' AND column_name = 'user_id'
        `);
        if (checkCol.rows.length === 0) {
            await pool.query(`
                ALTER TABLE password_reset_tokens ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
            `);
            console.log('✅ Added user_id column to password_reset_tokens table');
        } else {
            console.log('ℹ️ user_id column already exists in password_reset_tokens');
        }
    } catch (err) {
        console.error('Error adding user_id column:', err.message);
    }

    // Create index on user_id if it doesn't exist
    try {
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)
        `);
        console.log('✅ Created index on user_id in password_reset_tokens table');
    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('ℹ️ Index on user_id already exists');
        } else {
            console.error('Error creating index:', err.message);
        }
    }
};

// Handle port already in use error
const server = app.listen(PORT, async () => {
    console.log(`Server is active on port ${PORT}`);
    await initDatabase();
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use!`);
    console.error('Please close any other instances of the server or use a different port.');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});