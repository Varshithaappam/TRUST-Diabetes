import React, { useEffect, useState } from 'react';
import { fetchRegistry, fetchPatientHistory } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- HELPER: HbA1c Diagnosis Logic ---
const getDiagnosis = (hba1c, fbs) => {
    // Ensure we handle strings, nulls, or undefined by parsing to float
    // We use isNaN check to ensure we are comparing valid numbers
    const a1cVal = hba1c ? parseFloat(hba1c) : null;
    const fbsVal = fbs ? parseFloat(fbs) : null;

    const hasA1c = a1cVal !== null && !isNaN(a1cVal);
    const hasFbs = fbsVal !== null && !isNaN(fbsVal);

    // 1. DIABETES (Highest Severity)
    // Criteria: HbA1c >= 6.5 OR FBS >= 126
    if ((hasA1c && a1cVal >= 6.5) || (hasFbs && fbsVal >= 126)) {
        return { 
            label: 'DIABETES', 
            style: 'text-rose-600 bg-rose-50 border-rose-100' 
        };
    }

    // 2. PREDIABETES
    // Criteria: HbA1c 5.7 - 6.4 OR FBS 100 - 125
    else if ((hasA1c && a1cVal >= 5.7) || (hasFbs && fbsVal >= 100)) {
        return { 
            label: 'PREDIABETES', 
            style: 'text-amber-600 bg-amber-50 border-amber-100' 
        };
    }

    // 3. NORMAL
    // Criteria: Both values are below prediabetic thresholds
    else if (hasA1c || hasFbs) {
        return { 
            label: 'NORMAL', 
            style: 'text-emerald-600 bg-emerald-50 border-emerald-100' 
        };
    }

    // 4. NO DATA
    return { label: '--', style: 'text-black border-transparent' };
};

// --- COMPONENT: Individual Frequency Fetcher ---
const FrequencyCell = ({ patientId }) => {
    const [freq, setFreq] = useState('...');

    useEffect(() => {
        const getFreq = async () => {
            try {
                const history = await fetchPatientHistory(patientId);
                if (history && history.length > 1) {
                    const dates = history
                        .map(h => new Date(h.visit_date).getTime())
                        .sort((a, b) => b - a);

                    const gaps = [];
                    for (let i = 0; i < dates.length - 1; i++) {
                        gaps.push((dates[i] - dates[i+1]) / (1000 * 60 * 60 * 24));
                    }
                    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
                    setFreq(`${Math.round(avg)} Days`);
                } else {
                    setFreq('Single Visit');
                }
            } catch (e) {
                setFreq('--');
            }
        };
        getFreq();
    }, [patientId]);

    return <span className="font-black text-indigo-600 text-[13px] font-display-black">{freq}</span>;
};

// --- HELPER COMPONENT: Cholesterol Badge ---
const CholesterolBadge = ({ value }) => {
    if (!value) return <span className="text-black font-bold font-display-medium">--</span>;
    const num = parseFloat(value);
    let label = "NORMAL";
    let style = "bg-emerald-50 text-emerald-600 border-emerald-100";
    
    if (num >= 240) { label = "HIGH"; style = "bg-rose-50 text-rose-600 border-rose-100"; }
    else if (num >= 200) { label = "BORDERLINE"; style = "bg-amber-50 text-amber-600 border-amber-100"; }
    
    return (
        <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-black uppercase font-display-black ${style}`}>
            {label} ({num})
        </span>
    );
};

// --- HELPER COMPONENT: Status Badge ---
const StatusBadge = ({ status }) => {
    const styles = {
        'CONTROLLED': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'MODERATELY CONTROLLED': 'bg-amber-50 text-amber-600 border-amber-100',
        'UNCONTROLLED': 'bg-rose-50 text-rose-600 border-rose-100'
    };
    return (
        <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-black uppercase tracking-tighter font-electronic-bold ${styles[status] || 'bg-slate-50 text-black border-slate-100'}`}>
            {status || 'N/A'}
        </span>
    );
};

