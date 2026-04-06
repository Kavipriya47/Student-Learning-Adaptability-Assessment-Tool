import React from 'react';
import { TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const GrowthTrend = ({ trends }) => (
    <div className="glass-card h-[400px] flex flex-col">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-accent" />
            Institutional Growth Trend
        </h3>
        <div className="flex-1 min-h-0">
            {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trends}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="cycle" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                            contentStyle={{ background: '#1a1d24', border: '1px solid #334155', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="avg_score" stroke="#818cf8" fillOpacity={1} fill="url(#colorScore)" />
                    </AreaChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-dim text-xs italic">
                    No temporal data available for trend analysis.
                </div>
            )}
        </div>
    </div>
);

export default GrowthTrend;
