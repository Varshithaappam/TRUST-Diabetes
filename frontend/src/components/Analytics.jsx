import React, { useState, useMemo, useCallback } from 'react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, LabelList,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const COLORS = {
    controlled: '#10b981',
    moderate: '#f59e0b', 
    uncontrolled: '#ef4444',
    na: '#94a3b8',
    female: '#d946ef',
    male: '#0ea5e9',
    site1: '#00C2DE',
    site2: '#005FBE',
    site3: '#88DCEC',
    site4: '#B1E4F1',
    site5: '#CAD3FB'
};

const fontStyle = {
    fontFamily: '"Avenir", sans-serif',
    fontWeight: 900,
    fontSize: '12px',
    fill: '#1e293b'
};

const SITE_COLORS = ['#00C2DE', '#005FBE', '#5D89E9', '#B1E4F1', '#8BB8F8'];

// Filter chips for displaying active filters
const FilterChip = ({ label, value, onRemove }) => (
    <div className="flex items-center gap-1 bg-indigo-100 border border-indigo-300 px-3 py-1.5 rounded-full text-xs font-bold text-indigo-700">
        <span className="font-black uppercase">{label}:</span>
        <span>{value}</span>
        <button 
            onClick={onRemove}
            className="ml-1 hover:bg-indigo-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
        >
            ×
        </button>
    </div>
);

const ChartCard = ({ title, subtitle, children }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="mb-4">
            <h3 className="font-black text-black text-sm uppercase tracking-wider">{title}</h3>
            <p className="text-[12px] text-black font-bold uppercase tracking-tight">{subtitle}</p>
        </div>
        {children}
    </div>
);

const AnalyticsDashboard = ({ 
    distribution = [], 
    trends = [], 
    consultants = [], 
    sites = [], 
    demographics = {},
    gender = [],
    labTrends = [],
    siteTrends = [],
    siteNames = [],
    criticalCases = [],
    onFilterChange,
    externalFilters = {}
}) => {
    // ============ CENTRALIZED STATE MANAGEMENT ============
    const [activeFilters, setActiveFilters] = useState({
        status: null,     // Controlled, Uncontrolled, Moderate
        gender: null,    // Male, Female
        ageGroup: null,  // 30-40, 41-50, etc.
        site: null,      // Site name
        consultant: null // Consultant name
    });

    // Sync with external filters (from GlobalFilterBar)
    React.useEffect(() => {
        if (externalFilters) {
            setActiveFilters(prev => ({
                ...prev,
                status: externalFilters.control && externalFilters.control !== 'All Categories' ? externalFilters.control : null,
                gender: externalFilters.gender && externalFilters.gender !== 'All Genders' ? externalFilters.gender : null,
                ageGroup: externalFilters.age && externalFilters.age !== 'All Ages' ? externalFilters.age : null,
                site: externalFilters.site && externalFilters.site !== 'All Sites' ? externalFilters.site : null,
                consultant: externalFilters.consultant && externalFilters.consultant !== 'All Consultants' ? externalFilters.consultant : null
            }));
        }
    }, [externalFilters]);

    // ============ FILTER HANDLERS ============
    const handleFilterChange = useCallback((filterKey, value) => {
        setActiveFilters(prev => {
            const newFilters = { ...prev };
            // Toggle behavior: if clicking same value, reset to null
            if (newFilters[filterKey] === value) {
                newFilters[filterKey] = null;
            } else {
                newFilters[filterKey] = value;
            }
            return newFilters;
        });
        
        // Notify parent component if callback provided
        if (onFilterChange) {
            onFilterChange(filterKey, value);
        }
    }, [onFilterChange]);

    const removeFilter = useCallback((filterKey) => {
        setActiveFilters(prev => ({
            ...prev,
            [filterKey]: null
        }));
        
        if (onFilterChange) {
            onFilterChange(filterKey, null);
        }
    }, [onFilterChange]);

    const clearAllFilters = useCallback(() => {
        setActiveFilters({
            status: null,
            gender: null,
            ageGroup: null,
            site: null,
            consultant: null
        });
        
        if (onFilterChange) {
            onFilterChange('clearAll', null);
        }
    }, [onFilterChange]);

    // ============ DATA PROCESSING ============
    // Format demographics for bar chart
    const demographicsData = [
        { name: '30-40', count: demographics['30-40'] || 0 },
        { name: '41-50', count: demographics['41-50'] || 0 },
        { name: '51-60', count: demographics['51-60'] || 0 },
        { name: '61-70', count: demographics['61-70'] || 0 },
        { name: '71+', count: demographics['71+'] || 0 }
    ];

    // Process distribution data with color support
    const distributionData = useMemo(() => {
        return distribution.map(d => {
            const name = d.name === 'CONTROLLED' ? 'Controlled' : 
                  d.name === 'MODERATELY CONTROLLED' ? 'Moderate' : 
                  d.name === 'UNCONTROLLED' ? 'Uncontrolled' : 'N/A';
            return { name, value: d.value, originalName: d.name };
        });
    }, [distribution]);

    // Active filters check
    const hasActiveFilters = Object.values(activeFilters).some(v => v !== null);

    // ============ RENDER HELPERS ============
    const getStatusColor = (name) => {
        if (hasActiveFilters && activeFilters.status && activeFilters.status !== name) {
            return name === 'Controlled' ? '#10b98133' : 
                   name === 'Moderate' ? '#f59e0b33' : 
                   '#ef444433';
        }
        return name === 'Controlled' ? COLORS.controlled : 
               name === 'Moderate' ? COLORS.moderate : 
               name === 'Uncontrolled' ? COLORS.uncontrolled : COLORS.na;
    };

    const getGenderColor = (name) => {
        if (hasActiveFilters && activeFilters.gender && activeFilters.gender !== name) {
            return name === 'Female' ? '#ec489933' : '#3b82f633';
        }
        return name === 'Female' ? COLORS.female : name === 'Male' ? COLORS.male : COLORS.na;
    };

    const getDemographicsColor = (name) => {
        if (hasActiveFilters && activeFilters.ageGroup && activeFilters.ageGroup !== name) {
            return '#8b5cf633';
        }
        return '#5D89E9';
    };

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            {/* FILTER CHIPS BAR */}
            {hasActiveFilters && (
                <div className="mb-4 flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-black text-slate-400 uppercase">Active Filters:</span>
                    {activeFilters.status && (
                        <FilterChip 
                            label="Status" 
                            value={activeFilters.status} 
                            onRemove={() => removeFilter('status')} 
                        />
                    )}
                    {activeFilters.gender && (
                        <FilterChip 
                            label="Gender" 
                            value={activeFilters.gender} 
                            onRemove={() => removeFilter('gender')} 
                        />
                    )}
                    {activeFilters.ageGroup && (
                        <FilterChip 
                            label="Age" 
                            value={activeFilters.ageGroup} 
                            onRemove={() => removeFilter('ageGroup')} 
                        />
                    )}
                    {activeFilters.site && (
                        <FilterChip 
                            label="Site" 
                            value={activeFilters.site} 
                            onRemove={() => removeFilter('site')} 
                        />
                    )}
                    {activeFilters.consultant && (
                        <FilterChip 
                            label="Consultant" 
                            value={activeFilters.consultant} 
                            onRemove={() => removeFilter('consultant')} 
                        />
                    )}
                    <button 
                        onClick={clearAllFilters}
                        className="text-xs font-black text-slate-400 hover:text-red-500 uppercase ml-2"
                    >
                        Clear All
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-black uppercase tracking-tight">Analytics Dashboard</h1>
                    <p className="text-xs font-bold text-black uppercase tracking-widest">Real-time Registry Insights</p>
                </div>
            </div>

            {/* Row 1: Control Distribution + Control Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <ChartCard title={<span className="text-[16px] font-black text-black uppercase tracking-tighter drop-shadow-[0.5px_0px_0px_rgba(0,0,0,1)]">
                    Control Distribution
                </span>} subtitle="Click to Filter">
                    <div className="flex items-center justify-center" style={{ width: '100%', height: '300px' }}>
                        <PieChart width={500} height={300}>
                            <Pie
                                data={distributionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120} 
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                                onClick={(data) => handleFilterChange('status', data.name)}
                                style={{ cursor: 'pointer' }}
                                label={({ cx, cy, midAngle, outerRadius, value, name }) => {
                                    const RADIAN = Math.PI / 180;
                                    const radius = outerRadius + 25;
                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                    return (
                                        <text 
                                            x={x} 
                                            y={y} 
                                            fill="#1e293b"
                                            textAnchor={x > cx ? 'start' : 'end'} 
                                            dominantBaseline="central"
                                            style={{ 
                                                fontSize: '14px', 
                                                fontWeight: '600', 
                                                fontFamily: 'Inter, sans-serif' 
                                            }}
                                        >
                                            {`${name}: ${value}`}
                                        </text>
                                    );
                                }}
                                labelLine={true}
                            >
                                {distributionData.map((entry) => (
                                    <Cell 
                                        key={entry.name} 
                                        fill={getStatusColor(entry.name)}
                                        stroke={activeFilters.status === entry.name ? '#1e293b' : 'none'}
                                        strokeWidth={activeFilters.status === entry.name ? 3 : 0}
                                    />
                                ))}
                            </Pie>
                        </PieChart>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center mt-2">
                        💡 Click on segments to filter all charts
                    </p>
                </ChartCard>

                <ChartCard title={<span className="text-[16px] font-black text-black uppercase tracking-tighter drop-shadow-[0.5px_0px_0px_rgba(0,0,0,1)]">
                    Control Trends
                </span>} subtitle="12-Month Clinical Progress">
                    <div className="h-90" style={{minHeight: 288}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trends} margin={{ bottom: 20 }}> {/* Added margin for rotated labels */}
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="month" 
                                    tick={{ ...fontStyle, angle: -45, textAnchor: 'end' }}
                                    height={60}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
                                    }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={fontStyle} />
                                <Tooltip 
                                    labelFormatter={(value) => {
                                        const date = new Date(value);
                                        return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
                                    }}
                                />
                                <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    iconType="circle" 
                                    wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingBottom: '38px' }} 
                                />
                                <Line type="monotone" dataKey="uncontrolled" stroke={COLORS.uncontrolled} strokeWidth={3} dot={{ r: 4 }} name="Uncontrolled" />
                                <Line type="monotone" dataKey="moderate" stroke={COLORS.moderate} strokeWidth={3} dot={false} name="Moderate" />
                                <Line type="monotone" dataKey="controlled" stroke={COLORS.controlled} strokeWidth={3} dot={false} name="Controlled" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Row 2: Critical Cases + Consultant Load */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <ChartCard title={<span className="text-[16px] font-black text-black uppercase tracking-tighter drop-shadow-[0.5px_0px_0px_rgba(0,0,0,1)]">
                    Critical Cases
                </span>} subtitle="Uncontrolled Patients by Site">
                    <div className="h-[500px]" style={{ minHeight: 400 }}> 
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={criticalCases.slice(0, 8)} 
                                layout="horizontal"
                                margin={{ top: 20, right: 10, left: 10, bottom: 120 }}
                                onClick={(data) => data && data.activeLabel && handleFilterChange('site', data.activeLabel)}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="site" 
                                    tick={fontStyle}
                                    angle={-90}
                                    textAnchor="end"
                                    interval={0}
                                />
                                <YAxis hide /> 
                                <Bar 
                                    dataKey="uncontrolled" 
                                    fill="#ef4444" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={35}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <LabelList 
                                        dataKey="uncontrolled" 
                                        position="top" 
                                        offset={10} 
                                        style={{ fill: '#475569', fontSize: '13px', fontWeight: 'bold' }} 
                                    />
                                </Bar>
                                <Tooltip cursor={{ fill: 'transparent' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title={<span className="text-[16px] font-black text-black uppercase tracking-tighter drop-shadow-[0.5px_0px_0px_rgba(0,0,0,1)]">
                    Consultant Load
                </span>} subtitle="Click to Filter">
                    <div className="h-[500px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={consultants.slice(0, 10)} 
                                layout="vertical"
                                margin={{ left: 20, right: 40, top: 10, bottom: 10 }}
                                onClick={(data) => data && data.activeLabel && handleFilterChange('consultant', data.activeLabel)}
                            >
                                <CartesianGrid horizontal={false} vertical={false} />
                                <XAxis type="number" hide /> 
                                <YAxis dataKey="name" type="category" tick={fontStyle} />
                                <Bar 
                                    dataKey="count" 
                                    fill={hasActiveFilters && activeFilters.consultant ? '#6366f166' : '#00C2DE'} 
                                    radius={[0, 4, 4, 0]} 
                                    barSize={32}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <LabelList 
                                        dataKey="count" 
                                        position="right" 
                                        style={fontStyle} 
                                        offset={10}
                                    />
                                </Bar>
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title={<span className="text-[16px] font-black text-black uppercase tracking-tighter drop-shadow-[0.5px_0px_0px_rgba(0,0,0,1)]">
                    Site Performance
                </span>} subtitle="Click to Filter">
                    <div className="h-[500px] w-full overflow-x-auto overflow-y-hidden">
                        <div style={{ minWidth: sites.length * 60, height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={sites}
                                    barGap={-35}
                                    margin={{ top: 20, right: 20, left: -20, bottom: 30 }}
                                    onClick={(data) => data && data.activeLabel && handleFilterChange('site', data.activeLabel)}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="site" interval={0} angle={-90} textAnchor="end" height={120} fontSize={13} fontWeight="600" fontFamily='"Avenir", sans-serif' stroke="#0e0e0eff" />
                                    <YAxis axisLine={false} tickLine={false} fontWeight="900" fontSize={14} stroke="#0e0f0fff" />
                                    <Tooltip cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
                                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontWeight: '900', paddingBottom: '38px' }} />
                                    <Bar 
                                        dataKey="controlled" 
                                        fill={hasActiveFilters && activeFilters.site ? '#10b98133' : COLORS.controlled} 
                                        name="Controlled" 
                                        barSize={45} 
                                        radius={[4, 4, 0, 0]}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <Bar 
                                        dataKey="moderate" 
                                        fill={hasActiveFilters && activeFilters.site ? '#f59e0b33' : COLORS.moderate} 
                                        name="Moderate" 
                                        barSize={30} 
                                        radius={[2, 2, 0, 0]}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <Bar 
                                        dataKey="uncontrolled" 
                                        fill={hasActiveFilters && activeFilters.site ? '#ef444433' : COLORS.uncontrolled} 
                                        name="Uncontrolled" 
                                        barSize={15} 
                                        radius={[1, 1, 0, 0]}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </ChartCard>
            </div>

            {/* Row 3: Demographics + Gender + Lab Trends */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <ChartCard title={<span className="text-[16px] font-black text-black uppercase tracking-tighter drop-shadow-[0.5px_0px_0px_rgba(0,0,0,1)]">
                    Demographics
                </span>} subtitle="Click Age Group to Filter">
                    <div className="h-90">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={demographicsData} 
                                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                                onClick={(data) => data && data.activeLabel && handleFilterChange('ageGroup', data.activeLabel)}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={fontStyle} height={30}/>
                                <YAxis tick={fontStyle} />
                                <Bar 
                                    dataKey="count" 
                                    fill={getDemographicsColor(activeFilters?.ageGroup)}
                                    radius={[4, 4, 0, 0]} 
                                    barSize={40}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <LabelList dataKey="count" position="top" fill="#1e293b" fontSize={12} fontWeight="bold" />
                                </Bar>
                                <Tooltip />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                <ChartCard title={<span className="text-[16px] font-black text-black uppercase tracking-tighter drop-shadow-[0.5px_0px_0px_rgba(0,0,0,1)]">
                    Gender Distribution
                </span>} subtitle="Click to Filter">
                    <div className="flex items-center justify-center" style={{ width: '100%', height: '350px' }}>
                        {gender && gender.length > 0 ? (
                            <PieChart width={400} height={350}>
                                <Pie
                                    data={gender}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70} 
                                    outerRadius={100} 
                                    paddingAngle={3}
                                    dataKey="value"
                                    nameKey="name"
                                    onClick={(data) => data && data.name && handleFilterChange('gender', data.name)}
                                    activeShape={false}
                                    label={({ cx, cy, midAngle, outerRadius, value, name }) => {
                                        const RADIAN = Math.PI / 180;
                                        const radius = outerRadius + 25;
                                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                        return (
                                            <text 
                                                x={x} 
                                                y={y} 
                                                fill="#1e293b" 
                                                textAnchor={x > cx ? 'start' : 'end'} 
                                                dominantBaseline="central"
                                                style={{ 
                                                    fontSize: '16px', 
                                                    fontWeight: '600', 
                                                    fontFamily: 'Inter, sans-serif' 
                                                }}
                                            >
                                                {`${name}: ${value}`}
                                            </text>
                                        );
                                    }}
                                    labelLine={{ stroke: '#94a3b8', strokeWidth: 2 }}
                                >
                                    {gender.map((entry) => (
                                        <Cell 
                                            key={entry.name} 
                                            fill={getGenderColor(entry.name)}
                                            stroke={activeFilters.gender === entry.name ? '#1e293b' : 'none'}
                                            strokeWidth={activeFilters.gender === entry.name ? 3 : 0}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    ))}
                                </Pie>
                            </PieChart>
                        ) : (
                            <div className="text-black text-sm font-bold">No gender data available</div>
                        )}
                    </div>
                </ChartCard>

                <ChartCard title={<span className="text-[16px] font-black text-black uppercase tracking-tighter drop-shadow-[0.5px_0px_0px_rgba(0,0,0,1)]">
                    Lab Trends
                </span>} subtitle="HbA1c & Cholesterol Over Time">
                    <div className="h-90" style={{minHeight: 256}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={labTrends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} stroke="#94a3b8" />
                                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <Tooltip />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '14px', paddingBottom: '38px' }} />
                                <Line yAxisId="left" type="monotone" dataKey="avg_hba1c" stroke="#ef4444" strokeWidth={2} dot={false} name="HbA1c" />
                                <Line yAxisId="right" type="monotone" dataKey="avg_chol" stroke="#3b82f6" strokeWidth={2} dot={false} name="Cholesterol" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Row 4: Site Trends */}
            <div className="mb-6">
                <ChartCard title={<span className="text-[16px] font-black text-black uppercase tracking-tighter drop-shadow-[0.5px_0px_0px_rgba(0,0,0,1)]">
                    Site Trends
                </span>} subtitle="Uncontrolled Cases Over Time by Site">
                    <div className="h-72" style={{minHeight: 288}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={siteTrends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <Tooltip />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingBottom: '38px' }} />
                                {siteNames.slice(0, 6).map((site, idx) => {
                                    const isDimmed = hasActiveFilters && activeFilters.site && activeFilters.site !== site;
                                    return (
                                        <Line 
                                            key={site} 
                                            type="monotone" 
                                            dataKey={site} 
                                            stroke={isDimmed ? `${SITE_COLORS[idx % SITE_COLORS.length]}33` : SITE_COLORS[idx % SITE_COLORS.length]} 
                                            strokeWidth={isDimmed ? 1 : 2} 
                                            dot={false}
                                        />
                                    );
                                })}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
