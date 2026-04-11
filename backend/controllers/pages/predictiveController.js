import { GoogleGenAI } from "@google/genai";
import db from '../../config/db.js';

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

/**
 * Get user's allotted sites based on their role
 */
const getUserAllottedSites = async (userId, userRole) => {
    if (!userId) return [];
    
    // If Administrator, return null (no filtering)
    if (userRole === 'Administrator') {
        return null;
    }
    
    // For Analyst/Clinician, get their allotted sites
    const result = await db.query(
        `SELECT sm.site_name 
         FROM site_master sm
         JOIN user_site_mapping usm ON sm.site_id = usm.site_id
         WHERE usm.user_id = $1 AND sm.site_name IS NOT NULL
         ORDER BY sm.site_name`,
        [userId]
    );
    
    return result.rows.map(r => r.site_name);
};

export const generatePrognosis = async (req, res) => {
    try {
        const { patientId } = req.body;
        
        if (!patientId) {
            return res.status(400).json({ error: "Patient ID is required" });
        }
        
        // Get user info for site-based filtering
        const userId = req.user?.id;
        const userRole = req.user?.role;
        
        // Get user's allotted sites
        const allottedSites = await getUserAllottedSites(userId, userRole);
        
        // For non-admin users, verify the patient belongs to their allotted sites
        // For non-admin users, verify the patient belongs to their allotted sites
if (allottedSites && allottedSites.length > 0) {
    const patientCheck = await db.query(
        `SELECT sm.site_name 
         FROM public.patient_master p
         JOIN public.lab_order lo ON p.patient_id = lo."PatientID"
         JOIN public.provider_master pr ON lo."OrderedBy" = pr.provider_id
         JOIN public.clinic_master cm ON pr.clinic_id = cm.clinic_id
         JOIN public.site_master sm ON cm.site_id = sm.site_id
         WHERE p.patient_id::text = $1::text 
         AND sm.site_name = ANY($2::text[])`, 
        [patientId, allottedSites] // Pass the array directly as $2
    );
    
    if (patientCheck.rows.length === 0) {
        return res.status(403).json({ error: "Access denied: Patient not in your allotted sites" });
    }
}

        console.log("Generating prognosis for patient:", patientId);

        // 1. Fetch ALL History first to find latest visit date
        const allHistory = await db.query(
            `SELECT "Observation_Date", "Value", "LOINCCode" 
             FROM public.lab_observation 
             WHERE "PatientID" = $1 AND "LOINCCode" IN ('4548-4', '13457-7', '2093-3', '1558-6')
             ORDER BY "Observation_Date" DESC LIMIT 100`, 
            [patientId]
        );

        console.log("Fetched history rows:", allHistory.rows.length);

        if (allHistory.rows.length === 0) {
            return res.json({ analysis: "No clinical data available for this patient to generate prognosis." });
        }

        // Find the latest visit date from patient's actual data
        let latestVisitDate = new Date();
        const dates = allHistory.rows
            .map(r => new Date(r.Observation_Date))
            .filter(d => !isNaN(d.getTime()));
        if (dates.length > 0) {
            latestVisitDate = new Date(Math.max(...dates));
        }

        // Calculate 6 months back from the latest visit date
        const sixMonthsAgo = new Date(latestVisitDate);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // Filter to last 6 months from patient's latest visit
        const filteredHistory = allHistory.rows.filter(r => {
            const obsDate = new Date(r.Observation_Date);
            return obsDate >= sixMonthsAgo && obsDate <= latestVisitDate;
        });

        console.log("Filtered history (6 months):", filteredHistory.length);

        // 2. Organize data by date for clinical context
        const clinicalData = {};
        filteredHistory.forEach(r => {
            const dateKey = r.Observation_Date.toISOString().split('T')[0];
            if (!clinicalData[dateKey]) {
                clinicalData[dateKey] = {};
            }
            if (r.LOINCCode === '4548-4') clinicalData[dateKey].hba1c = r.Value;
            if (r.LOINCCode === '13457-7') clinicalData[dateKey].ldl = r.Value;
            if (r.LOINCCode === '2093-3') clinicalData[dateKey].cholesterol = r.Value;
            if (r.LOINCCode === '1558-6') clinicalData[dateKey].fbs = r.Value;
        });

        // 3. Prepare context for AI
        const patientContext = Object.entries(clinicalData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vals]) => `${date}: HbA1c=${vals.hba1c || '-'}, LDL=${vals.ldl || '-'}, FBS=${vals.fbs || '-'}`)
            .join(' | ');

        console.log("Patient context:", patientContext);

        const systemInstruction = `You are an advanced medical AI assistant for a diabetes registry.
            Task: Forecast the health trajectory for this patient over the next 6 months.
            
            Based on the historical trends (especially HbA1c stability and lipids), please provide:
            1. Prognosis: A clear statement on whether the patient is likely to stabilize, improve, or deteriorate.
            2. Predicted HbA1c Range: Estimate the likely HbA1c range in 6 months if current trends continue.
            3. Key Risk Factors: Identify the top 2-3 specific clinical risks for this patient.
            4. Recommended Interventions: Suggest 3 prioritized clinical or lifestyle actions to mitigate these risks.
            
            Output using Markdown formatting. Be concise and clinical.`;

        const prompt = `Patient History (Last 6 months - Date: Values): ${patientContext || 'No recent data available'}. 

        Provide a detailed 6-month health trajectory forecast including prognosis, predicted HbA1c range, key risk factors, and recommended interventions.`;

        console.log("Calling Gemini API...");
        
        // Use gemini-2.5-flash which is stable
        const response = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            systemInstruction: systemInstruction
        });
        
        
        res.json({ analysis: response.text });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Analysis failed: " + error.message });
    }
};