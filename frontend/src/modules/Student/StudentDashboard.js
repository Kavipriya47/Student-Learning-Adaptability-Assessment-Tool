import React, { useState, useEffect } from 'react';
import api from '../../api';
import {
    ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart
} from 'recharts';
import {
    Target, TrendingUp, BookOpen, Sparkles, Activity,
    Zap, Award, User, ArrowRight, ShieldCheck, AlertCircle
} from 'lucide-react';
import './StudentDashboard.css';

// Confidence bar colour based on score
const confidenceColor = (c) => c >= 80 ? 'bg-success' : c >= 60 ? 'bg-warning' : 'bg-danger';
const confidenceLabel = (c) => c === 100 ? 'Full Data' : c >= 80 ? 'High Confidence' : c >= 60 ? 'Partial Data' : 'Low Confidence';

const StudentDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await api.get('/api/student/dashboard');
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch student dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-text-dim font-bold uppercase tracking-widest text-[10px]">Retrieving Performance Matrix</p>
            </div>
        );
    }

    if (!data) return (
        <div className="p-8 text-danger font-bold text-center flex flex-col items-center gap-3">
            <AlertCircle size={40} />
            Protocol Error: Failed to synchronise dashboard data.
        </div>
    );

    const s = data.analytics; // score object
    const confidence = data.confidence ?? 0;

    const radarData = [
        { subject: 'Academic', A: s.academic ?? 0, fullMark: 100 },
        { subject: 'Attendance', A: s.attendance ?? 0, fullMark: 100 },
        { subject: 'Skills', A: s.skills ?? 0, fullMark: 100 },
        { subject: 'Assignments', A: s.assignments ?? 0, fullMark: 100 },
        { subject: 'Recovery', A: s.recovery ?? 70, fullMark: 100 },
    ];

    const trendData = data.history && data.history.length > 0
        ? data.history.map(h => ({ name: new Date(h.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), score: parseFloat(h.score) }))
        : [
            { name: 'Baseline', score: 60 },
            { name: 'Current', score: parseFloat(data.finalScore) },
        ];

    const getRecommendations = () => {
        const recs = [];
        if (s.academic !== null && s.academic < 60) recs.push({ text: 'Consult faculty for subject-level support', type: 'Academic', icon: BookOpen });
        if (s.attendance !== null && s.attendance < 75) recs.push({ text: 'Improve daily attendance — alert threshold', type: 'Attendance', icon: Activity });
        if (s.assignments !== null && s.assignments < 50) recs.push({ text: 'Submit pending assignments immediately', type: 'Assignments', icon: Zap });
        if (s.skills !== null && s.skills < 40) recs.push({ text: 'Engage in dept activities to earn points', type: 'Skills', icon: Award });
        if (s.recovery !== null && s.recovery < 60) recs.push({ text: 'Schedule a mentor discussion to plan recovery', type: 'Recovery', icon: User });
        if (recs.length === 0) recs.push({ text: 'Maintain current growth trajectory — excellent work!', type: 'General', icon: Sparkles });
        return recs.slice(0, 3);
    };

    const recommendations = getRecommendations();

    // Scorecard dimensions for display
    const dimensions = [
        { key: 'academic', label: 'Academic', weight: '30%', color: 'text-primary' },
        { key: 'attendance', label: 'Attendance', weight: '20%', color: 'text-success' },
        { key: 'assignments', label: 'Assignments', weight: '20%', color: 'text-accent' },
        { key: 'skills', label: 'Skills', weight: '15%', color: 'text-warning' },
        { key: 'recovery', label: 'Recovery', weight: '15%', color: 'text-info' },
    ];

    return (
        <div className="space-y-8 animate-slide-up">
            {/* ── Identity Hub ── */}
            <div className="glass-card flex flex-col md:flex-row items-center gap-8 border-primary/20 p-8">
                <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-glow-primary shrink-0 overflow-hidden">
                    {data.student.profile_pic ? (
                        <img src={data.student.profile_pic} alt={data.student.name} className="w-full h-full object-cover" />
                    ) : (
                        <User size={48} />
                    )}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                        <h1 className="text-4xl font-black font-outfit text-white tracking-tight">{data.student.name}</h1>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${parseFloat(data.finalScore) < 60 ? 'bg-danger/10 text-danger border-danger/30' : 'bg-success/10 text-success border-success/20'}`}>
                            {parseFloat(data.finalScore) >= 75 ? 'High Performer' : parseFloat(data.finalScore) >= 60 ? 'In Progress' : 'Needs Attention'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Roll No.', value: data.student.roll_no },
                            { label: 'Department', value: data.student.dept_name },
                            { label: 'Batch', value: data.student.batch_name },
                            { label: 'Mentor', value: data.student.mentor_name || 'Unassigned', accent: true },
                        ].map(({ label, value, accent }) => (
                            <div key={label} className="flex flex-col">
                                <span className="text-[9px] text-text-dim font-black uppercase tracking-widest mb-1 opacity-60">{label}</span>
                                <span className={`font-bold ${accent ? 'text-primary' : 'text-white'}`}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Row 1: Score Card + Radar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Score + Confidence Card */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Adaptability Score */}
                    <div className="glass-card p-8 flex flex-col items-center justify-center text-center border-primary/30 bg-primary/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <Target size={120} />
                        </div>
                        <p className="text-text-dim text-[10px] font-black uppercase tracking-[0.2em] mb-3 relative z-10">Current Adaptability Score</p>
                        <h4 className="text-8xl font-black text-white font-outfit tracking-tighter mb-2 relative z-10">
                            {data.finalScore}
                        </h4>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border relative z-10 ${parseFloat(data.finalScore) >= 75 ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                            {parseFloat(data.finalScore) >= 75 ? 'Optimal Performance' : 'Growth Required'}
                        </div>
                    </div>

                    {/* Data Confidence Widget */}
                    <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className={confidence >= 80 ? 'text-success' : confidence >= 60 ? 'text-warning' : 'text-danger'} />
                                <h4 className="text-sm font-black font-outfit text-white uppercase tracking-widest">Data Confidence</h4>
                            </div>
                            <span className={`text-2xl font-black font-outfit ${confidence >= 80 ? 'text-success' : confidence >= 60 ? 'text-warning' : 'text-danger'}`}>
                                {confidence}%
                            </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ${confidenceColor(confidence)}`}
                                style={{ width: `${confidence}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-text-dim font-bold uppercase tracking-widest mb-4">
                            {confidenceLabel(confidence)} — {confidence < 100 ? 'Some dimensions still awaiting data' : 'All metrics available'}
                        </p>
                        {/* Per-dimension breakdown */}
                        <div className="space-y-2">
                            {dimensions.map(({ key, label, weight, color }) => {
                                const score = s[key];
                                const status = data.breakdown?.[key] ?? (score !== null ? 'Computed' : 'Pending');
                                const hasData = score !== null;
                                return (
                                    <div key={key} className="flex items-center justify-between text-[10px]">
                                        <span className={`font-black uppercase tracking-widest ${color}`}>{label} <span className="text-text-dim font-medium normal-case tracking-normal">({weight})</span></span>
                                        <span className={`font-bold ${hasData ? 'text-success' : 'text-text-dim opacity-60'}`}>
                                            {hasData ? `${typeof score === 'number' ? score.toFixed(1) : score}` : '—'}
                                            {' · '}
                                            <span className={hasData ? 'text-text-muted' : 'text-danger/70'}>{status}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rewards Gap Widget */}
                    {data.reward_stats && (
                        <div className="glass-card p-6 border-white/5 bg-white/[0.02] relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={18} className="text-accent" />
                                    <h4 className="text-sm font-black font-outfit text-white uppercase tracking-widest">Rewards Trajectory</h4>
                                </div>
                                <span className="text-xl font-black font-outfit text-white">
                                    {data.reward_stats.total} <span className="text-[10px] text-text-dim">Pts</span>
                                </span>
                            </div>
                            <div className="space-y-2 relative">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-[10px] font-black text-text-dim uppercase tracking-widest">Dept Baseline</div>
                                        <div className="text-sm font-bold text-white">{data.reward_stats.dept_avg.toFixed(1)} Pts</div>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative mb-2">
                                    <div
                                        className="absolute top-0 left-0 h-full bg-accent transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (data.reward_stats.total / (data.reward_stats.dept_avg || 1)) * 100)}%` }}
                                    />
                                </div>
                                {data.reward_stats.total < data.reward_stats.dept_avg && (
                                    <div className="text-[10px] text-warning text-right font-medium">
                                        Lagging by {(data.reward_stats.dept_avg - data.reward_stats.total).toFixed(1)} Pts to reach baseline
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Dimension Bars */}
                <div className="lg:col-span-8 glass-card min-h-[480px] flex flex-col relative overflow-hidden">
                    <div className="p-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                        <h3 className="text-xl font-bold font-outfit text-white tracking-tight">Performance Vector Analysis</h3>
                        <Activity className="text-primary/40" size={20} />
                    </div>
                    <div className="flex-1 p-8 space-y-8 flex flex-col justify-center">
                        {radarData.map((item, idx) => {
                            const colors = ['bg-primary', 'bg-success', 'bg-warning', 'bg-accent', 'bg-info'];
                            const color = colors[idx % colors.length];
                            return (
                                <div key={idx} className="space-y-3">
                                    <div className="flex justify-between items-end text-sm">
                                        <span className="font-bold text-white uppercase tracking-wider">{item.subject}</span>
                                        <span className={`font-black ${color.replace('bg-', 'text-')}`}>{item.A.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden ring-1 ring-white/10 ring-inset">
                                        <div 
                                            className={`h-full ${color} transition-all duration-1000 origin-left shadow-[0_0_15px_rgba(255,255,255,0.2)]`} 
                                            style={{ width: `${Math.min(100, item.A)}%` }} 
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Mentor's Instructions ── */}
            {data.mentor_instructions && data.mentor_instructions.length > 0 && (
                <div className="glass-card border-accent/30 bg-accent/5 animate-slide-up">
                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent/20 rounded-lg text-accent">
                                <Zap size={20} />
                            </div>
                            <h3 className="text-xl font-bold font-outfit text-white tracking-tight">Mentor's Strategic Instructions</h3>
                        </div>
                        <span className="text-[10px] font-black text-accent uppercase tracking-widest bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20">Directives</span>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.mentor_instructions.map((note, idx) => (
                            <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl relative overflow-hidden group hover:border-accent/40 transition-all">
                                <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-50"></div>
                                <p className="text-sm text-white font-medium leading-relaxed mb-4">{note.text}</p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-[9px] font-black text-accent uppercase tracking-[0.1em]">{note.type}</span>
                                    <span className="text-[9px] text-text-dim font-bold">{new Date(note.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Row 2: Timeline + Recommendations ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Historical Trend */}
                <div className="lg:col-span-7 glass-card flex flex-col border-accent/20">
                    <div className="p-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                        <h3 className="text-xl font-bold font-outfit text-white tracking-tight">Historical Adaptability Trend</h3>
                        <TrendingUp className="text-accent" size={20} />
                    </div>
                    <div className="p-8 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" fontSize={12} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="rgba(255,255,255,0.6)" fontSize={12} fontWeight={600} axisLine={false} tickLine={false} domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '13px' }} itemStyle={{ color: '#a78bfa', fontWeight: 800 }} />
                                <Area type="monotone" dataKey="score" stroke="hsl(262, 83%, 58%)" strokeWidth={4} fillOpacity={1} fill="url(#colorScore)" dot={{ fill: 'hsl(262, 83%, 58%)', r: 5, strokeWidth: 2, stroke: '#fff' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="lg:col-span-5 glass-card">
                    <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                        <h3 className="text-xl font-bold font-outfit text-white tracking-tight">Action Recommendations</h3>
                    </div>
                    <div className="p-8 space-y-4">
                        {recommendations.map((rec, i) => (
                            <div key={i} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4 group hover:border-primary/40 transition-all cursor-pointer">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shrink-0">
                                    <rec.icon size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{rec.type}</p>
                                    <p className="text-sm font-bold text-white leading-tight">{rec.text}</p>
                                </div>
                                <ArrowRight size={16} className="text-text-dim group-hover:translate-x-1 transition-transform shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Subject-wise Matrix ── */}
            <div className="glass-card p-0 overflow-hidden border-white/5">
                <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                    <h3 className="text-xl font-bold font-outfit text-white tracking-tight">Subject-wise Academic Matrix</h3>
                    <p className="text-xs text-text-dim mt-1">PT scores normalised to 100. Assignment out of 100. Grade converted to %.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="slaa-table">
                        <thead>
                            <tr>
                                <th className="pl-8">Module</th>
                                <th className="text-center">PT-1 <span className="text-text-dim font-normal">/50</span></th>
                                <th className="text-center">PT-2 <span className="text-text-dim font-normal">/50</span></th>
                                <th className="text-center">Assignment <span className="text-text-dim font-normal">/100</span></th>
                                <th className="text-center">Grade</th>
                                <th className="text-center pr-8">Module Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.marks.map((mark, idx) => {
                                // Compute per-subject academic for display
                                const parts = [];
                                if (mark.pt1 !== null && mark.pt1 !== undefined && mark.pt1 !== '') parts.push((Number(mark.pt1) / 50) * 100);
                                if (mark.pt2 !== null && mark.pt2 !== undefined && mark.pt2 !== '') parts.push((Number(mark.pt2) / 50) * 100);
                                const gradeMap = { S: 95, A: 85, B: 75, C: 65, D: 55, F: 40, U: 30 };
                                if (mark.semester_grade) parts.push(gradeMap[mark.semester_grade.toUpperCase()] || 0);
                                const moduleScore = parts.length > 0 ? (parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(1) : null;

                                return (
                                    <tr key={idx} className="group hover:bg-white/[0.03] transition-colors">
                                        <td className="pl-8">
                                            <div className="flex items-center gap-4 py-2">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                    <BookOpen size={18} />
                                                </div>
                                                <p className="font-bold text-white group-hover:text-primary transition-colors">{mark.subject_name}</p>
                                            </div>
                                        </td>
                                        <td className="text-center font-mono text-sm text-text-dim">{mark.pt1 ?? '--'}</td>
                                        <td className="text-center font-mono text-sm text-text-dim">{mark.pt2 ?? '--'}</td>
                                        <td className="text-center font-mono text-sm text-text-dim">{mark.assignment ?? '--'}</td>
                                        <td className="text-center font-black text-xl text-primary font-outfit tracking-tighter">{mark.semester_grade || '—'}</td>
                                        <td className="text-center pr-8">
                                            {moduleScore
                                                ? <span className={`font-black text-base font-outfit ${Number(moduleScore) >= 60 ? 'text-success' : 'text-danger'}`}>{moduleScore}</span>
                                                : <span className="text-text-dim text-xs italic">Pending</span>
                                            }
                                        </td>
                                    </tr>
                                );
                            })}
                            {data.marks.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center py-24 text-text-dim italic">No academic records in current sync cycle.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
