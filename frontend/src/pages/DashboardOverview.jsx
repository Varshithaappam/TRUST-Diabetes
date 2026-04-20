import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AnalyticsDashboard from '../components/Analytics';
import AISummary from '../components/AISummary';

const DashboardOverview = ({ filters }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [chartFilters, setChartFilters] = useState({});

    // Memoize merged filters to prevent unnecessary re-renders
    const mergedFilters = useMemo(() => {
        return { ...filters, ...chartFilters };
    }, [filters, chartFilters]);

    // Handle filter changes from chart clicks
    const handleChartFilterChange = useCallback((filterKey, value) => {
        if (filterKey === 'clearAll') {
            setChartFilters({});
        } else if (value === null) {
            // Remove this specific filter
            setChartFilters(prev => {
                const newFilters = { ...prev };
                delete newFilters[filterKey];
                return newFilters;
            });
        } else {
            // Add/update filter - map chart filter keys to external filter keys
            const filterMapping = {
                status: 'control',
                gender: 'gender',
                ageGroup: 'age',
                site: 'site',
                consultant: 'consultant'
            };
            
            const externalKey = filterMapping[filterKey];
            if (externalKey) {
                setChartFilters(prev => ({
                    ...prev,
                    [externalKey]: value
                }));
            }
        }
    }, []);

    useEffect(() => {
        const IGNORED = new Set(['', null, undefined, 'All', 'All Consultants', 'All Sites', 'All Clinics', 'All Categories', 'All Levels', 'All Genders', 'All Ages', 'All Statuses']);
        const params = new URLSearchParams();
        
        if (mergedFilters) {
            if (!IGNORED.has(mergedFilters.consultant)) params.append('consultant', mergedFilters.consultant);
            if (!IGNORED.has(mergedFilters.site)) params.append('site', mergedFilters.site);
            if (!IGNORED.has(mergedFilters.clinic)) params.append('clinic', mergedFilters.clinic);
            if (!IGNORED.has(mergedFilters.diabetes)) params.append('status', mergedFilters.diabetes);
            if (!IGNORED.has(mergedFilters.control)) params.append('control', mergedFilters.control);
            if (!IGNORED.has(mergedFilters.gender)) params.append('gender', mergedFilters.gender);
            if (!IGNORED.has(mergedFilters.cholesterol)) params.append('cholesterol', mergedFilters.cholesterol);
            if (!IGNORED.has(mergedFilters.age)) params.append('age', mergedFilters.age);
            if (mergedFilters.startDate) params.append('startDate', mergedFilters.startDate);
            if (mergedFilters.endDate) params.append('endDate', mergedFilters.endDate);
            if (mergedFilters.searchTerm) params.append('search', mergedFilters.searchTerm);
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
            
    }, [mergedFilters]);

    if (error) return <div className="p-10 text-rose-500 font-bold">{error}</div>;
    if (!data) return <div className="p-10 text-slate-400 animate-pulse text-xs font-black uppercase">Loading Analytics...</div>;

    return (
        <div className="space-y-6 pt-4">
            {/* AI Summary Section - Placed at the top for clinical visibility */}
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

            {/* Main Visual Dashboard with filter callbacks */}
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
                onFilterChange={handleChartFilterChange}
                externalFilters={mergedFilters}
            />
        </div>
    );
};

export default DashboardOverview;
