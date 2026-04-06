import React from 'react';
import { Users, Gauge, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';

const AnalyticsSummary = ({ summary }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card border-l-4 border-primary p-6">
            <div className="flex items-center justify-between mb-4">
                <Users className="text-primary" size={20} />
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Total Students</span>
            </div>
            <h3 className="text-3xl font-black text-white">{summary.total}</h3>
        </div>
        <div className="glass-card border-l-4 border-success p-6">
            <div className="flex items-center justify-between mb-4">
                <Gauge className="text-success" size={20} />
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Coverage</span>
            </div>
            <div className="flex items-end gap-2">
                <h3 className="text-3xl font-black text-white">{summary.coverage_percent}%</h3>
                <span className="text-xs text-text-dim mb-1">({summary.evaluated}/{summary.total})</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-4 overflow-hidden">
                <div
                    className="bg-success h-full transition-all duration-1000"
                    style={{ width: `${summary.coverage_percent}%` }}
                />
            </div>
        </div>
        <div className="glass-card border-l-4 border-accent p-6">
            <div className="flex items-center justify-between mb-4">
                <Sparkles className="text-accent" size={20} />
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Avg Adaptability</span>
            </div>
            <h3 className="text-3xl font-black text-white">{summary.avg_score}</h3>
        </div>
        <div className="glass-card border-l-4 border-error p-6">
            <div className="flex items-center justify-between mb-4">
                <AlertCircle className="text-error" size={20} />
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Critical Risks</span>
            </div>
            <h3 className="text-3xl font-black text-white">{summary.critical_risk_count}</h3>
        </div>
        <div className="glass-card border-l-4 border-warning p-6">
            <div className="flex items-center justify-between mb-4">
                <ShieldCheck className="text-warning" size={20} />
                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Mentorship Coverage</span>
            </div>
            <div className="flex items-end gap-2">
                <h3 className="text-3xl font-black text-white">
                    {summary.total > 0
                        ? (((summary.total - summary.unassigned_mentors_count) / summary.total) * 100).toFixed(0)
                        : 0}%
                </h3>
                <span className="text-xs text-text-dim mb-1">
                    ({summary.total - (summary.unassigned_mentors_count || 0)}/{summary.total})
                </span>
            </div>
        </div>
    </div>
);

export default AnalyticsSummary;
