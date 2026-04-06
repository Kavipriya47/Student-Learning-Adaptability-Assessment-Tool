import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const RiskDistribution = ({ data }) => {
    const chartData = [
        { name: 'High Performer', value: data.high, color: '#10b981' },
        { name: 'Stable', value: data.stable, color: '#3b82f6' },
        { name: 'Needs Attention', value: data.warning, color: '#f59e0b' },
        { name: 'Critical Risk', value: data.critical, color: '#ef4444' }
    ].filter(d => d.value > 0);

    return (
        <div className="glass-card h-[400px] flex flex-col">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <LayoutDashboard size={18} className="text-primary" />
                Cohort Risk Distribution
            </h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ background: '#1a1d24', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default RiskDistribution;
