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

const RiskStratificationPie = ({ patients }) => {
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

    return (
        <ChartCard title="Cohort Risk Stratification" subtitle="Patient Risk Levels">
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
                        >
                            {riskDistribution.map((entry, index) => (
                                <Cell key={entry.name} fill={
                                    entry.name === 'High' ? COLORS.High :
                                    entry.name === 'Low' ? COLORS.Low :
                                    entry.name === 'Medium' ? COLORS.Medium :
                                    entry.name === 'N/A' ? COLORS['N/A'] : '#64748b'
                                } />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </ChartCard>
    );
};

export default RiskStratificationPie;
