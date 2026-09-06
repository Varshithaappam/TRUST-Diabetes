import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Create a connection pool using credentials from the .env file
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

// Test the connection for your office production environment
pool.on('connect', () => {
  console.log('Successfully connected to the PostgreSQL medical database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

export default pool;