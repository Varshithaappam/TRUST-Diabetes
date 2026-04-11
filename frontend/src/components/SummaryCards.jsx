import React, { useState, useEffect } from 'react';

const StatCard = ({ title, value, icon, color, subText }) => (
    <div className="bg-white p-5 rounded-lg border border-slate-100 shadow-lg shadow-indigo-100 flex flex-col justify-between hover:shadow-md transition-all">
        <div className="flex justify-between items-start">
            <span className="text-[12px] font-bold text-black uppercase tracking-widest font-display-medium">{title}</span>
            <span className="text-xl opacity-80">{icon}</span>
        </div>
        <div className="mt-2">
            <div className={`text-3xl font-black tracking-tight font-display-black ${color}`}>{value}</div>
            {subText && <div className="text-[12px] text-black font-bold mt-1 uppercase tracking-tighter font-display-medium">{subText}</div>}
        </div>
    </div>
);

const SummaryCards = ({ filters }) => {
    const [stats, setStats] = useState({ 
        total_patients: 0, 
        diabetic_population: 0, 
        prevalence_rate: '0.0', 
        avg_frequency: 0,
        total_sites: 0,
        total_consultants: 0,
        total_clinics: 0
    });

    useEffect(() => {
        const IGNORED = new Set(['', null, undefined, 'All', 'All Consultants', 'All Sites', 'All Categories', 'All Levels', 'All Genders', 'All Ages', 'All Statuses']);
        const params = new URLSearchParams();
        
        if (filters) {
            // Map frontend filter keys to backend expected query params
            if (!IGNORED.has(filters.consultant)) params.append('consultant', filters.consultant);
            if (!IGNORED.has(filters.site)) params.append('site', filters.site);
            if (!IGNORED.has(filters.diabetes)) params.append('status', filters.diabetes);
            if (!IGNORED.has(filters.control)) params.append('control', filters.control);
            if (!IGNORED.has(filters.gender)) params.append('gender', filters.gender);
            if (!IGNORED.has(filters.cholesterol)) params.append('cholesterol', filters.cholesterol);
            if (!IGNORED.has(filters.age)) params.append('age', filters.age);
            if (filters.startDate?.trim()) params.append('startDate', filters.startDate);
            if (filters.endDate?.trim()) params.append('endDate', filters.endDate);
            if (filters.searchTerm?.trim()) params.append('search', filters.searchTerm);
        }

        const token = localStorage.getItem('token');
        
        fetch(`http://localhost:5000/api/stats/summary?${params.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
            .then(r => r.ok ? r.json() : Promise.reject('Network response was not ok'))
            .then(d => {
                setStats({
                    total_patients: d.total_patients || 0,
                    diabetic_population: d.diabetic_population || 0,
                    prevalence_rate: d.prevalence_rate || '0.0',
                    avg_frequency: d.avg_frequency || 0,
                    total_sites: d.total_sites || 0,
                    total_consultants: d.total_consultants || 0,
                    total_clinics: d.total_clinics || 0
                });
            })
            .catch(err => console.error('SummaryCards error:', err));
    }, [filters]); // Only trigger when appliedFilters changes

    return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        <StatCard 
            title="Total Sites" 
            value={stats.total_sites.toLocaleString()} 
            icon="🏥" 
            color="text-emerald-600" 
        />
        <StatCard 
            title="Total Consultants" 
            value={stats.total_consultants.toLocaleString()} 
            icon="👨‍⚕️" 
            color="text-blue-600" 
        />
        <StatCard 
            title="Total Clinics" 
            value={stats.total_clinics.toLocaleString()} 
            icon="🏢" 
            color="text-purple-600" 
        />
        <StatCard 
            title="Total Patients" 
            value={stats.total_patients.toLocaleString()} 
            icon="👥" 
            color="text-indigo-600" 
        />
        <StatCard 
            title="Diabetic Population" 
            value={stats.diabetic_population.toLocaleString()} 
            icon="🩺" 
            color="text-indigo-500" 
        />
        <StatCard 
            title="Prevalence Rate" 
            value={`${stats.prevalence_rate}%`} 
            icon="📊" 
            subText="Confirmed Diabetes/ Total" 
            color="text-rose-500" 
        />
        <StatCard 
            title="Avg. Visit Frequency" 
            value={stats.avg_frequency} 
            subText="Visits per patient"
            icon="📅" 
            color="text-slate-700" 
        />
    </div>
);
};

export default SummaryCards;

