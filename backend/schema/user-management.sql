-- Database Schema for User Management Module
-- Required Tables: users (updated), site_master, clinic_master, user_site_mapping, user_clinic_mapping

-- ============================================
-- 1. ENHANCED USERS TABLE
-- ============================================

-- Add new columns to existing users table (if not already present)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS suffix VARCHAR(20);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100) NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say'));

-- ============================================
-- 2. SITE MASTER TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.site_master (
    site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_name VARCHAR(255) NOT NULL,
    site_address TEXT,
    phone_number VARCHAR(20),
    contact_person_name VARCHAR(255),
    contact_person_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for site_name (for search functionality)
CREATE INDEX IF NOT EXISTS idx_site_master_name ON public.site_master(site_name);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_site_master_status ON public.site_master(status);

-- ============================================
-- 3. CLINIC MASTER TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.clinic_master (
    clinic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name VARCHAR(255) NOT NULL,
    clinic_address TEXT,
    clinic_phone VARCHAR(20),
    site_id UUID REFERENCES public.site_master(site_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'deactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for clinic_name (for search functionality)
CREATE INDEX IF NOT EXISTS idx_clinic_master_name ON public.clinic_master(clinic_name);

-- Create index for site_id (for mapping)
CREATE INDEX IF NOT EXISTS idx_clinic_master_site ON public.clinic_master(site_id);

-- ============================================
-- 4. USER SITE MAPPING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_site_mapping (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.site_master(site_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, site_id)
);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_user_site_mapping_user ON public.user_site_mapping(user_id);

-- Create index for site_id
CREATE INDEX IF NOT EXISTS idx_user_site_mapping_site ON public.user_site_mapping(site_id);

-- ============================================
-- 5. USER CLINIC MAPPING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_clinic_mapping (
    mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    clinic_id UUID NOT NULL REFERENCES public.clinic_master(clinic_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, clinic_id)
);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_user_clinic_mapping_user ON public.user_clinic_mapping(user_id);

-- Create index for clinic_id
CREATE INDEX IF NOT EXISTS idx_user_clinic_mapping_clinic ON public.user_clinic_mapping(clinic_id);

-- ============================================
-- 6. SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample sites (if table is empty)
INSERT INTO public.site_master (site_name, site_address, phone_number, contact_person_name, contact_person_email, status)
SELECT 'General Hospital', '123 Medical Center Dr, City', '+1-555-0100', 'Dr. John Smith', 'john.smith@hospital.com', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.site_master LIMIT 1);

INSERT INTO public.site_master (site_name, site_address, phone_number, contact_person_name, contact_person_email, status)
SELECT 'City Clinic', '456 Health St, Downtown', '+1-555-0200', 'Dr. Sarah Johnson', 'sarah.j@clinic.com', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.site_master OFFSET 1 LIMIT 1);

-- Insert sample clinics (if table is empty)
INSERT INTO public.clinic_master (clinic_name, clinic_address, clinic_phone, site_id, status)
SELECT 'Diabetes Center', '123 Medical Center Dr, Suite 100', '+1-555-0101', (SELECT site_id FROM public.site_master LIMIT 1), 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_master LIMIT 1);

INSERT INTO public.clinic_master (clinic_name, clinic_address, clinic_phone, site_id, status)
SELECT 'Cardiology Clinic', '456 Health St, Floor 2', '+1-555-0201', (SELECT site_id FROM public.site_master OFFSET 1 LIMIT 1), 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_master OFFSET 1 LIMIT 1);