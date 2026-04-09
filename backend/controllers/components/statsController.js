import pool from '../../config/db.js';

/**
 * Get user's allotted sites based on their role
 * Administrator sees all sites, Analyst/Clinician sees only assigned sites
 */
const getUserAllottedSites = async (userId, userRole) => {
    if (!userId) return [];
    
    // If Administrator, return null (no filtering)
    if (userRole === 'Administrator') {
        return null;
    }
    
    // For Analyst/Clinician, get their allotted sites
    const result = await pool.query(
        `SELECT sm.site_name 
         FROM site_master sm
         JOIN user_site_mapping usm ON sm.site_id = usm.site_id
         WHERE usm.user_id = $1 AND sm.site_name IS NOT NULL
         ORDER BY sm.site_name`,
        [userId]
    );
    
    return result.rows.map(r => r.site_name);
};

/**
 * 1. BASE REGISTRY CTE - Latest visit per patient
 */
const PATIENT_REGISTRY_CTE = `
WITH LatestVisitData AS (
    SELECT DISTINCT ON ("PatientID")
        "PatientID",
        "Observation_Date" as latest_visit_date,
        MAX(CASE WHEN "LOINCCode" = '4548-4' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as hba1c,
        MAX(CASE WHEN "LOINCCode" = '13457-7' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as ldl,
        MAX(CASE WHEN "LOINCCode" = '2085-9' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as hdl,
        MAX(CASE WHEN "LOINCCode" = '2093-3' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as cholesterol,
        MAX(CASE WHEN "LOINCCode" = '2571-8' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as tg,
        MAX(CASE WHEN "LOINCCode" = '1558-6' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as fbs,
        MAX(CASE WHEN "LOINCCode" = '1521-0' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as ppbs,
        MAX(CASE WHEN "LOINCCode" = '8480-6' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as bp_systolic,
        MAX(CASE WHEN "LOINCCode" = '8462-4' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as bp_diastolic
    FROM public.lab_observation
    ORDER BY "PatientID", "Observation_Date" DESC 
),
LatestOrder AS (
    SELECT DISTINCT ON ("PatientID") "PatientID", "OrderedBy"
    FROM public.lab_order
    ORDER BY "PatientID", "OrderDate" DESC
)
SELECT 
    p.patient_id, p.uhid_display, p.patient_name, p.age, p.gender_id,
    sm.site_name, pr.provider_name, lvd.latest_visit_date, 
    lvd.hba1c, lvd.fbs, lvd.ppbs, lvd.ldl, lvd.hdl, lvd.cholesterol, lvd.tg,
    NULLIF(lvd.bp_systolic || '/' || lvd.bp_diastolic, '/') as bp_reading,
    CASE 
        WHEN lvd.hba1c >= 6.5 OR lvd.fbs >= 126 THEN 'DIABETIC'
        WHEN lvd.hba1c BETWEEN 5.7 AND 6.4 THEN 'PRE-DIABETIC'
        ELSE 'NORMAL'
    END AS diabetic_status,
    CASE 
        WHEN lvd.hba1c < 7.0 THEN 'CONTROLLED'
        WHEN lvd.hba1c BETWEEN 7.0 AND 9.0 THEN 'MODERATELY CONTROLLED'
        WHEN lvd.hba1c > 9.0 THEN 'UNCONTROLLED'
        ELSE 'NOT EVALUATED'
    END AS control_status
FROM public.patient_master p
LEFT JOIN LatestVisitData lvd ON p.patient_id = lvd."PatientID"
LEFT JOIN LatestOrder lo ON p.patient_id = lo."PatientID"
LEFT JOIN public.provider_master pr ON lo."OrderedBy" = pr."provider_id"
LEFT JOIN public.clinic_master cm ON pr.clinic_id = cm.clinic_id
LEFT JOIN public.site_master sm ON cm.site_id = sm.site_id
`;

/**
 * 2. HISTORICAL CTE - All visits preserved (for analytics)
 */
