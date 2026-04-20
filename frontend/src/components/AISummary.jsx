    import React, { useState, useEffect } from 'react';
    import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
    import { useAuth } from '../context/AuthContext';

    const AISummary = ({ dashboardData }) => {
        const { token } = useAuth();
        const [analysis, setAnalysis] = useState("");
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState(null);

        const handleGenerate = async () => {
            if (!token) {
                setError("You are not logged in. Please login first.");
                return;
            }
            
            setLoading(true);
            setError(null);
            
            // Use dashboardData from props - map field names to what AI controller expects
            const payload = {
                // Map camelCase to snake_case for the AI controller
                total_patients: dashboardData?.totalPatients ?? dashboardData?.total_patients ?? 0,
    diabetic_population: dashboardData?.diabeticPopulation ?? dashboardData?.diabetic_population ?? 0,
    prevalence_rate: dashboardData?.prevalenceRate ?? dashboardData?.prevalence_rate ?? 0,
    avg_frequency: dashboardData?.avgFrequency ?? dashboardData?.avg_frequency ?? 0,
                
                // Distribution data for control status
                distribution: Array.isArray(dashboardData?.distribution) 
                    ? dashboardData.distribution.map(d => ({
                        status: d.status,
                        cnt: d.cnt
                    })) 
                    : [],
                
                // Consultants data
                consultants: Array.isArray(dashboardData?.consultants) 
                    ? dashboardData.consultants.map(c => ({
                        name: c.name || c.consultant_name,
                        count: c.count || c.value || 0
                    })) 
                    : [],
                
                // Site performance data
                sites: Array.isArray(dashboardData?.sites) 
                    ? dashboardData.sites.map(s => ({
                        site: s.site,
                        controlled: s.controlled || 0,
                        moderate: s.moderate || 0,
                        uncontrolled: s.uncontrolled || 0
                    })) 
                    : [],
                
                // Demographics data
                demographics: dashboardData?.demographics || {},
                
                // Gender distribution
                gender: Array.isArray(dashboardData?.gender) 
                    ? dashboardData.gender.map(g => ({
                        gender_id: g.gender_id,
                        cnt: g.cnt
                    })) 
                    : [],
                
                // Lab trends
                labTrends: dashboardData?.labTrends || [],
                
                // Site trends
                siteTrends: dashboardData?.siteTrends || [],
                
                // Critical cases
                criticalCases: dashboardData?.criticalCases || []
            };

            console.log('=== AISummary Debug ===');
            console.log('Input dashboardData:', JSON.stringify(dashboardData, null, 2));
            console.log('Payload to API:', JSON.stringify(payload, null, 2));

            try {
                const response = await fetch('/api/stats/generate-ai-summary', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ dashboardData: payload }),
                });
                
                const data = await response.json();
                
                if (!response.ok) throw new Error(data.error || data.message || `Error ${response.status}`);
                
                console.log('=== AISummary API Response ===');
                console.log('Status:', response.status);
                console.log('Response data:', JSON.stringify(data, null, 2));
                
                setAnalysis(data.analysis);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-blue-600" size={20} />
                        <h2 className="text-lg font-black text-black uppercase tracking-widest font-anvier">AI Clinical Insights</h2>
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center gap-2 bg-white px-5 py-3 rounded-xl text-sm font-anvier"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Consulting...' : 'GENERATE INSIGHTS'}
                    </button>
                </div>

                {error && (
                    <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-xs mb-4 border border-red-100">
                        <AlertCircle size={14} /> <span>{error}</span>
                    </div>
                )}

                {analysis ? (
                    <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line bg-white/60 p-5 rounded-xl border font-electronic-regular">
                        {analysis}
                    </div>
                ) : (
                    <p className="text-lg font-bold text-slate-700 italic font-display-bold">Click generate to receive a clinical overview of the filtered data.</p>
                )}
            </div>
        );
    };

    export default AISummary;
