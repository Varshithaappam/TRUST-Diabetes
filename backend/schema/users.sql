-- Database Schema for RBAC User Management
-- Run this SQL in your PostgreSQL database to create the users table

-- Create users table with role-based access control
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Clinician' CHECK (role IN ('Administrator', 'Analyst', 'Clinician')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
    requested_role VARCHAR(50) DEFAULT 'Clinician',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Create index on status for pending approvals
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Insert sample users (password is 'password123' for all)
-- The bcrypt hash below is for 'password123'
INSERT INTO users (email, password, name, role, status) VALUES 
('admin@trust.com', '$2b$10$vGk.DFwzSp/K6a8lz96wq.59zwI/HxCCFcdXnof6zuo2NU73HXPWG', 'System Administrator', 'Administrator', 'active'),
('analyst@trust.com', '$2b$10$vGk.DFwzSp/K6a8lz96wq.59zwI/HxCCFcdXnof6zuo2NU73HXPWG', 'Data Analyst', 'Analyst', 'active'),
('clinician@trust.com', '$2b$10$vGk.DFwzSp/K6a8lz96wq.59zwI/HxCCFcdXnof6zuo2NU73HXPWG', 'Dr. Clinician', 'Clinician', 'active')
ON CONFLICT (email) DO NOTHING;