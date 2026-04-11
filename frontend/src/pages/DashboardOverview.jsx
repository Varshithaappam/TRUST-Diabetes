import React, { useState, useEffect } from 'react';
import AnalyticsDashboard from '../components/Analytics';
import AISummary from '../components/AISummary';

const DashboardOverview = ({ filters }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const IGNORED = new Set(['', null, undefined, 'All', 'All Consultants', 'All Sites', 'All Clinics', 'All Categories', 'All Levels', 'All Genders', 'All Ages', 'All Statuses']);
        const params = new URLSearchParams();
        
        if (filters) {
            if (!IGNORED.has(filters.consultant)) params.append('consultant', filters.consultant);
            if (!IGNORED.has(filters.site)) params.append('site', filters.site);
            if (!IGNORED.has(filters.clinic)) params.append('clinic', filters.clinic);
            if (!IGNORED.has(filters.diabetes)) params.append('status', filters.diabetes);
            if (!IGNORED.has(filters.control)) params.append('control', filters.control);
            if (!IGNORED.has(filters.gender)) params.append('gender', filters.gender);
            if (!IGNORED.has(filters.cholesterol)) params.append('cholesterol', filters.cholesterol);
            if (!IGNORED.has(filters.age)) params.append('age', filters.age);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.searchTerm) params.append('search', filters.searchTerm);
        }

        fetch(`http://localhost:5000/api/stats/analytics?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Server Error');
                return res.json();
            })
            .then(json => {
                setData(json);
                setError(null);
            })
            .catch(err => {
                console.error(err);
                setError("Failed to load dashboard data.");
            });
            
        // Only trigger when appliedFilters changes
    }, [filters]);

    if (error) return <div className="p-10 text-rose-500 font-bold">{error}</div>;
    if (!data) return <div className="p-10 text-slate-400 animate-pulse text-xs font-black uppercase">Loading Analytics...</div>;

    return (
        <div className="space-y-6 pt-4">
            {/* 1. AI Summary Section - Placed at the top for clinical visibility */}
            <AISummary 
                dashboardData={{
                    // Map snake_case from API to camelCase for AISummary
                    totalPatients: data.total_patients || data.totalPatients || 0,
                    diabeticPopulation: data.diabetic_population || data.diabeticPopulation || 0,
                    prevalenceRate: data.prevalence_rate || data.prevalenceRate || 0,
                    avgFrequency: data.avg_frequency || data.avgFrequency || 0,
                    distribution: data.distribution || [],
                    consultants: data.consultants || [],
                    sites: data.sites || [],
                    demographics: data.demographics || {},
                    labTrends: data.labTrends || [],
                    gender: data.gender || [],
                    siteTrends: data.siteTrends || [],
                    criticalCases: data.criticalCases || []
                }} 
            />

            {/* 2. Main Visual Dashboard */}
            <AnalyticsDashboard
                distribution={data.distribution || []}
                trends={data.trends || []}
                consultants={data.consultants || []}
                sites={data.sites || []}
                demographics={data.demographics || {}}
                gender={data.gender || []}
                labTrends={data.labTrends || []}
                siteTrends={data.siteTrends || []}
                siteNames={data.siteNames || []}
                criticalCases={data.criticalCases || []}
            />
        </div>
    );
};

export default DashboardOverview;