const GET_HISTORICAL_VISITS = (whereClause = "WHERE 1=1") => `
    WITH clinical_pivot AS (
        SELECT
            "PatientID",
            "Observation_Date",
            MAX(CASE WHEN "LOINCCode" = '4548-4' THEN "Value" END) AS hba1c,
            MAX(CASE WHEN "LOINCCode" = '2093-3' THEN "Value" END) AS cholesterol,
            MAX(CASE WHEN "LOINCCode" = '1558-6' THEN "Value" END) AS fbs,
            MAX(CASE WHEN "LOINCCode" = '1521-0' THEN "Value" END) AS ppbs
        FROM public.lab_observation
        GROUP BY "PatientID", "Observation_Date"
    ),
    PatientSite AS (
        SELECT patient_id, site_name
        FROM (${PATIENT_REGISTRY_CTE}) AS reg
    )
    SELECT
        cp."PatientID",
        cp."Observation_Date" AS visit_date,
        COALESCE(sm.site_name, ps.site_name, 'Unknown Site') as site_name,
        COALESCE(pr.provider_name, 'Unknown Provider') as provider_name,
        cp.hba1c,
        cp.cholesterol,
        CASE
            WHEN (NULLIF(substring(cp.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 7.0 THEN 'CONTROLLED'
            WHEN (NULLIF(substring(cp.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) BETWEEN 7.0 AND 9.0 THEN 'MODERATELY CONTROLLED'
            WHEN (NULLIF(substring(cp.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) > 9.0 THEN 'UNCONTROLLED'
            ELSE 'NOT EVALUATED'
        END AS control_status,
        p.age,
        p.gender_id
    FROM clinical_pivot cp
    LEFT JOIN public.patient_master p ON p.patient_id = cp."PatientID"
    LEFT JOIN PatientSite ps ON p.patient_id = ps.patient_id
    LEFT JOIN public.lab_order lo ON cp."PatientID" = lo."PatientID" AND lo."OrderDate"::date = cp."Observation_Date"::date
    LEFT JOIN public.provider_master pr ON lo."OrderedBy" = pr.provider_id
    LEFT JOIN public.clinic_master cm ON pr.clinic_id = cm.clinic_id
    LEFT JOIN public.site_master sm ON cm.site_id = sm.site_id
    ${whereClause}
`;

// Gender UUIDs
const MALE_ID = 'dc865974-eef7-41ce-bba8-54dd43035e55';
const FEMALE_ID = '02297529-0988-4654-810f-1c7dfa9ca8d6';

/**
 * Build WHERE clause from query parameters
 */
const buildWhereClause = (params, values) => {
    let where = 'WHERE 1=1';
    const pushParam = (val, clause) => {
        values.push(val);
        where += ` ${clause.replace('$', '$' + values.length)}`;
    };
    
    const { consultant, site, status, control, gender, startDate, endDate, cholesterol, age, search } = params;

    // Consultant & Site
    if (consultant && !['', 'All', 'All Consultants'].includes(consultant)) {
        pushParam(`%${consultant}%`, 'AND COALESCE(pr.provider_name, \'Unknown Provider\') ILIKE $');
    }
    if (site && !['', 'All', 'All Sites'].includes(site)) {
        pushParam(`%${site}%`, 'AND COALESCE(sm.site_name, ps.site_name) ILIKE $');
    }

    // Diabetes Status (HbA1c >= 6.5 OR FBS >= 126)
    if (status && !['', 'All', 'All Statuses'].includes(status)) {
    const s = status.toString().toLowerCase();
    const hba_num = "NULLIF(substring(coalesce(cp.hba1c::text, '') from '([0-9]+\\.?[0-9]*)'), '')::numeric";
    const fbs_num = "NULLIF(substring(coalesce(cp.fbs::text, '') from '([0-9]+\\.?[0-9]*)'), '')::numeric";

    if (s.includes('diabetic') && !s.includes('prob')) {
        // DIABETIC: Either hits the threshold
        where += ` AND ((${hba_num} >= 6.5) OR (${fbs_num} >= 126))`;

    } else if (s.includes('prob') || s.includes('pre')) {
        // PREDIABETIC: 
        // 1. Must NOT hit the diabetic threshold on either test
        // 2. AND must hit the prediabetic range on at least one test
        where += ` AND (
            ((${hba_num} BETWEEN 5.7 AND 6.49) OR (${fbs_num} BETWEEN 100 AND 125.9))
            AND ((${hba_num} < 6.5 OR ${hba_num} IS NULL) AND (${fbs_num} < 126 OR ${fbs_num} IS NULL))
        )`;

    } else if (s.includes('normal')) {
        // NORMAL:
        // 1. Has at least one value
        // 2. Both values (if present) are below prediabetic thresholds
        where += ` AND (
            (${hba_num} < 5.7 OR ${hba_num} IS NULL) 
            AND (${fbs_num} < 100 OR ${fbs_num} IS NULL)
            AND (${hba_num} IS NOT NULL OR ${fbs_num} IS NOT NULL)
        )`;
    }
}

    // Control Status (HbA1c based)
    if (control && !['', 'All', 'All Categories'].includes(control)) {
        const c = control.toString().toLowerCase();
        const hba_num = "NULLIF(substring(coalesce(cp.hba1c::text, '') from '([0-9]+\\.?[0-9]*)'), '')::numeric";
        if (c.includes('uncontrol')) where += ` AND ((${hba_num}) > 9.0)`;
        else if (c.includes('moderate')) where += ` AND ((${hba_num}) BETWEEN 7.0 AND 9.0)`;
        else if (c.includes('controlled')) where += ` AND ((${hba_num}) < 7.0)`;
        else if (c.includes('not') && c.includes('evalu')) where += ` AND ((${hba_num}) IS NULL)`;
    }

    // Gender
    if (gender && !['', 'All', 'All Genders'].includes(gender)) {
        if (gender === 'Male' || gender === 'm') pushParam(MALE_ID, 'AND p.gender_id = $');
        else if (gender === 'Female' || gender === 'f') pushParam(FEMALE_ID, 'AND p.gender_id = $');
    }

    // Dates
    if (startDate) pushParam(startDate, "AND cp.\"Observation_Date\"::date >= $");
    if (endDate) pushParam(endDate, "AND cp.\"Observation_Date\"::date <= $");

    // Search
    if (search) {
        values.push(`%${search}%`);
        where += ` AND (p.patient_name ILIKE $${values.length} OR p.uhid_display ILIKE $${values.length})`;
    }

    // Cholesterol
    if (cholesterol && !['', 'All', 'All Levels'].includes(cholesterol)) {
        const chol_num = "NULLIF(substring(coalesce(cp.cholesterol::text, '') from '([0-9]+\\.?[0-9]*)'), '')::numeric";
        if (cholesterol === 'Normal') where += ` AND (cp.cholesterol IS NULL OR (${chol_num}) < 200)`;
        else if (cholesterol === 'Borderline') where += ` AND ((${chol_num}) >= 200 AND (${chol_num}) < 240)`;
        else if (cholesterol === 'High') where += ` AND ((${chol_num}) >= 240)`;
    }

    // Age
    if (age && !['', 'All', 'All Ages'].includes(age)) {
        const age_num = "NULLIF(substring(p.age::text from '([0-9]+)'), '')::int";
        if (age.includes('-')) {
            const [min, max] = age.split('-').map(Number);
            pushParam(min, `AND (${age_num}) >= $`); pushParam(max, `AND (${age_num}) <= $`);
        } else if (age.endsWith('+')) {
            pushParam(parseInt(age), `AND (${age_num}) >= $`);
        }
    }

    return where;
};

