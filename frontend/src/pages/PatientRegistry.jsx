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
    const latest = history[0]; 

    const chartData = [...history]
        .sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date))
        .map(v => ({
            date: new Date(v.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
            hba1c: v.hba1c ? parseFloat(v.hba1c) : null,
            ldl: v.ldl ? parseFloat(v.ldl) : null,
            total_cholesterol: v.cholesterol ? parseFloat(v.cholesterol) : null
        }));

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-lg shadow-indigo-100">
                <div className="p-8 border-b flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-medium font-display-medium">{latest.patient_name}</h2>
                        <p className="text-black font-bold uppercase tracking-tight text-xs mt-1 font-display-medium">
                            {latest.UHID || 'UHID-REG'} • {latest.age}Y • {latest.gender_id === 'dc865974-eef7-41ce-bba8-54dd43035e55' ? 'M' : 'F'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-black hover:text-slate-600 text-3xl">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-4 gap-8 mb-10">
                        <div>
                            <p className="text-[12px] font-bold text-black uppercase mb-1 font-display-medium">Clinic / Site</p>
                            <p className="font-bold text-black leading-tight font-display-medium">
                                {latest.site_name || 'N/A'} <br/> 
                                <span className="text-[12px] text-indigo-500">{latest.clinic_name || 'Private Consultation'}</span>
                            </p>
                        </div>
                        <div><p className="text-[12px] font-bold text-black uppercase mb-1 font-display-medium">Diagnosis</p>
                            <span className={`px-2 py-0.5 rounded-lg border text-[12px] font-black font-display-bold ${getDiagnosis(latest.hba1c).style}`}>{getDiagnosis(latest.hba1c).label}</span>
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-black uppercase mb-1 font-display-medium">Control Status</p>
                            <StatusBadge status={latest.control_status} />
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-black uppercase mb-1 font-display-medium">Total Cholesterol</p>
                            <CholesterolBadge value={latest.cholesterol} />
                        </div>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-8 mb-10 shadow-lg shadow-indigo-100">
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" fontSize={12} stroke="#cbd5e1" axisLine={false} tickLine={false} fontWeight="bold" />
                                    <YAxis yAxisId="left" stroke="#cbd5e1" fontSize={12} axisLine={false} tickLine={false} fontWeight="bold" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#cbd5e1" fontSize={12} axisLine={false} tickLine={false} fontWeight="bold" />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '14px' }} />
                                    <Legend iconType="circle" verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '25px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                    <Line yAxisId="right" type="monotone" dataKey="hba1c" stroke="#f59e0b" strokeWidth={1.5} name="HbA1c %" connectNulls={true} dot={{ r: 2.5, fill: '#f59e0b', strokeWidth: 0 }} />
                                    <Line yAxisId="left" type="monotone" dataKey="ldl" stroke="#6366f1" strokeWidth={1.5} name="LDL" connectNulls={true} dot={{ r: 2.5, fill: '#6366f1', strokeWidth: 0 }} />
                                    <Line yAxisId="left" type="monotone" dataKey="total_cholesterol" stroke="#10b981" strokeWidth={1.5} name="Total Chol" connectNulls={true} dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b text-[12px] font-bold text-black uppercase tracking-widest font-electronic-regular">
                            <tr>
                                <th className="pb-4">Date / Facility</th>
                                <th className="pb-4">Consultant</th>
                                <th className="pb-4 text-center">HbA1c</th>
                                <th className="pb-4 text-center">Glucose (FBS/PPBS)</th>
                                <th className="pb-4 text-center">LDL / HDL</th>
                                <th className="pb-4">CHOL / TG</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-black font-noto-serif">
                            {history.map((visit, idx) => (
                                <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4">
                                        <div className="font-bold font-display-medium">{new Date(visit.visit_date).toLocaleDateString()}</div>
                                        <div className="text-[11px] text-black font-medium uppercase tracking-tighter font-display-medium">
                                            {visit.site_name} | {visit.clinic_name}
                                        </div>
                                    </td>
                                    <td className="py-4 text-black font-medium font-display-medium">{visit.provider_name}</td>
                                    <td className="py-4 text-center font-medium font-display-medium">{visit.hba1c ? `${visit.hba1c}%` : '--'}</td>
                                    {/* Glucose Column */}
                                    <td className="py-4 text-center font-medium font-display-medium">
                                        {visit.fbs || '--'} / {visit.ppbs || '--'}
                                    </td>
                                    <td className="py-4 text-center font-medium font-display-medium">{visit.ldl || '--'} / {visit.hdl || '--'}</td>
                                    <td className="py-4 font-medium font-display-medium">{visit.cholesterol || '--'} / {visit.tg || '--'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                                            <td className="px-4 py-5 text-center font-medium text-black font-electronic-regular">{p.hba1c ? `${p.hba1c}%` : '--'}</td>
                                            <td className="px-4 py-5 text-center font-medium text-black font-electronic-regular">{p.fbs ? p.fbs : '--'}</td>
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