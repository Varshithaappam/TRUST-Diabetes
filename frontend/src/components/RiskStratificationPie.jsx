import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = {
    High: '#ef4444',
    Low: '#10b981',
    Medium: '#f59e0b',
    'N/A': '#64748b'
};

const ChartCard = ({ title, subtitle, children }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300">
        <div className="mb-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">{title}</h3>
            <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tight">{subtitle}</p>
        </div>
        {children}
    </div>
);

const RiskStratificationPie = ({ patients, onRiskFilterChange, activeRiskFilter }) => {
    // Calculate risk distribution dynamically based on scored patients
    const riskDistribution = React.useMemo(() => {
        if (!patients || patients.length === 0) {
            return [
                { name: 'High', value: 0 },
                { name: 'Low', value: 0 },
                { name: 'Medium', value: 0 },
                { name: 'N/A', value: 0 }
            ];
        }

        const counts = { High: 0, Medium: 0, Low: 0, 'N/A': 0 };
        patients.forEach(p => {
            if (p.riskLabel) {
                counts[p.riskLabel]++;
            }
        });

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [patients]);

    // Handle click on pie segment
    const handleClick = (data) => {
        if (onRiskFilterChange) {
            // Toggle: if clicking same segment, deselect it
            if (activeRiskFilter === data.name) {
                onRiskFilterChange(null);
            } else {
                onRiskFilterChange(data.name);
            }
        }
    };

    // Determine if a segment should be dimmed (when another filter is active)
    const isDimmed = (segmentName) => {
        return activeRiskFilter && activeRiskFilter !== segmentName;
    };

    return (
        <ChartCard title="Cohort Risk Stratification" subtitle="Click to Filter">
            <div className="h-64 flex items-center justify-center" style={{ minHeight: 256 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={riskDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={0}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            onClick={handleClick}
                            style={{ cursor: 'pointer' }}
                        >
                            {riskDistribution.map((entry) => (
                                <Cell 
                                    key={entry.name} 
                                    fill={
                                        isDimmed(entry.name) 
                                            ? `${entry.name === 'High' ? COLORS.High : entry.name === 'Low' ? COLORS.Low : entry.name === 'Medium' ? COLORS.Medium : COLORS['N/A']}33`
                                            : entry.name === 'High' ? COLORS.High :
                                            entry.name === 'Low' ? COLORS.Low :
                                            entry.name === 'Medium' ? COLORS.Medium :
                                            entry.name === 'N/A' ? COLORS['N/A'] : '#64748b'
                                    }
                                    stroke={activeRiskFilter === entry.name ? '#1e293b' : 'none'}
                                    strokeWidth={activeRiskFilter === entry.name ? 3 : 0}
                                />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
                💡 Click on segments to filter High Risk Candidates
            </p>
        </ChartCard>
    );
};

export default RiskStratificationPie;
