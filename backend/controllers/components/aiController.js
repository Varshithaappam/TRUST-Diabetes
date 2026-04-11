import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateAIAnalysis = async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Server configuration error: GEMINI_API_KEY is missing on this server." });
        }

        const { dashboardData } = req.body;

        // Debug: Log what we received
        console.log('=== AI Controller Debug ===');
        console.log('Received dashboardData:', JSON.stringify(dashboardData, null, 2));

        // Validate we have data to analyze
        if (!dashboardData) {
            return res.status(400).json({ error: "Missing dashboard data. Please refresh the dashboard and try again." });
        }

        const totalPatients = dashboardData?.total_patients ?? dashboardData?.totalPatients ?? 0;
        const diabeticPopulation = dashboardData?.diabetic_population ?? dashboardData?.diabeticPopulation ?? 0;
        const prevalenceRate = dashboardData?.prevalence_rate ?? dashboardData?.prevalenceRate ?? 0;
        const avgFrequency = dashboardData?.avg_frequency ?? dashboardData?.avgFrequency ?? 0;
        
        console.log('Extracted values:', { totalPatients, diabeticPopulation, prevalenceRate, avgFrequency });

        // Distribution data (control status)
        const distribution = dashboardData?.distribution || [];
        const controlled = distribution.find(d => d.status === 'CONTROLLED')?.cnt || 0;
        const moderate = distribution.find(d => d.status === 'MODERATELY CONTROLLED')?.cnt || 0;
        const uncontrolled = distribution.find(d => d.status === 'UNCONTROLLED')?.cnt || 0;
        
        // Trends data
        const trends = dashboardData?.trends || [];
        
        // Consultant load
        const consultants = dashboardData?.consultants || [];
        
        // Site performance
        const sites = dashboardData?.sites || [];
        
        // Demographics
        const demographics = dashboardData?.demographics || {};
        
        // Gender distribution
        const gender = dashboardData?.gender || [];
        
        // Lab trends
        const labTrends = dashboardData?.labTrends || [];
        
        // Site trends
        const siteTrends = dashboardData?.siteTrends || [];
        
        // Critical cases
        const criticalCases = dashboardData?.criticalCases || [];

        // Initialize the model
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        // Create the detailed prompt with all dashboard data
        const prompt = `
Act as a Senior Clinical Data Consultant specializing in metabolic health. Analyze the following metrics from the TRUST Diabetes Healthcare Registry to provide a high-level executive summary for stakeholders:

Dashboard Metrics:

Total Patients: ${totalPatients}
Diabetic Population: ${diabeticPopulation}
Prevalence Rate: ${prevalenceRate}%
Avg. Visit Frequency: ${avgFrequency} visits per patient

Clinical Distribution: ${controlled} Controlled, ${moderate} Moderate, ${uncontrolled} Uncontrolled

Consultant Load (Top 5): ${consultants.slice(0, 5).map(c => `${c.name}: ${c.count} patients`).join(', ') || 'N/A'}

Site Performance: ${sites.slice(0, 3).map(s => `${s.site}: ${s.controlled} controlled, ${s.moderate} moderate, ${s.uncontrolled} uncontrolled`).join('; ') || 'N/A'}

Demographics: 30-40: ${demographics['30-40'] || 0}, 41-50: ${demographics['41-50'] || 0}, 51-60: ${demographics['51-60'] || 0}, 61-70: ${demographics['61-70'] || 0}, 71+: ${demographics['71+'] || 0}

Gender Distribution: ${gender.map(g => `${g.gender_id === 'dc865974-eef7-41ce-bba8-54dd43035e55' ? 'Male' : 'Female'}: ${g.cnt}`).join(', ') || 'N/A'}

Critical Cases: ${criticalCases.length} patients

Analysis Requirements:

Paragraph 1: Population Assessment. Interpret the ${prevalenceRate}% prevalence rate within this specific cohort. Does this indicate a high-risk specialty clinic or a need for broader screening protocols?

Paragraph 2: Engagement & Utilization. Evaluate the visit frequency (${avgFrequency}). Is this indicative of high-touch effective chronic disease management, or does it signal potential inefficiencies in clinical workflows?

Paragraph 3: Strategic Clinical Outlook. Based on the control distribution (${controlled} controlled vs ${moderate + uncontrolled} non-controlled), provide one strategic recommendation for improving patient outcomes for the 'Uncontrolled' segment.

Strict Formatting Rules:

Tone: Professional, objective, and consultative.

Constraints: Use clean plain text only. Do NOT use markdown (no bolding, no stars, no bullet points, no hashtags).

Structure: Exactly three cohesive paragraphs.
        `.trim();

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return res.json({ analysis: response.text().replace(/[*#]/g, '').trim() });
        } catch (providerErr) {
            console.error('Google Generative API error:', providerErr);
            const errorMessage = providerErr?.message || String(providerErr);
            
            if (errorMessage.includes('retryDelay') || providerErr?.status === 429) {
                return res.status(429).json({ error: 'AI service is temporarily busy. Please wait and try again.' });
            }
            if (errorMessage.includes('API_KEY') || errorMessage.includes('API key') || providerErr?.status === 401) {
                return res.status(401).json({ error: 'Invalid or expired API key.' });
            }
            return res.status(502).json({ error: 'AI service temporarily unavailable', details: errorMessage });
        }

    } catch (error) {
        console.error("AI Controller unexpected error:", error);
        res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
};
