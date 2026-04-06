import React from 'react';
import { Sparkles, Info, History, AlertCircle, Users } from 'lucide-react';

const InsightSidebar = ({ insights, lastEval, skipped, analyticsData }) => (
    <div className="space-y-6">
        <div className="glass-card">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles size={16} className="text-accent" />
                Adaptive Insights
            </h3>
            <div className="space-y-3">
                {insights.length > 0 ? insights.map((insight, i) => (
                    <div key={i} className={`p-3 rounded-lg border flex gap-3 ${insight.severity === 'critical' ? 'bg-error/5 border-error/20 text-error' :
                        insight.severity === 'warning' ? 'bg-warning/5 border-warning/20 text-warning' :
                            'bg-info/5 border-info/20 text-info'
                        }`}>
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <p className="text-xs font-medium leading-relaxed">{insight.message}</p>
                    </div>
                )) : (
                    <p className="text-xs text-text-dim italic text-center py-4">No critical insights detected for this cycle.</p>
                )}
            </div>
        </div>

        {lastEval && (
            <div className="glass-card bg-primary/5 border-primary/20">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <History size={16} className="text-primary" />
                    Last Evaluation Audit
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-text-dim text-[10px] uppercase font-bold">Cycle</span>
                        <span className="text-white font-bold">{lastEval.cycle}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-text-dim text-[10px] uppercase font-bold">Time</span>
                        <span className="text-white font-bold">{new Date(lastEval.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-text-dim text-[10px] uppercase font-bold">Processed</span>
                        <span className="text-success font-bold">{lastEval.processed} students</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-text-dim text-[10px] uppercase font-bold">Skipped</span>
                        <span className="text-error font-bold">{lastEval.skipped} students</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                            <span className="text-text-dim uppercase font-bold">Coverage</span>
                            <span className="text-primary font-bold">{lastEval.coverage}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                            <div className="bg-primary h-full" style={{ width: `${lastEval.coverage}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {skipped.length > 0 && (
            <div className="glass-card border-warning/30">
                <h3 className="text-sm font-bold text-warning mb-4 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Data Integrity Alerts
                </h3>
                <p className="text-[10px] text-text-dim mb-4 leading-relaxed">
                    The following students were bypassed during last evaluation due to missing quantitative indicators.
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    {skipped.map((s, i) => (
                        <div key={i} className="p-2 bg-white/5 rounded border border-white/5">
                            <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-white font-bold">{s.name}</span>
                                <span className="text-text-dim">{s.roll}</span>
                            </div>
                            <div className="text-[9px] text-error font-medium truncate italic">{s.reason}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {analyticsData.unassigned_students && analyticsData.unassigned_students.length > 0 && (
            <div className="mb-6">
                <div className="flex items-center gap-2 text-warning mb-3">
                    <Users size={14} className="animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider">Unassigned Mentors ({analyticsData.unassigned_students.length})</span>
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {analyticsData.unassigned_students.map((s, i) => (
                        <div key={i} className="p-2 bg-white/5 rounded border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-white font-bold">{s.name}</span>
                                <span className="text-text-dim">{s.roll}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

export default InsightSidebar;