// --- MODAL COMPONENT ---
const PatientDetailsModal = ({ history, onClose }) => {
    if (!history || history.length === 0) return null;

    // 1. Sort history: Table gets descending (newest first), Chart gets ascending (chronological)
    const sortedHistory = [...history].sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date));
    const latest = sortedHistory[0]; 

    const chartData = [...sortedHistory]
        .reverse() 
        .map(v => {
            const dateObj = new Date(v.visit_date);
            return {
                date: `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getFullYear()).slice(-2)}`,
                hba1c: v.hba1c ? parseFloat(v.hba1c) : null,
                ldl: v.ldl ? parseFloat(v.ldl) : null,
                total_cholesterol: v.cholesterol ? parseFloat(v.cholesterol) : null
            };
        });

    // 2. Dynamic Width Logic:
    // We calculate width based on data points. 
    // If there are > 12 visits, we expand the chart width to ensure dates don't overlap.
    const chartWidth = Math.max(100, chartData.length * 3); 

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* HEADER */}
                <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 font-display-medium">{latest.patient_name}</h2>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                            {latest.UHID || 'REG-ID'} • {latest.age}Y • {latest.gender_id === 'dc865974-eef7-41ce-bba8-54dd43035e55' ? 'M' : 'F'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-rose-500 text-3xl transition-colors">&times;</button>
                </div>

                {/* MAIN SCROLLABLE AREA */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
                    
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-6 mb-10">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Clinic / Site</p>
                            <p className="text-sm font-bold text-slate-900 leading-tight">{latest.site_name}</p>
                            <p className="text-[11px] text-indigo-600 font-bold">{latest.clinic_name}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Diagnosis</p>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getDiagnosis(latest.hba1c, latest.fbs).style}`}>
                                {getDiagnosis(latest.hba1c, latest.fbs).label}
                            </span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Control Status</p>
                            <StatusBadge status={latest.control_status} />
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Cholesterol</p>
                            <CholesterolBadge value={latest.cholesterol} />
                        </div>
                    </div>

                    {/* CHART SECTION WITH INDEPENDENT HORIZONTAL SCROLL */}
                    <div className="mb-12">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Clinical Trends (All Visits)</h3>
                        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
                            {/* This div handles the horizontal scroll for the chart only */}
                            <div className="overflow-x-auto">
                                <div style={{ width: `${chartWidth}%`, minWidth: '100%', height: '350px' }} className="p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData} margin={{ bottom: 50, left: 0, right: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis 
                                                dataKey="date" 
                                                fontSize={10} 
                                                tickLine={false} 
                                                axisLine={false} 
                                                stroke="#0e0e0eff"
                                                fontWeight="bold"
                                                interval={0}        // FORCES ALL DATES TO SHOW
                                                angle={-45}        // VERTICAL LABELS
                                                textAnchor="end"   
                                                dy={10}             
                                            />
                                            <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" fontWeight="bold" />
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 'bold' }} />
                                            <Line type="monotone" dataKey="hba1c" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3, fill: '#f59e0b' }} name="HbA1c %" connectNulls={true} />
                                            <Line type="monotone" dataKey="total_cholesterol" stroke="#10b981" strokeWidth={3} dot={{ r: 3, fill: '#10b981' }} name="Total Chol" connectNulls={true} />
                                            <Line type="monotone" dataKey="ldl" stroke="#6366f1" strokeWidth={3} dot={{ r: 3, fill: '#6366f1' }} name="LDL" connectNulls={true} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TABLE SECTION */}
                    <div>
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Visit History Table</h3>
                        <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b text-[10px] font-black text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Visit Date</th>
                                        <th className="px-6 py-4">Consultant / Site</th>
                                        <th className="px-6 py-4 text-center">HbA1c</th>
                                        <th className="px-6 py-4 text-center">FBS / PPBS</th>
                                        <th className="px-6 py-4 text-center">CHOL / LDL</th>
                                    </tr>
                                </thead>
                                <tbody className="text-xs font-medium">
                                    {sortedHistory.map((visit, idx) => (
                                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900">
                                                {new Date(visit.visit_date).toLocaleDateString('en-GB').replace(/\//g, '-')}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                <div className="font-bold text-indigo-600 uppercase text-[10px]">{visit.provider_name}</div>
                                                <div className="text-[10px] opacity-70">{visit.site_name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-black text-slate-900">{visit.hba1c ? `${visit.hba1c}%` : '--'}</td>
                                            <td className="px-6 py-4 text-center text-slate-600">{visit.fbs || '--'} / {visit.ppbs || '--'}</td>
                                            <td className="px-6 py-4 text-center text-slate-600">{visit.cholesterol || '--'} / {visit.ldl || '--'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN REGISTRY COMPONENT ---
const PatientRegistry = ({ filters: externalFilters }) => {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedHistory, setSelectedHistory] = useState(null); 
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const getData = async () => {
            setLoading(true);
            try {
                const params = {
                    consultant: externalFilters?.consultant || 'All',
                    site: externalFilters?.site || 'All',
                    status: externalFilters?.diabetes || 'All',
                    control: externalFilters?.control || 'All',
                    gender: externalFilters?.gender || 'All',
                    // Only pass dates if they are valid (not empty)
                    ...(externalFilters?.startDate?.trim() && { startDate: externalFilters.startDate }),
                    ...(externalFilters?.endDate?.trim() && { endDate: externalFilters.endDate }),
                    cholesterol: externalFilters?.cholesterol || 'All',
                    age: externalFilters?.age || 'All',
                    search: externalFilters?.searchTerm || ''
                };

                const data = await fetchRegistry(params);
                setPatients(data || []);
            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        getData();
    }, [externalFilters]); // Only trigger when appliedFilters changes

    const handleOpenDetails = async (patientId) => {
        const history = await fetchPatientHistory(patientId);
        if (history) {
            setSelectedHistory(history);
            setIsModalOpen(true);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen font-black text-black uppercase text-[12px] tracking-widest font-electronic-bold">Initialising Registry...</div>;

    return (
        <div className="bg-[#F9FAFB] min-h-screen font-electronic-regular text-black">
            <main className="max-w-[98%] mx-auto py-8 px-4">
                <div className="bg-white rounded-lg shadow-lg shadow-indigo-100 border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center bg-white">
                        <h2 className="font-black text-xs text-black uppercase tracking-wider font-electronic-bold">Patient Master Registry</h2>
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-tighter font-electronic-bold">
                             Records: {patients.length}
                        </span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1300px]">
                            <thead className="bg-slate-50/50 border-b text-[12px] font-bold text-black uppercase tracking-widest font-electronic-regular">
                                <tr>
                                    <th className="px-6 py-5 w-[18%]">Patient Name</th>
                                    <th className="px-4 py-5 w-[12%]">Visit Date / Consultant</th>
                                    <th className="px-4 py-5 text-center w-[6%]">HbA1c</th>
                                    <th className="px-4 py-5 text-center w-[6%]">FBS</th>
                                    <th className="px-4 py-5 text-center w-[10%]">Diagnosis</th>
                                    <th className="px-4 py-5 text-center w-[8%]">LDL/HDL</th>
                                    <th className="px-4 py-5 w-[12%]">Cholesterol</th>
                                    <th className="px-4 py-5 text-center w-[8%]">Avg. Visit Frequency</th>
                                    <th className="px-5 py-5 w-[8%]">Control</th>
                                    <th className="px-6 py-5 text-right w-[5%]">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm bg-white font-noto-serif">
                                {patients.map((p, i) => {
                                    const diag = getDiagnosis(p.hba1c, p.fbs);
                                    return (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-black leading-tight font-electronic-bold">{p.patient_name}</div>
                                                <div className="text-[12px] text-black mt-1 uppercase font-bold tracking-tighter font-electronic-regular">
                                                    {p.age}Y <span className="text-slate-200">|</span> {p.uhid_display || '---'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-5">
                                                <div className="text-[13px] font-bold text-black font-electronic-regular"> 
                                                    {new Date(p.latest_visit_date || p.visit_date).toLocaleDateString()}
                                                </div>
                                                <div className="text-[11px] text-indigo-500 mt-1 uppercase font-black tracking-tighter font-electronic-bold">
                                                    {p.provider_name || 'No Provider'}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-5 text-center font-medium font-electronic-regular ${
                                                p.hba1c && parseFloat(p.hba1c) >= 9 ? 'text-rose-600 font-black' : 'text-black'
                                            }`}>
                                                {p.hba1c ? `${p.hba1c}%` : '--'}
                                            </td>
                                            <td className={`px-4 py-5 text-center font-medium font-electronic-regular ${
                                                p.fbs && parseFloat(p.fbs) >= 126 ? 'text-rose-600 font-black' : 'text-black'
                                            }`}>
                                                {p.fbs ? p.fbs : '--'}
                                            </td>
                                            <td className="px-4 py-5 text-center">
                                                <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-black font-electronic-bold ${diag.style}`}>{diag.label}</span>
                                            </td>
                                            <td className="px-4 py-5 text-center font-medium text-black font-electronic-regular">{p.ldl || '--'}/{p.hdl || '--'}</td>
                                            <td className="px-4 py-5"><CholesterolBadge value={p.cholesterol} /></td>
                                            <td className="px-4 py-5 text-center">
                                                <FrequencyCell patientId={p.patient_id} />
                                            </td>
                                            <td className="px-8 py-5"><StatusBadge status={p.control_status} /></td>
                                            <td className="px-6 py-5 text-right">
                                                <button 
                                                    onClick={() => handleOpenDetails(p.patient_id)} 
                                                    className="text-indigo-600 font-black text-[12px] uppercase tracking-widest hover:text-indigo-800 font-electronic-bold"
                                                >
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {isModalOpen && selectedHistory && (
                <PatientDetailsModal history={selectedHistory} onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
};

export default PatientRegistry;