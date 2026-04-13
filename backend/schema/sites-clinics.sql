-- Database Schema for Sites and Clinics Management
-- Required Tables: site_master, clinic_master, specialty_master

-- ============================================
-- 1. SPECIALTY MASTER TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.specialty_master (
    specialty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    specialty_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for specialty_name
CREATE INDEX IF NOT EXISTS idx_specialty_master_name ON public.specialty_master(specialty_name);

-- Insert default specialties
INSERT INTO public.specialty_master (specialty_name, description, is_active) VALUES
    ('General Medicine', 'General medical practice', true),
    ('Diabetes Care', 'Diabetes specialist care', true),
    ('Cardiology', 'Heart and cardiovascular care', true),
    ('Endocrinology', 'Hormone and metabolic disorders', true),
    ('Internal Medicine', 'Internal medicine', true),
    ('Pediatrics', 'Child healthcare', true),
    ('Family Medicine', 'Family healthcare', true)
ON CONFLICT (specialty_name) DO NOTHING;

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
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for site_name (for search functionality)
CREATE INDEX IF NOT EXISTS idx_site_master_name ON public.site_master(site_name);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_site_master_status ON public.site_master(status);

-- Insert sample sites
INSERT INTO public.site_master (site_name, site_address, phone_number, contact_person_name, contact_person_email, status)
SELECT 'General Hospital', '123 Medical Center Dr, City', '+1-555-0100', 'Dr. John Smith', 'john.smith@hospital.com', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.site_master LIMIT 1);

INSERT INTO public.site_master (site_name, site_address, phone_number, contact_person_name, contact_person_email, status)
SELECT 'City Clinic', '456 Health St, Downtown', '+1-555-0200', 'Dr. Sarah Johnson', 'sarah.j@clinic.com', 'active'
WHERE NOT EXISTS (SELECT 1 FROM public.site_master OFFSET 1 LIMIT 1);

-- ============================================
-- 3. CLINIC MASTER TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.clinic_master (
    clinic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_name VARCHAR(255) NOT NULL,
    clinic_address TEXT,
    site_id UUID REFERENCES public.site_master(site_id) ON DELETE SET NULL,
    specialty_id UUID REFERENCES public.specialty_master(specialty_id) ON DELETE SET NULL,
    speciality_name VARCHAR(255),
    phone_number VARCHAR(20),
    contact_person_name VARCHAR(255),
    contact_person_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for clinic_name (for search functionality)
CREATE INDEX IF NOT EXISTS idx_clinic_master_name ON public.clinic_master(clinic_name);

-- Create index for site_id (for mapping)
CREATE INDEX IF NOT EXISTS idx_clinic_master_site ON public.clinic_master(site_id);

-- Create index for specialty_id
CREATE INDEX IF NOT EXISTS idx_clinic_master_specialty ON public.clinic_master(specialty_id);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_clinic_master_status ON public.clinic_master(status);

-- Insert sample clinics
INSERT INTO public.clinic_master (clinic_name, clinic_address, site_id, specialty_id, speciality_name, phone_number, contact_person_name, contact_person_email, status)
SELECT 
    'Diabetes Center', 
    '123 Medical Center Dr, Suite 100', 
    (SELECT site_id FROM public.site_master LIMIT 1), 
    (SELECT specialty_id FROM public.specialty_master WHERE specialty_name = 'Diabetes Care' LIMIT 1),
    'Diabetes Care',
    '+1-555-0101', 
    'Dr. Michael Brown', 
    'michael.b@diabetescenter.com', 
    'active'
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_master LIMIT 1);

INSERT INTO public.clinic_master (clinic_name, clinic_address, site_id, specialty_id, speciality_name, phone_number, contact_person_name, contact_person_email, status)
SELECT 
    'Cardiology Clinic', 
    '456 Health St, Floor 2', 
    (SELECT site_id FROM public.site_master OFFSET 1 LIMIT 1), 
    (SELECT specialty_id FROM public.specialty_master WHERE specialty_name = 'Cardiology' LIMIT 1),
    'Cardiology',
    '+1-555-0201', 
    'Dr. Emily Davis', 
    'emily.d@cardioclinic.com', 
    'active'
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_master OFFSET 1 LIMIT 1);