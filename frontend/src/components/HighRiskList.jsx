import React, { useMemo } from 'react';

// Trend Icons
const TrendingUpIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);
const TrendingDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
        <polyline points="17 18 23 18 23 12"></polyline>
    </svg>
);
const StableIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

// Filter Chip Component
const FilterChip = ({ label, onRemove }) => (
    <div className="flex items-center gap-1 bg-red-100 border border-red-300 px-2 py-1 rounded-full text-xs font-bold text-red-700">
        <span>{label}</span>
        <button onClick={onRemove} className="hover:bg-red-200 rounded-full w-4 h-4 flex items-center justify-center">×</button>
    </div>
);

const HighRiskList = ({ onSelect, selectedId, scoredPatients, riskFilter }) => {
    // Filter patients based on riskFilter
    const filteredCandidates = useMemo(() => {
        if (!scoredPatients || scoredPatients.length === 0) {
            return [];
        }
        
        // If no filter, show all patients sorted by risk
        if (!riskFilter) {
            return scoredPatients;
        }
        
        // Filter by selected risk level
        return scoredPatients.filter(p => p.riskLabel === riskFilter);
    }, [scoredPatients, riskFilter]);

    // Get title based on filter
    const getTitle = () => {
        if (riskFilter === 'High') return 'High Risk Candidates';
        if (riskFilter === 'Medium') return 'Medium Risk Candidates';
        if (riskFilter === 'Low') return 'Low Risk Candidates';
        return 'High Risk Candidates';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 text-lg">{getTitle()}</h3>
                    <p className="text-[12px] text-slate-400 uppercase font-bold">
                        {filteredCandidates.length} patient{filteredCandidates.length !== 1 ? 's' : ''}
                        {riskFilter ? ` (filtered: ${riskFilter})` : ''}
                    </p>
                </div>
                {riskFilter && (
                    <button 
                        onClick={() => onSelect(null)}
                        className="text-xs font-black text-slate-400 hover:text-red-500 uppercase"
                    >
                        Clear Filter
                    </button>
                )}
            </div>
            
            <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[12px] uppercase text-slate-400 font-bold sticky top-0">
                        <tr>
                            <th className="px-4 py-2">Patient</th>
                            <th className="px-4 py-2 text-center">HbA1c</th>
                            <th className="px-4 py-2 text-center">Trend</th>
                            <th className="px-4 py-2 text-right">Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCandidates.slice(0, 50).map((p) => {
                            // Handle both scored patients and regular patients
                            const patientId = p.patient_id || p.patientId || p.uhid;
                            const patientName = p.patient_name || p.name;
                            const hba1c = p.hba1c || p.latest?.hba1c;
                            const riskLabel = p.riskLabel || 'N/A';
                            const trend = p.trend || 'stable';
                            
                            return (
                                <tr 
                                    key={patientId}
                                    onClick={() => onSelect(p)}
                                    className={`cursor-pointer border-b border-slate-50 hover:bg-indigo-50 transition-colors ${selectedId === patientId ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400' : ''}`}
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-700 text-sm">{patientName}</div>
                                        <div className="text-[12px] text-slate-400 uppercase font-medium">
                                            {p.age}Y / {p.gender_id === 'dc865974-eef7-41ce-bba8-54dd43035e55' ? 'Male' : 'Female'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="font-black text-slate-800">{hba1c}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center">
                                            {trend === 'deteriorating' && <TrendingUpIcon />}
                                            {trend === 'improving' && <TrendingDownIcon />}
                                            {trend === 'stable' && <StableIcon />}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`text-[12px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${
                                            riskLabel === 'High' ? 'bg-red-50 text-red-600' :
                                            riskLabel === 'Medium' ? 'bg-yellow-50 text-yellow-600' :
                                            riskLabel === 'N/A' ? 'bg-slate-100 text-slate-500' :
                                            'bg-green-50 text-green-600'
                                        }`}>
                                            {riskLabel}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredCandidates.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        No patients found for this risk level
                    </div>
                )}
            </div>
        </div>
    );
};

export default HighRiskList;
