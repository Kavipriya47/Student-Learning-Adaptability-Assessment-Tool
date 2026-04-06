import React from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';

const PriorityStudentTable = ({ filtered, onStudentClick, studentSearch, riskFilter }) => {
    return (
        <div className="glass-card flex-1 flex flex-col pt-0 mt-0 md:mt-0 rounded-t-none border-t-0 shadow-none">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar pr-2 flex-1">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-text-dim text-xs uppercase tracking-widest border-b border-white/5 sticky top-0 bg-bg-surface z-10">
                            <th className="px-4 py-3 font-medium">Student</th>
                            <th className="px-4 py-3 font-medium text-center">Score</th>
                            <th className="px-4 py-3 font-medium text-center">Trend</th>
                            <th className="px-4 py-3 font-medium text-center">Risk Level</th>
                            <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filtered.length > 0 ? filtered.map((s) => (
                            <tr
                                key={s.roll}
                                className="group hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => onStudentClick(s.roll)}
                            >
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 border border-white/10 shrink-0">
                                            {s.profile_pic ? (
                                                <img src={s.profile_pic} alt={s.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary">
                                                    {s.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white group-hover:text-primary transition-colors">{s.name}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="px-1.5 py-0.5 bg-white/5 text-text-dim rounded text-[8px] font-black uppercase tracking-widest">{s.roll}</span>
                                                {s.factors && s.factors.map((f, fi) => (
                                                    <span key={fi} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border
                                                        ${f === 'Critical Risk' ? 'bg-error/10 text-error border-error/20' :
                                                            f === 'Needs Attention' ? 'bg-warning/10 text-warning border-warning/20' :
                                                                'bg-primary/10 text-primary border-primary/20'}`}>
                                                        {f}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <div className="text-white font-black">{s.score}</div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <div className={`flex items-center justify-center gap-1 font-bold ${parseFloat(s.trend) >= 0 ? 'text-success' : 'text-error'}`}>
                                        {parseFloat(s.trend) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        {Math.abs(s.trend)}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                                        ${s.category === 'critical' ? 'bg-error/10 text-error border border-error/20' :
                                            s.category === 'warning' ? 'bg-warning/10 text-warning border border-warning/20' :
                                                s.category === 'stable' ? 'bg-primary/10 text-primary border border-primary/20' :
                                                    'bg-success/10 text-success border border-success/20'}`}
                                    >
                                        {s.category}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <div className="text-text-dim group-hover:text-white transition-colors flex justify-end">
                                        <ChevronRight size={18} />
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="px-4 py-12 text-center text-text-dim italic text-xs">
                                    {studentSearch
                                        ? 'No students match your search criteria.'
                                        : riskFilter !== 'all'
                                            ? `No students found for the "${riskFilter}" risk category.`
                                            : 'No student performance data available for this batch yet.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PriorityStudentTable;