/**
 * Summary Stats API - uses latest visit within selected time period
 * Same logic as Patient Registry
 */
export const getDashboardStats = async (req, res) => {
    try {
        const { consultant, site, status, control, gender, startDate, endDate, cholesterol, age, search } = req.query;
        
        // Get user info for site-based filtering
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        // Get user's allotted sites (null for admin, array for analyst/clinician)
        const allottedSites = await getUserAllottedSites(userId, userRole);
        
        // Build site filter based on user role
        let siteFilter = '';
        if (allottedSites && allottedSites.length > 0) {
            // User has limited site access - filter to only show patients from allotted sites
            const siteList = allottedSites.map(s => `'${s}'`).join(', ');
            siteFilter = ` AND sm.site_name IN (${siteList})`;
        } else if (allottedSites && allottedSites.length === 0) {
            // User has no site assignments - return empty result
            return res.json({
                total_patients: 0,
                diabetic_population: 0,
                prevalence_rate: '0.0',
                avg_frequency: 0,
                total_sites: 0,
                total_consultants: 0,
                total_clinics: 0
            });
        }
        // For Administrator (allottedSites is null), no additional filtering
        
        const hasValidStartDate = startDate && startDate.trim() !== '';
        const hasValidEndDate = endDate && endDate.trim() !== '';
        
        const dateFilter = `
            ${hasValidStartDate ? `AND "Observation_Date"::date >= '${startDate}'` : ''}
            ${hasValidEndDate ? `AND "Observation_Date"::date <= '${endDate}'` : ''}
        `;
        
        const orderDateFilter = `
            ${hasValidStartDate ? `AND "OrderDate"::date >= '${startDate}'` : ''}
            ${hasValidEndDate ? `AND "OrderDate"::date <= '${endDate}'` : ''}
        `;
        
        const sql = `
    WITH LatestVisitData AS (
        SELECT DISTINCT ON ("PatientID")
            "PatientID",
            "Observation_Date" as latest_visit_date,
            MAX(CASE WHEN "LOINCCode" = '4548-4' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as hba1c,
            MAX(CASE WHEN "LOINCCode" = '1558-6' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as fbs,
            MAX(CASE WHEN "LOINCCode" = '2093-3' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as cholesterol
        FROM public.lab_observation
        WHERE 1=1
        ${dateFilter}
        ORDER BY "PatientID", "Observation_Date" DESC 
    ),
    LatestOrder AS (
        SELECT DISTINCT ON ("PatientID") "PatientID", "OrderedBy"
        FROM public.lab_order
        WHERE 1=1
        ${orderDateFilter}
        ORDER BY "PatientID", "OrderDate" DESC
    ),
    FilteredRegistry AS (
        SELECT 
            lvd.*, 
            p.age, p.gender_id,
            sm.site_name, pr.provider_name, cm.clinic_name,
            -- Subquery to count total visits for this specific patient within date range
            (SELECT COUNT(DISTINCT "Observation_Date") 
             FROM public.lab_observation 
             WHERE "PatientID" = lvd."PatientID" ${dateFilter}) as visit_count
        FROM LatestVisitData lvd
        LEFT JOIN public.patient_master p ON lvd."PatientID" = p.patient_id
        LEFT JOIN LatestOrder lo ON lvd."PatientID" = lo."PatientID"
        LEFT JOIN public.provider_master pr ON lo."OrderedBy" = pr."provider_id"
        LEFT JOIN public.clinic_master cm ON pr.clinic_id = cm.clinic_id
        LEFT JOIN public.site_master sm ON cm.site_id = sm.site_id
        WHERE 1=1
        ${siteFilter}
        ${consultant && !['', 'All', 'All Consultants'].includes(consultant) ? `AND pr.provider_name = '${consultant}'` : ''}
        ${site && !['', 'All', 'All Sites'].includes(site) ? `AND sm.site_name = '${site}'` : ''}
        ${gender && !['', 'All', 'All Genders'].includes(gender) ? (gender === 'Male' || gender === 'm' ? `AND p.gender_id = 'dc865974-eef7-41ce-bba8-54dd43035e55'` : `AND p.gender_id = '02297529-0988-4654-810f-1c7dfa9ca8d6'`) : ''}
        ${age && !['', 'All', 'All Ages'].includes(age) ? (age.includes('-') ? `AND (NULLIF(substring(p.age::text from '([0-9]+)'), '')::int) BETWEEN ${age.split('-')[0]} AND ${age.split('-')[1]}` : `AND (NULLIF(substring(p.age::text from '([0-9]+)'), '')::int) >= ${parseInt(age)}`) : ''}
        ${cholesterol && !['', 'All', 'All Levels'].includes(cholesterol) ? (cholesterol === 'Normal' ? `AND (cholesterol IS NULL OR (NULLIF(substring(cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 200)` : cholesterol === 'Borderline' ? `AND (NULLIF(substring(cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 200 AND (NULLIF(substring(cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 240` : cholesterol === 'High' ? `AND (NULLIF(substring(cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 240` : '') : ''}
        ${status && !['', 'All', 'All Statuses'].includes(status) ? (status.toLowerCase().includes('prob') || status.toLowerCase().includes('pre') ? `AND ((NULLIF(substring(hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) BETWEEN 5.7 AND 6.4)` : status.toLowerCase().includes('diabetic') ? `AND ((NULLIF(substring(hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 6.5 OR (NULLIF(substring(fbs::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 126)` : `AND ((NULLIF(substring(hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 5.7)`) : ''}
        ${control && !['', 'All', 'All Categories'].includes(control) ? (control.toLowerCase().includes('uncontrol') ? `AND (NULLIF(substring(hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) > 9.0` : control.toLowerCase().includes('moderate') ? `AND (NULLIF(substring(hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) BETWEEN 7.0 AND 9.0` : control.toLowerCase().includes('controlled') ? `AND (NULLIF(substring(hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 7.0` : '') : ''}
        ${search ? `AND (p.patient_name ILIKE '%${search}%' OR p.uhid_display ILIKE '%${search}%')` : ''}
    )
    SELECT 
        COUNT(*)::int as total_patients,
        COUNT(*) FILTER (
            WHERE (NULLIF(substring(hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 6.5 
            OR (NULLIF(substring(fbs::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 126
        )::int as diabetic_population,
        ROUND((COUNT(*) FILTER (WHERE (NULLIF(substring(hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 6.5 OR (NULLIF(substring(fbs::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 126))::numeric / NULLIF(COUNT(*), 0) * 100, 1) as prevalence_rate,
        ROUND(AVG(visit_count), 1) as avg_frequency,
        COUNT(DISTINCT site_name)::int as total_sites,
        COUNT(DISTINCT provider_name)::int as total_consultants,
        COUNT(DISTINCT clinic_name)::int as total_clinics
    FROM FilteredRegistry;
`;
        
        const result = await pool.query(sql);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
/**
 * Analytics Dashboard API - Uses latest visit in selected time period (same as Patient Registry)
 */
export const getDashboardAnalytics = async (req, res) => {
    try {
        const { consultant, site, status, control, gender, startDate, endDate, cholesterol, age, search } = req.query;
        
        // Get user info for site-based filtering
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        // Get user's allotted sites (null for admin, array for analyst/clinician)
        const allottedSites = await getUserAllottedSites(userId, userRole);
        
        // Build site filter based on user role
        let userSiteFilter = '';
        if (allottedSites && allottedSites.length > 0) {
            // User has limited site access - filter to only show patients from allotted sites
            const siteList = allottedSites.map(s => `'${s}'`).join(', ');
            userSiteFilter = ` AND sm.site_name IN (${siteList})`;
        } else if (allottedSites && allottedSites.length === 0) {
            // User has no site assignments - return empty result
            return res.json({
                totalPatients: 0,
                diabeticPopulation: 0,
                prevalenceRate: 0,
                avgFrequency: 0,
                distribution: [],
                trends: [],
                consultants: [],
                sites: [],
                demographics: {},
                gender: [],
                labTrends: [],
                siteTrends: [],
                siteNames: [],
                criticalCases: []
            });
        }
        // For Administrator (allottedSites is null), no additional filtering
        
        // Build date filter for CTE - only apply if valid date strings
        const hasValidStartDate = startDate && startDate.trim() !== '';
        const hasValidEndDate = endDate && endDate.trim() !== '';
        
        const dateFilter = `
            ${hasValidStartDate ? `AND "Observation_Date"::date >= '${startDate}'` : ''}
            ${hasValidEndDate ? `AND "Observation_Date"::date <= '${endDate}'` : ''}
        `;
        
        const orderDateFilter = `
            ${hasValidStartDate ? `AND "OrderDate"::date >= '${startDate}'` : ''}
            ${hasValidEndDate ? `AND "OrderDate"::date <= '${endDate}'` : ''}
        `;

        // Use same CTE logic as Patient Registry - filter by date in CTE first
        const baseQuery = `
            WITH LatestVisitData AS (
                SELECT DISTINCT ON ("PatientID")
                    "PatientID",
                    "Observation_Date" as latest_visit_date,
                    MAX(CASE WHEN "LOINCCode" = '4548-4' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as hba1c,
                    MAX(CASE WHEN "LOINCCode" = '2093-3' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as cholesterol,
                    MAX(CASE WHEN "LOINCCode" = '1558-6' THEN "Value" END) OVER (PARTITION BY "PatientID", "Observation_Date") as fbs
                FROM public.lab_observation
                WHERE 1=1
                ${dateFilter}
                ORDER BY "PatientID", "Observation_Date" DESC 
            ),
            LatestOrder AS (
                SELECT DISTINCT ON ("PatientID") "PatientID", "OrderedBy"
                FROM public.lab_order
                WHERE 1=1
                ${orderDateFilter}
                ORDER BY "PatientID", "OrderDate" DESC
            )
            SELECT 
                lvd."PatientID",
                lvd.latest_visit_date,
                COALESCE(sm.site_name, 'Unknown Site') as site_name,
                COALESCE(pr.provider_name, 'Unknown Provider') as provider_name,
                lvd.hba1c,
                lvd.cholesterol,
                CASE
                    WHEN (NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 7.0 THEN 'CONTROLLED'
                    WHEN (NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) BETWEEN 7.0 AND 9.0 THEN 'MODERATELY CONTROLLED'
                    WHEN (NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) > 9.0 THEN 'UNCONTROLLED'
                    ELSE 'NOT EVALUATED'
                END AS control_status,
                p.age,
                p.gender_id
            FROM LatestVisitData lvd
            INNER JOIN public.patient_master p ON lvd."PatientID" = p.patient_id
            LEFT JOIN LatestOrder lo ON lvd."PatientID" = lo."PatientID"
            LEFT JOIN public.provider_master pr ON lo."OrderedBy" = pr.provider_id
            LEFT JOIN public.clinic_master cm ON pr.clinic_id = cm.clinic_id
            LEFT JOIN public.site_master sm ON cm.site_id = sm.site_id
            WHERE 1=1
            ${userSiteFilter}
        `;

        // Build filter conditions
        let filterConditions = '';
        
        if (consultant && !['', 'All', 'All Consultants'].includes(consultant)) {
            filterConditions += ` AND pr.provider_name = '${consultant}'`;
        }
        if (site && !['', 'All', 'All Sites'].includes(site)) {
            filterConditions += ` AND sm.site_name = '${site}'`;
        }
        if (gender && !['', 'All', 'All Genders'].includes(gender)) {
            const genderId = (gender === 'Male' || gender === 'm') ? 'dc865974-eef7-41ce-bba8-54dd43035e55' : '02297529-0988-4654-810f-1c7dfa9ca8d6';
            filterConditions += ` AND p.gender_id = '${genderId}'`;
        }
        if (age && !['', 'All', 'All Ages'].includes(age)) {
            if (age.includes('-')) {
                const [min, max] = age.split('-').map(Number);
                filterConditions += ` AND (NULLIF(substring(p.age::text from '([0-9]+)'), '')::int) BETWEEN ${min} AND ${max}`;
            } else if (age.endsWith('+')) {
                filterConditions += ` AND (NULLIF(substring(p.age::text from '([0-9]+)'), '')::int) >= ${parseInt(age)}`;
            }
        }
        if (cholesterol && !['', 'All', 'All Levels'].includes(cholesterol)) {
            if (cholesterol === 'Normal') filterConditions += ` AND (lvd.cholesterol IS NULL OR (NULLIF(substring(lvd.cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 200)`;
            else if (cholesterol === 'Borderline') filterConditions += ` AND (NULLIF(substring(lvd.cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 200 AND (NULLIF(substring(lvd.cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 240`;
            else if (cholesterol === 'High') filterConditions += ` AND (NULLIF(substring(lvd.cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 240`;
        }
        if (status && !['', 'All', 'All Statuses'].includes(status)) {
            const s = status.toLowerCase();
            if (s.includes('diabetic') && !s.includes('prob')) {
                filterConditions += ` AND ((NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 6.5 OR (NULLIF(substring(lvd.fbs::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) >= 126)`;
            } else if (s.includes('prob')) {
                filterConditions += ` AND ((NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) BETWEEN 5.7 AND 6.4)`;
            } else {
                filterConditions += ` AND ((NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 5.7)`;
            }
        }
        if (control && !['', 'All', 'All Categories'].includes(control)) {
            const c = control.toLowerCase();
            if (c.includes('uncontrol')) filterConditions += ` AND (NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) > 9.0`;
            else if (c.includes('moderate')) filterConditions += ` AND (NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) BETWEEN 7.0 AND 9.0`;
            else if (c.includes('controlled')) filterConditions += ` AND (NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 7.0`;
            else if (c.includes('not') && c.includes('evalu')) filterConditions += ` AND (lvd.hba1c IS NULL)`;
        }
        if (search) {
            filterConditions += ` AND (p.patient_name ILIKE '%${search}%' OR p.uhid_display ILIKE '%${search}%')`;
        }

        const fullQuery = baseQuery + filterConditions;

        console.log('=== Filter Debug ===');
        console.log('Using patient registry logic with filters:', filterConditions);

        // 1. Control Distribution
        const distRes = await pool.query(`
            SELECT UPPER(control_status) as status, COUNT(*)::int as cnt 
            FROM (${fullQuery}) AS reg 
            GROUP BY 1`);
        
        // 2. Consultant Workload (Top 10)
        const consulRes = await pool.query(`
            SELECT provider_name as name, COUNT(*)::int as count 
            FROM (${fullQuery}) AS reg 
            GROUP BY 1 ORDER BY 2 DESC LIMIT 10`);
        
        // 3. Site Performance
        const sitesRes = await pool.query(`
            SELECT site_name as site,
                COUNT(*) FILTER (WHERE UPPER(control_status) = 'CONTROLLED')::int as controlled,
                COUNT(*) FILTER (WHERE UPPER(control_status) = 'MODERATELY CONTROLLED')::int as moderate,
                COUNT(*) FILTER (WHERE UPPER(control_status) = 'UNCONTROLLED')::int as uncontrolled
            FROM (${fullQuery}) AS reg 
            GROUP BY 1 ORDER BY 2 DESC`);

        // 4. Demographics
        const demoRes = await pool.query(`
            SELECT
              COUNT(*) FILTER (WHERE (NULLIF(substring(age::text from '([0-9]+)'), '')::int) BETWEEN 30 AND 40) as "30-40",
              COUNT(*) FILTER (WHERE (NULLIF(substring(age::text from '([0-9]+)'), '')::int) BETWEEN 41 AND 50) as "41-50",
              COUNT(*) FILTER (WHERE (NULLIF(substring(age::text from '([0-9]+)'), '')::int) BETWEEN 51 AND 60) as "51-60",
              COUNT(*) FILTER (WHERE (NULLIF(substring(age::text from '([0-9]+)'), '')::int) BETWEEN 61 AND 70) as "61-70",
              COUNT(*) FILTER (WHERE (NULLIF(substring(age::text from '([0-9]+)'), '')::int) >= 71) as "71+"
            FROM (${fullQuery}) AS reg`);

        // 5. Gender Split
        const genderRes = await pool.query(`
            SELECT gender_id, COUNT(*)::int as cnt 
            FROM (${fullQuery}) AS reg 
            GROUP BY 1`);

        // For trends and lab trends, we need historical data within the selected period
        // Generate months series based on the selected date range or default to last 12 months
        const monthsSeries = [];
        let dateFilterTrends;
        
        if (startDate && endDate) {
            // Both dates provided - generate series between them
            const start = new Date(startDate);
            const end = new Date(endDate);
            for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d.setMonth(d.getMonth() + 1)) {
                monthsSeries.push(d.toISOString().slice(0, 7));
            }
            dateFilterTrends = `visit_date >= '${startDate}'::date AND visit_date <= '${endDate}'::date`;
        } else if (startDate) {
            // Only start date provided - generate 12 months from start date
            const start = new Date(startDate);
            for (let i = 0; i < 12; i++) {
                const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
                monthsSeries.push(d.toISOString().slice(0, 7));
            }
            dateFilterTrends = `visit_date >= '${startDate}'::date`;
        } else if (endDate) {
            // Only end date provided - generate 12 months ending at end date
            const end = new Date(endDate);
            for (let i = 11; i >= 0; i--) {
                const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
                monthsSeries.push(d.toISOString().slice(0, 7));
            }
            dateFilterTrends = `visit_date <= '${endDate}'::date`;
        } else {
            // No dates provided - default to last 12 months
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                monthsSeries.push(d.toISOString().slice(0, 7));
            }
            dateFilterTrends = "visit_date >= CURRENT_DATE - INTERVAL '12 months'";
        }
        
        // ============================================
        // HISTORICAL QUERIES FOR TRENDS (Separate Variable)
        // Use GET_HISTORICAL_VISITS for trends data
        // ============================================
        
        // Build filter for historical queries (applies same global filters but uses historical data)
        let histWhere = 'WHERE 1=1';
        const histValues = [];
        
        // Add global filters to historical query
        if (consultant && !['', 'All', 'All Consultants'].includes(consultant)) {
            histWhere += ` AND COALESCE(pr.provider_name, 'Unknown Provider') ILIKE '%${consultant}%'`;
        }
        if (site && !['', 'All', 'All Sites'].includes(site)) {
            histWhere += ` AND COALESCE(sm.site_name, ps.site_name) ILIKE '%${site}%'`;
        }
        if (gender && !['', 'All', 'All Genders'].includes(gender)) {
            const genderId = (gender === 'Male' || gender === 'm') ? 'dc865974-eef7-41ce-bba8-54dd43035e55' : '02297529-0988-4654-810f-1c7dfa9ca8d6';
            histWhere += ` AND p.gender_id = '${genderId}'`;
        }
        if (age && !['', 'All', 'All Ages'].includes(age)) {
            if (age.includes('-')) {
                const [min, max] = age.split('-').map(Number);
                histWhere += ` AND (NULLIF(substring(p.age::text from '([0-9]+)'), '')::int) BETWEEN ${min} AND ${max}`;
            } else if (age.endsWith('+')) {
                histWhere += ` AND (NULLIF(substring(p.age::text from '([0-9]+)'), '')::int) >= ${parseInt(age)}`;
            }
        }
        if (cholesterol && !['', 'All', 'All Levels'].includes(cholesterol)) {
            const cholNum = "NULLIF(substring(coalesce(cp.cholesterol::text, '') from '([0-9]+\\.?[0-9]*)'), '')::numeric";
            if (cholesterol === 'Normal') histWhere += ` AND (cp.cholesterol IS NULL OR (${cholNum}) < 200)`;
            else if (cholesterol === 'Borderline') histWhere += ` AND ((${cholNum}) >= 200 AND (${cholNum}) < 240)`;
            else if (cholesterol === 'High') histWhere += ` AND ((${cholNum}) >= 240)`;
        }
        if (status && !['', 'All', 'All Statuses'].includes(status)) {
            const s = status.toLowerCase();
            const hbaNum = "NULLIF(substring(coalesce(cp.hba1c::text, '') from '([0-9]+\\.?[0-9]*)'), '')::numeric";
            const fbsNum = "NULLIF(substring(coalesce(cp.fbs::text, '') from '([0-9]+\\.?[0-9]*)'), '')::numeric";
            if (s.includes('diabetic') && !s.includes('prob')) {
                histWhere += ` AND ((${hbaNum}) >= 6.5 OR (${fbsNum}) >= 126)`;
            } else if (s.includes('prob')) {
                histWhere += ` AND ((${hbaNum}) BETWEEN 5.7 AND 6.4)`;
            } else {
                histWhere += ` AND ((${hbaNum}) < 5.7)`;
            }
        }
        if (control && !['', 'All', 'All Categories'].includes(control)) {
            const c = control.toLowerCase();
            const hbaNum = "NULLIF(substring(coalesce(cp.hba1c::text, '') from '([0-9]+\\.?[0-9]*)'), '')::numeric";
            if (c.includes('uncontrol')) histWhere += ` AND (${hbaNum}) > 9.0`;
            else if (c.includes('moderate')) histWhere += ` AND (${hbaNum}) BETWEEN 7.0 AND 9.0`;
            else if (c.includes('controlled')) histWhere += ` AND (${hbaNum}) < 7.0`;
            else if (c.includes('not') && c.includes('evalu')) histWhere += ` AND (${hbaNum}) IS NULL`;
        }
        
        // Historical query for trends
        const historicalQuery = GET_HISTORICAL_VISITS(histWhere);
        
        // 6. HISTORICAL TRENDS - 12-month with gap-filling
        const trendsRes = await pool.query(`
            SELECT to_char(date_trunc('month', visit_date), 'YYYY-MM') as month,
                   UPPER(control_status) as status, COUNT(DISTINCT "PatientID")::int as cnt
            FROM (${historicalQuery}) AS hist 
            WHERE ${dateFilterTrends}
            GROUP BY 1, 2 ORDER BY 1`, histValues);

        // 7. Monthly Site Trends (Uncontrolled only)
        const siteTrendsRes = await pool.query(`
            SELECT to_char(date_trunc('month', visit_date), 'YYYY-MM') as month,
                   site_name, COUNT(DISTINCT "PatientID")::int as uncontrolled_count
            FROM (${historicalQuery}) AS hist 
            WHERE ${dateFilterTrends}
            AND UPPER(control_status) = 'UNCONTROLLED'
            GROUP BY 1, 2 ORDER BY 1, 2`, histValues);

        // 8. Monthly Lab Value Trends
        const labRes = await pool.query(`
            SELECT to_char(date_trunc('month', visit_date), 'YYYY-MM') as month,
                   ROUND(AVG(NULLIF(NULLIF(substring(hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric, 0))::numeric, 2) as avg_hba1c,
                   ROUND(AVG(NULLIF(NULLIF(substring(cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric, 0))::numeric, 2) as avg_chol
            FROM (${historicalQuery}) AS hist 
            WHERE ${dateFilterTrends}
            GROUP BY 1 ORDER BY 1`, histValues);
        
        // Transform Control Trends with gap-filling
        const trendsMap = {};
        monthsSeries.forEach(m => trendsMap[m] = { month: m, controlled: 0, moderate: 0, uncontrolled: 0 });
        trendsRes.rows.forEach(r => {
            if (trendsMap[r.month]) {
                if (r.status === 'CONTROLLED') trendsMap[r.month].controlled = r.cnt;
                if (r.status === 'MODERATELY CONTROLLED') trendsMap[r.month].moderate = r.cnt;
                if (r.status === 'UNCONTROLLED') trendsMap[r.month].uncontrolled = r.cnt;
            }
        });
        
        // Transform Site Trend Pivot - each site becomes a column
        const siteNamesList = [...new Set(siteTrendsRes.rows.map(r => r.site_name))];
        const siteTrendsOut = monthsSeries.map(m => {
            const row = { month: m };
            siteNamesList.forEach(sn => row[sn] = 0);
            siteTrendsRes.rows.filter(r => r.month === m).forEach(r => { 
                row[r.site_name] = r.uncontrolled_count; 
            });
            return row;
        });
        
        // Lab trends with gap-filling
        const labTrendsMap = {};
        monthsSeries.forEach(m => labTrendsMap[m] = { month: m, avg_hba1c: 0, avg_chol: 0 });
        labRes.rows.forEach(r => {
            if (labTrendsMap[r.month]) {
                labTrendsMap[r.month] = { 
                    month: r.month, 
                    avg_hba1c: Number(r.avg_hba1c) || 0, 
                    avg_chol: Number(r.avg_chol) || 0 
                };
            }
        });

        // Final Response
        res.json({
            distribution: distRes.rows.map(r => ({ name: r.status, value: r.cnt })),
            trends: Object.values(trendsMap),
            consultants: consulRes.rows,
            sites: sitesRes.rows,
            demographics: demoRes.rows[0] || {},
            gender: genderRes.rows.map(r => ({ 
                name: r.gender_id === 'dc865974-eef7-41ce-bba8-54dd43035e55' ? 'Male' : (r.gender_id === '02297529-0988-4654-810f-1c7dfa9ca8d6' ? 'Female' : 'Other'), 
                value: r.cnt 
            })),
            labTrends: Object.values(labTrendsMap),
            siteTrends: siteTrendsOut,
            siteNames: siteNamesList,
            criticalCases: sitesRes.rows.map(s => ({ site: s.site, uncontrolled: s.uncontrolled }))
        });

    } catch (err) {
        console.error("Dashboard Analytics Error:", err, err.stack);
        res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
};
