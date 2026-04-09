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
        
        // Use dashboardData from props (same as before)
        const payload = {
            total_patients: dashboardData?.totalPatients || 0,
            diabetic_population: dashboardData?.diabeticCount || 0,
            prevalence_rate: dashboardData?.prevalence || 0,
            avg_frequency: dashboardData?.avgFrequency || 0
        };

        try {
            const response = await fetch('http://localhost:5000/api/stats/generate-ai-summary', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ dashboardData: payload }),
            });
            
            const data = await response.json();
            
            if (!response.ok) throw new Error(data.error || data.message || `Error ${response.status}`);
            
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
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-widest">AI Clinical Insights</h2>
                </div>
                <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl text-xs font-bold text-blue-600 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    {loading ? 'Consulting...' : 'Generate Insights'}
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-xs mb-4 border border-red-100">
                    <AlertCircle size={14} /> <span>{error}</span>
                </div>
            )}

            {analysis ? (
                <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line bg-white/60 p-5 rounded-xl border border-white">
                    {analysis}
                </div>
            ) : (
                <p className="text-xs text-slate-500 italic">Click generate to receive a clinical overview of the filtered data.</p>
            )}
        </div>
    );
};

export default AISummary;