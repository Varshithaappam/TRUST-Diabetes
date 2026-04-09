import db from '../../config/db.js';

/**
 * Helper to extract numeric values from text/string lab values
 */
const hba_numeric = "NULLIF(substring(lvd.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric";
const fbs_numeric = "NULLIF(substring(lvd.fbs::text from '([0-9]+\\.?[0-9]*)'), '')::numeric";
const chol_numeric = "NULLIF(substring(lvd.cholesterol::text from '([0-9]+\\.?[0-9]*)'), '')::numeric";
const age_numeric = "NULLIF(substring(p.age::text from '([0-9]+)'), '')::int";

// 1. Fetch all records for the Registry List
export const getPatientRegistry = async (req, res) => {
    try {
        const { consultant, site, status, control, gender, startDate, endDate, search, cholesterol, age } = req.query;

        // Get user info for site-based filtering
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        // Get user's allotted sites (null for admin, array for analyst/clinician)
        let allottedSites = null;
        if (userRole !== 'Administrator') {
            const siteResult = await db.query(
                `SELECT sm.site_name 
                 FROM site_master sm
                 JOIN user_site_mapping usm ON sm.site_id = usm.site_id
                 WHERE usm.user_id = $1 AND sm.site_name IS NOT NULL
                 ORDER BY sm.site_name`,
                [userId]
            );
            allottedSites = siteResult.rows.map(r => r.site_name);
            
            // If user has no site assignments, return empty
            if (allottedSites.length === 0) {
                return res.status(200).json([]);
            }
        }

        // Build the Date Filters for use inside the CTEs
        const cteDateFilter = `
            ${startDate ? `AND "Observation_Date"::date >= '${startDate}'` : ''}
            ${endDate ? `AND "Observation_Date"::date <= '${endDate}'` : ''}
        `;

        const orderDateFilter = `
            ${startDate ? `AND lo."OrderDate"::date >= '${startDate}'` : ''}
            ${endDate ? `AND lo."OrderDate"::date <= '${endDate}'` : ''}
        `;

        let query = `
            WITH LatestVisitData AS (
                -- Get the latest visit within the specific date range to match Stats Cards
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
                WHERE 1=1 ${cteDateFilter}
                ORDER BY "PatientID", "Observation_Date" DESC 
            ),
            PreviousVisitData AS (
                -- Get the previous visit (second latest) for trend calculation
                SELECT "PatientID", "Observation_Date", "Value" as prev_hba1c
                FROM (
                    SELECT 
                        "PatientID",
                        "Observation_Date",
                        "Value",
                        ROW_NUMBER() OVER (PARTITION BY "PatientID" ORDER BY "Observation_Date" DESC) as rn
                    FROM public.lab_observation
                    WHERE "LOINCCode" = '4548-4' ${cteDateFilter}
                ) sub WHERE rn = 2
            ),
            LatestOrder AS (
                SELECT DISTINCT ON (lo."PatientID") 
                    lo."PatientID", 
                    lo."OrderedBy"
                FROM public.lab_order lo
                WHERE 1=1 ${orderDateFilter}
                ORDER BY lo."PatientID", lo."OrderDate" DESC
            )
            SELECT 
                p.patient_id,
                p.uhid_display,
                p.patient_name,
                p.age,
                p.gender_id,
                hm.hospital_name,
                sm.site_name,
                cm.clinic_name,
                pr.provider_name,
                lvd.latest_visit_date, 
                lvd.hba1c,
                pv.prev_hba1c,
                lvd.fbs,
                lvd.ppbs,
                lvd.ldl,
                lvd.hdl,
                lvd.cholesterol,
                lvd.tg,
                NULLIF(lvd.bp_systolic || '/' || lvd.bp_diastolic, '/') as bp_reading,
                
                CASE 
                    WHEN (${hba_numeric}) >= 6.5 OR (${fbs_numeric}) >= 126 THEN 'DIABETIC'
                    WHEN (${hba_numeric}) BETWEEN 5.7 AND 6.4 THEN 'PRE-DIABETIC'
                    ELSE 'NORMAL'
                END AS diabetic_status,

                CASE 
                    WHEN (${hba_numeric}) < 7.0 THEN 'CONTROLLED'
                    WHEN (${hba_numeric}) BETWEEN 7.0 AND 9.0 THEN 'MODERATELY CONTROLLED'
                    WHEN (${hba_numeric}) > 9.0 THEN 'UNCONTROLLED'
                    ELSE 'NOT EVALUATED'
                END AS control_status

            FROM public.patient_master p
            LEFT JOIN LatestVisitData lvd ON p.patient_id = lvd."PatientID"
            LEFT JOIN PreviousVisitData pv ON p.patient_id = pv."PatientID"
            LEFT JOIN LatestOrder lo ON p.patient_id = lo."PatientID"
            LEFT JOIN public.provider_master pr ON lo."OrderedBy" = pr."provider_id"
            LEFT JOIN public.clinic_master cm ON pr.clinic_id = cm.clinic_id
            LEFT JOIN public.site_master sm ON cm.site_id = sm.site_id
            LEFT JOIN public.hospital_master hm ON sm.hospital_id = hm.hospital_id`;

        const values = [];
        let whereClauses = ["WHERE 1=1"];

        // User's allotted sites filter (non-admin users only)
        if (allottedSites && allottedSites.length > 0) {
            const siteList = allottedSites.map(s => `'${s}'`).join(', ');
            whereClauses.push(`sm.site_name IN (${siteList})`);
        }

        // Consultant Filter
        if (consultant && !['All', 'All Consultants'].includes(consultant)) {
            values.push(consultant);
            whereClauses.push(`pr.provider_name = $${values.length}`);
        }

        // Site Filter
        if (site && !['All', 'All Sites'].includes(site)) {
            values.push(site);
            whereClauses.push(`sm.site_name = $${values.length}`);
        }

        // Diabetic Status Filter
        if (status && !['All', 'All Statuses'].includes(status)) {
            const s = status.toLowerCase();
            if (s.includes('pre') || s.includes('prob')) {
                whereClauses.push(`((${hba_numeric}) BETWEEN 5.7 AND 6.4)`);
            } else if (s.includes('diabetic')) {
                whereClauses.push(`((${hba_numeric}) >= 6.5 OR (${fbs_numeric}) >= 126)`);
            } else {
                whereClauses.push(`((${hba_numeric}) < 5.7 AND ((${fbs_numeric}) < 126 OR (${fbs_numeric}) IS NULL))`);
            }
        }

        // Search Filter
        if (search) {
            values.push(`%${search}%`);
            whereClauses.push(`(p.patient_name ILIKE $${values.length} OR p.uhid_display ILIKE $${values.length})`);
        }

        // Gender Filter (Using your specific Male UUID)
        const MALE_UUID = 'dc865974-eef7-41ce-bba8-54dd43035e55';
        if (gender && !['All', 'All Genders'].includes(gender)) {
            const g = gender.toLowerCase();
            if (g === 'male' || g === 'm') {
                whereClauses.push(`p.gender_id = '${MALE_UUID}'`);
            } else if (g === 'female' || g === 'f') {
                whereClauses.push(`p.gender_id != '${MALE_UUID}'`);
            }
        }

        // Control Status Filter
        if (control && !['All', 'All Categories'].includes(control)) {
            const c = control.toLowerCase();
            // Check for uncontrol FIRST because "uncontrolled" contains "controlled"
            if (c.includes('uncontrol')) {
                whereClauses.push(`(${hba_numeric}) > 9.0`);
            } else if (c.includes('moderate')) {
                whereClauses.push(`(${hba_numeric}) BETWEEN 7.0 AND 9.0`);
            } else if (c.includes('controlled')) {
                whereClauses.push(`(${hba_numeric}) < 7.0`);
            } else if (c.includes('not') && c.includes('evalu')) {
                whereClauses.push(`lvd.hba1c IS NULL`);
            }
        }

        // Cholesterol Filter
        if (cholesterol && !['All', 'All Levels'].includes(cholesterol)) {
            if (cholesterol === 'Normal') {
                whereClauses.push(`(lvd.cholesterol IS NULL OR (${chol_numeric}) < 200)`);
            } else if (cholesterol === 'Borderline') {
                whereClauses.push(`(${chol_numeric}) >= 200 AND (${chol_numeric}) < 240`);
            } else if (cholesterol === 'High') {
                whereClauses.push(`(${chol_numeric}) >= 240`);
            }
        }

        // Age Filter
        if (age && !['All', 'All Ages'].includes(age)) {
            if (age.includes('-')) {
                const [min, max] = age.split('-').map(Number);
                whereClauses.push(`(${age_numeric}) BETWEEN ${min} AND ${max}`);
            } else if (age.endsWith('+')) {
                whereClauses.push(`(${age_numeric}) >= ${parseInt(age)}`);
            }
        }

        const finalQuery = query + " " + whereClauses.join(" AND ");
        const result = await db.query(finalQuery, values);
        res.status(200).json(result.rows);

    } catch (error) {
        console.error("Registry Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 2. Fetch multiple visit records for the SELECTED patient (Fixes the Export Error)
export const getPatientHistory = async (req, res) => {
    try {
        const { id } = req.params; 
        const query = `
            WITH ClinicalHistoryPivot AS (
                SELECT 
                    "PatientID",
                    "Observation_Date",
                    MAX(CASE WHEN "LOINCCode" = '4548-4' THEN "Value" END) AS hba1c,
                    MAX(CASE WHEN "LOINCCode" = '13457-7' THEN "Value" END) AS ldl,
                    MAX(CASE WHEN "LOINCCode" = '2085-9' THEN "Value" END) AS hdl,
                    MAX(CASE WHEN "LOINCCode" = '2093-3' THEN "Value" END) AS cholesterol,
                    MAX(CASE WHEN "LOINCCode" = '1558-6' THEN "Value" END) AS fbs,
                    MAX(CASE WHEN "LOINCCode" = '1521-0' THEN "Value" END) AS ppbs,
                    MAX(CASE WHEN "LOINCCode" = '2571-8' THEN "Value" END) AS tg
                FROM public.lab_observation
                WHERE "PatientID" = $1
                GROUP BY "PatientID", "Observation_Date"
            ),
            VisitProviders AS (
                -- Link each visit date to the provider who ordered the tests
                SELECT DISTINCT ON (lo."PatientID", lo."OrderDate"::date)
                    lo."PatientID", 
                    lo."OrderDate"::date as order_date, 
                    lo."OrderedBy"
                FROM public.lab_order lo
                WHERE lo."PatientID" = $1
                ORDER BY lo."PatientID", lo."OrderDate"::date, lo."OrderDate" DESC
            )
            SELECT 
                p.patient_name, 
                p.patient_id, 
                p.uhid_display AS "UHID", -- Matches frontend 'latest.UHID'
                p.age, 
                p.gender_id,
                sm.site_name, 
                cm.clinic_name, 
                pr.provider_name,
                chp."Observation_Date" AS visit_date,
                chp.hba1c, chp.ldl, chp.hdl, chp.cholesterol, chp.fbs, chp.ppbs, chp.tg,
                -- Added Control Status Logic for History
                CASE 
                    WHEN (NULLIF(substring(chp.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) < 7.0 THEN 'CONTROLLED'
                    WHEN (NULLIF(substring(chp.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) BETWEEN 7.0 AND 9.0 THEN 'MODERATELY CONTROLLED'
                    WHEN (NULLIF(substring(chp.hba1c::text from '([0-9]+\\.?[0-9]*)'), '')::numeric) > 9.0 THEN 'UNCONTROLLED'
                    ELSE 'NOT EVALUATED'
                END AS control_status
            FROM public.patient_master p
            JOIN ClinicalHistoryPivot chp ON p.patient_id = chp."PatientID"
            LEFT JOIN VisitProviders vp ON p.patient_id = vp."PatientID" AND chp."Observation_Date"::date = vp.order_date
            LEFT JOIN public.provider_master pr ON vp."OrderedBy" = pr."provider_id"
            LEFT JOIN public.clinic_master cm ON pr.clinic_id = cm.clinic_id
            LEFT JOIN public.site_master sm ON cm.site_id = sm.site_id
            WHERE p.patient_id = $1
            ORDER BY visit_date DESC;
        `;
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No history found" });
        }
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("History Fetch Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};