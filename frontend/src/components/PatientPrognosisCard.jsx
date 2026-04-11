import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const PatientPrognosisCard = ({ patient, visits = [], isLoadingVisits = false }) => {
    const [loading, setLoading] = useState(false);
    const [prognosis, setPrognosis] = useState(null);

    // Calculate risk score locally from patient data (using prev_hba1c from backend)
    const riskData = useMemo(() => {
        if (!patient) return { riskScore: 0, riskLabel: 'N/A', trend: 'stable' };

        const hba1c = parseFloat(patient.hba1c) || 0;
        const prevHba1c = parseFloat(patient.prev_hba1c) || 0;
        const ldl = parseFloat(patient.ldl) || 0;
        
        // If no HbA1c, return N/A
        if (!patient.hba1c || patient.hba1c === null || patient.hba1c === undefined || isNaN(hba1c) || hba1c === 0) {
            return { riskScore: 0, riskLabel: 'N/A', trend: 'stable' };
        }
        
        let score = 0;
        
        // HbA1c factors
        if (hba1c) {
            if (hba1c > 9.0) score += 40;
            else if (hba1c > 7.5) score += 20;
            else if (hba1c > 6.5) score += 10;
        }

        // Trend Factor - Use prev_hba1c from backend
        let trend = 'stable';
        if (hba1c && prevHba1c) {
            const diff = hba1c - prevHba1c;
            if (diff > 0.5) {
                score += 25;
                trend = 'deteriorating';
            } else if (diff < -0.5) {
                score -= 10;
                trend = 'improving';
            }
        }

        // LDL Factor
        if (ldl > 130) score += 15;

        // Age Factor
        if (patient.age > 65) score += 10;

        // Classification
        let label = 'N/A';
        if (hba1c && hba1c > 0) {
            if (score >= 50) label = 'High';
            else if (score >= 30) label = 'Medium';
            else label = 'Low';
        }

        return { riskScore: score, riskLabel: label, trend };
    }, [patient]);

    const generatePrediction = async () => {
        setLoading(true);
        setPrognosis(null);
        try {
            const patientId = patient.patient_id || patient.patientId || patient.uhid;
            console.log("Sending prognosis request for:", patientId);
            const res = await axios.post('/api/predictive/generate-prognosis', { patientId });
            console.log("Prognosis response:", res.data);
            setPrognosis(res.data.analysis);
        } catch (err) {
            console.error("AI Error:", err);
            setPrognosis("Error generating prognosis: " + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Reset prognosis when patient changes
    useEffect(() => { setPrognosis(null); }, [patient]);

    // Prepare chart data from visits prop (last 1 year of patient history)
    const chartData = useMemo(() => {
        // Use visits passed from parent (filtered to last 1 year)
        if (visits && visits.length > 0) {
            return [...visits].reverse().map(v => ({
                date: v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-IN', { 
                    day: '2-digit', 
                    month: 'short', 
                    year: '2-digit' 
                }) : 'N/A',
                val: parseFloat(v.hba1c) || 0
            })).filter(d => d.val > 0);
        }
        
        // Fallback: create data points from current and previous hba1c
        const data = [];
        if (patient?.prev_hba1c) {
            data.push({ date: 'Previous', val: parseFloat(patient.prev_hba1c) });
        }
        if (patient?.hba1c) {
            data.push({ date: 'Current', val: parseFloat(patient.hba1c) });
        }
        return data;
    }, [visits, patient]);

    const patientId = patient.patient_id || patient.patientId || patient.uhid;
    const patientName = patient.patient_name || patient.name;
    const gender = patient.gender_id === 'dc865974-eef7-41ce-bba8-54dd43035e55' ? 'Male' : 'Female';

    return (
        <div className="p-8">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-800">{patientName}</h2>
                    <p className="text-slate-400 font-bold uppercase text-xs">
                        {patient.uhid_display || patient.UHID || patient.uhid} | {patient.age} yrs | {gender} | {patient.site_name || patient.site}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[12px] font-bold text-slate-400 uppercase">Current Risk Score</p>
                    <p className={`text-3xl font-black ${
                        riskData.riskLabel === 'High' ? 'text-red-500' :
                        riskData.riskLabel === 'Medium' ? 'text-yellow-500' :
                        riskData.riskLabel === 'N/A' ? 'text-slate-400' :
                        'text-green-500'
                    }`}>
                        {riskData.riskScore} ({riskData.riskLabel})
                    </p>
                </div>
            </div>

            {/* HbA1c Trend Chart - Last 1 Year */}
            <div className="h-48 w-full bg-white border rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-bold text-slate-500 uppercase">HbA1c History (Last 1 Year)</p>
                    {isLoadingVisits && (
                        <span className="text-xs text-slate-400">Loading...</span>
                    )}
                </div>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                tick={{fontSize: 12}} 
                                interval="preserveStartEnd"
                            />
                            <YAxis 
                                domain={[4, 14]} 
                                tick={{fontSize: 12}}
                                tickFormatter={(value) => value.toFixed(1)}
                            />
                            <RechartsTooltip 
                                formatter={(value) => [`${value}%`, 'HbA1c']}
                                labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="val" 
                                stroke="#2563eb" 
                                strokeWidth={2} 
                                dot={{r: 4, fill: '#2563eb'}} 
                                name="HbA1c" 
                                connectNulls
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        {isLoadingVisits ? 'Loading visit history...' : 'No visit history available'}
                    </div>
                )}
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-dashed border-slate-200 min-h-[300px] flex flex-col items-center justify-center">
                {!prognosis && !loading ? (
                    <button 
                        onClick={generatePrediction}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                    >
                        🧠 Generate 6-Month AI Prognosis
                    </button>
                ) : loading ? (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-500 font-medium italic">Analyzing biomarkers and trend velocity...</p>
                    </div>
                ) : (
                    <div className="w-full text-slate-700 whitespace-pre-wrap leading-relaxed prose prose-slate">
                        <h4 className="flex items-center gap-2 text-indigo-600 font-bold mb-4 uppercase text-sm tracking-widest">
                            🧠 AI Prognosis (6-Month)
                        </h4>
                        {prognosis}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientPrognosisCard;