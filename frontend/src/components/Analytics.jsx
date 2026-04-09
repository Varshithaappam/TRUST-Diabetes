import React from 'react';
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, LabelList,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
const COLORS = {
    controlled: '#10b981',
    moderate: '#f59e0b', 
    uncontrolled: '#ef4444',
    na: '#64748b',
    female: '#ec4899',
    male: '#3b82f6',
    site1: '#8b5cf6',
    site2: '#06b6d4',
    site3: '#f97316',
    site4: '#84cc16',
    site5: '#14b8a6'
};

const SITE_COLORS = ['#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#14b8a6', '#ec4899', '#6366f1', '#ef4444'];

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
    criticalCases = []
}) => {
    // Format demographics for bar chart
    const demographicsData = [
        { name: '30-40', count: demographics['30-40'] || 0 },
        { name: '41-50', count: demographics['41-50'] || 0 },
        { name: '51-60', count: demographics['51-60'] || 0 },
        { name: '61-70', count: demographics['61-70'] || 0 },
        { name: '71+', count: demographics['71+'] || 0 }
    ];

    // Ensure distribution has proper names
    const distributionData = distribution.map(d => ({
        name: d.name === 'CONTROLLED' ? 'Controlled' : 
              d.name === 'MODERATELY CONTROLLED' ? 'Moderate' : 
              d.name === 'UNCONTROLLED' ? 'Uncontrolled' : 'N/A',
        value: d.value
    }));
    const fontStyle = {
    fontFamily: '"Avenir", sans-serif',
    fontWeight: 900,
    fontSize: '12px',
    fill: '#1e293b'
};

    return (
        <div className="p-6 bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-black uppercase tracking-tight">Analytics Dashboard</h1>
                    <p className="text-xs font-bold text-black uppercase tracking-widest">Real-time Registry Insights</p>
                </div>
            </div>
            {/* Row 1: Site Trends (Full Width) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <ChartCard title="Control Distribution" subtitle="Overall Status">
                    {/* 1. Use a fixed width/height instead of ResponsiveContainer to make it static */}
                    <div className="flex items-center justify-center" style={{ width: '100%', height: '300px' }}>
                        <PieChart width={400} height={300}>
                            <Pie
                                data={distributionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120} 
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = outerRadius + 25;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                return (
                                    <text 
                                        x={x} 
                                        y={y} 
                                        fill="#1e293b" // Slate-800 for high contrast
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
                                {distributionData.map((entry, index) => (
                                    <Cell key={entry.name} fill={
                                        entry.name === 'Controlled' ? COLORS.controlled :
                                        entry.name === 'Moderate' ? COLORS.moderate :
                                        entry.name === 'Uncontrolled' ? COLORS.uncontrolled : COLORS.na
                                    } />
                                ))}
                            </Pie>
                            
                            {/* 2. Legend component has been removed from here */}
                        </PieChart>
                    </div>
                </ChartCard>

                <ChartCard title="Control Trends" subtitle="12-Month Clinical Progress">
                    <div className="h-72" style={{minHeight: 288}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <Tooltip />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
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
                <ChartCard title="Critical Cases" subtitle="Uncontrolled Patients by Site">
                    {/* 1. Increase this height from h-64 to h-96 or more */}
                    <div className="h-[500px]" style={{ minHeight: 400 }}> 
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={criticalCases.slice(0, 8)} 
                                layout="horizontal"
                                margin={{ top: 20, right: 10, left: 10, bottom: 120 }} 
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                
                                <XAxis 
                                    dataKey="site" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    fontSize={11} 
                                    stroke="#475569"
                                    interval={0} 
                                    angle={-90} 
                                    textAnchor="end"
                                    dy={5} 
                                    fontWeight={600}
                                />
                                
                                <YAxis hide /> 
                                
                                <Bar 
                                    dataKey="uncontrolled" 
                                    fill="#ef4444" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={35}
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

                <ChartCard title="Consultant Load" subtitle="Top 10 Consultants by Patient Count">
                    {/* Removed fixed h-64 to let it breathe, or kept it but filled it with barSize */}
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={consultants.slice(0, 10)} 
                                layout="vertical"
                                margin={{ left: 20, right: 40, top: 10, bottom: 10 }}
                            >
                                <CartesianGrid horizontal={false} vertical={false} />
                                
                                {/* 1. Hide the XAxis to save vertical space */}
                                <XAxis type="number" hide /> 
                                
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    fontSize={11} 
                                    width={100} 
                                    tick={fontStyle}
                                />
                                
                                <Bar 
                                    dataKey="count" 
                                    fill="#6366f1" 
                                    radius={[0, 4, 4, 0]} 
                                    // 2. INCREASE barSize (from 18 to 32) to fill the empty gaps
                                    barSize={32} 
                                >
                                    {/* 3. Add Labels at the end of bars to utilize the right-side space */}
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
                <ChartCard title="Site Performance" subtitle="Control Status by Site">
                    <div className="h-[500px] w-full overflow-x-auto overflow-y-hidden">
                        <div style={{ minWidth: sites.length * 60, height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={sites} 
                                    barGap={-35} 
                                    margin={{ top: 20, right: 20, left: -20, bottom: 30 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="site" interval={0} angle={-90} textAnchor="end" height={120} fontSize={13} fontWeight="700" stroke="#0e0e0eff" />
                                    <YAxis axisLine={false} tickLine={false} fontWeight="900" fontSize={14} stroke="#0e0f0fff" />
                                    <Tooltip cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
                                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontWeight: '900', paddingBottom: '20px' }} />

                                    {/* 1. BACKGROUND: Controlled (Widest) */}
                                    <Bar 
                                        dataKey="controlled" 
                                        fill={COLORS.controlled} 
                                        name="Controlled" 
                                        barSize={45} 
                                        radius={[4, 4, 0, 0]}
                                    />

                                    {/* 2. MIDDLE: Moderate (Medium width) */}
                                    <Bar 
                                        dataKey="moderate" 
                                        fill={COLORS.moderate} 
                                        name="Moderate" 
                                        barSize={30} 
                                        radius={[2, 2, 0, 0]}
                                    />

                                    {/* 3. FOREGROUND: Uncontrolled (Thinnest - Now Visible) */}
                                    <Bar 
                                        dataKey="uncontrolled" 
                                        fill={COLORS.uncontrolled} 
                                        name="Uncontrolled" 
                                        barSize={15} 
                                        radius={[1, 1, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </ChartCard>
            </div>

            {/* Row 3: Site Performance + Demographics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                

                <ChartCard title="Demographics" subtitle="Age Distribution">
                    <div className="h-64" style={{minHeight: 256}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={demographicsData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
                                <Tooltip />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
                <ChartCard title="Gender Distribution" subtitle="Patient Split">
                    <div className="flex items-center justify-center" style={{ width: '100%', height: '350px' }}>
                        {gender && gender.length > 0 ? (
                            <PieChart width={400} height={350}>
                                <Pie
                                    data={gender}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70} 
                                    outerRadius={110} 
                                    paddingAngle={3}
                                    dataKey="value"
                                    nameKey="name"
                                    // 1. Disable hover interaction
                                    activeShape={false}
                                    // 2. Bold static labels for Name and Score
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name }) => {
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
                                                    fontWeight: '900', 
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
                                            fill={entry.name === 'Female' ? COLORS.female : entry.name === 'Male' ? COLORS.male : COLORS.na} 
                                            style={{ outline: 'none' }}
                                        />
                                    ))}
                                </Pie>
                                {/* 3. Removed Tooltip and Legend */}
                            </PieChart>
                        ) : (
                            <div className="text-black text-sm font-bold">No gender data available</div>
                        )}
                    </div>
                </ChartCard>
                <ChartCard title="Lab Trends" subtitle="HbA1c & Cholesterol Over Time">
                    <div className="h-64" style={{minHeight: 256}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={labTrends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={11} stroke="#94a3b8" />
                                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <Tooltip />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '14px' }} />
                                <Line yAxisId="left" type="monotone" dataKey="avg_hba1c" stroke="#ef4444" strokeWidth={2} dot={false} name="HbA1c" />
                                <Line yAxisId="right" type="monotone" dataKey="avg_chol" stroke="#3b82f6" strokeWidth={2} dot={false} name="Cholesterol" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* Row 4: Site Trends */}
            <div className="mb-6">
                <ChartCard title="Site Trends" subtitle="Uncontrolled Cases Over Time by Site">
                    <div className="h-72" style={{minHeight: 288}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={siteTrends}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="#94a3b8" />
                                <Tooltip />
                                <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                {siteNames.slice(0, 6).map((site, idx) => (
                                    <Line 
                                        key={site} 
                                        type="monotone" 
                                        dataKey={site} 
                                        stroke={SITE_COLORS[idx % SITE_COLORS.length]} 
                                        strokeWidth={2} 
                                        dot={false} 
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

        </div>
    );
};

export default AnalyticsDashboard;

