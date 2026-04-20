import pool from '../../config/db.js';

// Get user assigned sites for the current user (Analyst/Clinician)
export const getUserAssignedSites = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        // If Administrator, return all sites
        if (userRole === 'Administrator') {
            const result = await pool.query(
                'SELECT site_id, site_name FROM site_master WHERE site_name IS NOT NULL ORDER BY site_name'
            );
            return res.json({ sites: result.rows });
        }
        
        // For Analyst/Clinician, return only assigned sites
        const result = await pool.query(
            `SELECT sm.site_id, sm.site_name 
             FROM site_master sm
             JOIN user_site_mapping usm ON sm.site_id = usm.site_id
             WHERE usm.user_id = $1 AND sm.site_name IS NOT NULL
             ORDER BY sm.site_name`,
            [userId]
        );
        
        res.json({ sites: result.rows });
    } catch (err) {
        console.error('Error fetching user assigned sites:', err.message);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

export const getFilterOptions = async (req, res) => {
    try {
        const userRole = req.user?.role;
        const userId = req.user?.id;
        
        console.log('Filter options - userRole:', userRole, 'userId:', userId);
        
        let sitesQuery, consultantsQuery, clinicsQuery;
        
        // If user is Administrator, show all sites and consultants
        // Otherwise, filter based on user's assigned sites
        if (userRole === 'Administrator') {
            console.log('User is Administrator - showing all sites');
            sitesQuery = pool.query('SELECT site_name FROM site_master WHERE site_name IS NOT NULL ORDER BY site_name');
            consultantsQuery = pool.query('SELECT provider_name FROM provider_master WHERE provider_name IS NOT NULL ORDER BY provider_name');
            clinicsQuery = pool.query('SELECT clinic_name FROM clinic_master WHERE clinic_name IS NOT NULL ORDER BY clinic_name');
        } else {
            // For Analyst/Clinician, show only their assigned sites and the consultants at those sites
            console.log('User is Analyst/Clinician - showing assigned sites only');
            
            // First check if user has any site assignments
            const siteCheck = await pool.query(
                'SELECT COUNT(*) FROM user_site_mapping WHERE user_id = $1',
                [userId]
            );
            
            const hasSiteAssignments = parseInt(siteCheck.rows[0].count) > 0;
            
            if (!hasSiteAssignments) {
                // User has no site assignments - return empty arrays
                console.log('User has no site assignments');
                return res.json({
                    consultants: ['All Consultants'],
                    sites: [],
                    clinics: [],
                    diabetes: ['All Statuses', 'Diabetic', 'Probable Diabetic', 'Normal'],
                    control: ['All Categories', 'Controlled', 'Moderately Controlled', 'Uncontrolled'],
                    cholesterol: ['All Levels', 'Normal', 'Borderline', 'High'],
                    gender: ['All Genders', 'Male', 'Female'],
                    age: ['All Ages', '30-40', '41-50', '51-60', '61-70', '71+']
                });
            }
            
            sitesQuery = pool.query(
                `SELECT sm.site_name 
                 FROM site_master sm
                 JOIN user_site_mapping usm ON sm.site_id = usm.site_id
                 WHERE usm.user_id = $1 AND sm.site_name IS NOT NULL
                 ORDER BY sm.site_name`,
                [userId]
            );
            
            // Get consultants from the user's assigned sites via clinic_master
            // Provider -> Clinic -> Site -> User mapping
            consultantsQuery = pool.query(
                `SELECT DISTINCT COALESCE(pm.provider_name, pm.first_name || ' ' || pm.last_name) as provider_name
                 FROM provider_master pm
                 JOIN clinic_master cm ON pm.clinic_id = cm.clinic_id
                 JOIN site_master sm ON cm.site_id = sm.site_id
                 JOIN user_site_mapping usm ON sm.site_id = usm.site_id
                 WHERE usm.user_id = $1 
                 AND (pm.provider_name IS NOT NULL OR pm.first_name IS NOT NULL)
                 ORDER BY provider_name`,
                [userId]
            );
            
            // Get clinics from BOTH direct assignments AND user's assigned sites
            clinicsQuery = pool.query(
                `SELECT DISTINCT cm.clinic_name
                FROM clinic_master cm
                JOIN user_clinic_mapping ucm ON cm.clinic_id = ucm.clinic_id
                WHERE ucm.user_id = $1
                AND cm.clinic_name IS NOT NULL
                ORDER BY cm.clinic_name`,
                [userId]
            );
        }

        const [consultants, sites, clinics] = await Promise.all([consultantsQuery, sitesQuery, clinicsQuery]);
        
        console.log('Filtered sites:', sites.rows);
        console.log('Filtered consultants:', consultants.rows);
        console.log('Filtered clinics:', clinics.rows);

        // For Analyst/Clinician, don't include "All Sites" option
        const sitesList = userRole === 'Administrator' 
            ? ['All Sites', ...sites.rows.map(r => r.site_name)]
            : sites.rows.map(r => r.site_name);

        const clinicsList = userRole === 'Administrator'
            ? ['All Clinics', ...clinics.rows.map(r => r.clinic_name)]
            : clinics.rows.map(r => r.clinic_name);

        res.json({
            consultants: ['All Consultants', ...consultants.rows.map(r => r.provider_name)],
            sites: sitesList,
            clinics: clinicsList,
            diabetes: ['All Statuses', 'Diabetic', 'Probable Diabetic', 'Normal'],
            control: ['All Categories', 'Controlled', 'Moderately Controlled', 'Uncontrolled'],
            cholesterol: ['All Levels', 'Normal', 'Borderline', 'High'],
            gender: ['All Genders', 'Male', 'Female'],
            age: ['All Ages', '30-40', '41-50', '51-60', '61-70', '71+']
        });
    } catch (err) {
        console.error('Error fetching filter options:', err.message);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// Get clinics filtered by selected site and user's permissions
export const getClinicsBySite = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userRole = req.user?.role;
        const { site } = req.query;
        
        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        if (!site) {
            return res.status(400).json({ message: 'Site parameter is required' });
        }
        
        // Get site_id from site_name
        const siteResult = await pool.query(
            'SELECT site_id FROM site_master WHERE site_name = $1',
            [site]
        );
        
        if (siteResult.rows.length === 0) {
            return res.json({ clinics: [] });
        }
        
        const siteId = siteResult.rows[0].site_id;
        
        let query;
        let params;
        
        if (userRole === 'Administrator') {
            // Admin sees all clinics in the selected site
            query = `
                SELECT clinic_name 
                FROM clinic_master 
                WHERE site_id = $1 AND clinic_name IS NOT NULL 
                ORDER BY clinic_name
            `;
            params = [siteId];
        } else {
            // Analyst/Clinician sees only clinics that are:
            // 1. In the selected site
            // 2. Assigned to them via user_clinic_mapping
            query = `
                SELECT DISTINCT cm.clinic_name
                FROM clinic_master cm
                JOIN user_clinic_mapping ucm ON cm.clinic_id = ucm.clinic_id
                WHERE cm.site_id = $1 
                AND ucm.user_id = $2 
                AND cm.clinic_name IS NOT NULL
                ORDER BY cm.clinic_name
            `;
            params = [siteId, userId];
        }
        
        const result = await pool.query(query, params);
        
        const clinics = result.rows.map(row => row.clinic_name);
        
        res.json({ clinics });
    } catch (err) {
        console.error('Error fetching clinics by site:', err.message);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};
