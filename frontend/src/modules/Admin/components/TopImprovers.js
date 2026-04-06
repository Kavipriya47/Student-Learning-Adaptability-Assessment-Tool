import React from 'react';
import { Sparkles, ArrowUpRight } from 'lucide-react';

const TopImprovers = ({ students }) => (
    <div className="glass-card flex-1">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles size={18} className="text-success" />
            Institutional High Improvers
        </h3>
        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {students && students.length > 0 ? students.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-success/5 rounded-lg border border-success/10 group hover:border-success/30 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-success/10 border border-success/20 shrink-0">
                                {s.profile_pic ? (
                                    <img src={s.profile_pic} alt={s.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-success capitalize">
                                        {s.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success text-[8px] font-black flex items-center justify-center text-white border border-bg-surface">
                                {i + 1}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white leading-tight">{s.name}</div>
                            <div className="text-[10px] text-text-dim uppercase tracking-wider mt-0.5">{s.roll}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-success font-black text-lg flex items-center gap-1">
                            <ArrowUpRight size={16} />
                            +{s.trend}
                        </div>
                        <div className="text-[10px] text-success/70 font-bold uppercase tracking-widest">Growth Delta</div>
                    </div>
                </div>
            )) : (
                <p className="text-xs text-text-dim italic text-center py-8">No significant improvers detected.</p>
            )}
        </div>
    </div>
);

export default TopImprovers;
