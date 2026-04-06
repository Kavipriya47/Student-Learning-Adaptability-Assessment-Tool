import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import {
    Users,
    AlertCircle,
    CheckCircle2,
    Search,
    ArrowUpRight,
    Sparkles,
    Activity,
    ShieldAlert,
    AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './MentorDashboard.css';

const MentorDashboard = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter] = useState({ dept: '', batch: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [stats, setStats] = useState({ total: 0, critical: 0, moderate: 0, stable: 0 });

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);


    useEffect(() => {
        fetchStudents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/mentor/my-students?dept_id=${filter.dept}&batch_id=${filter.batch}`);
            setStudents(res.data);

            const critical = res.data.filter(s => s.risk_priority === 'Critical Risk').length;
            const moderate = res.data.filter(s => s.risk_priority === 'Moderate Risk').length;
            const stable = res.data.filter(s => s.risk_priority === 'Stable').length;

            setStats({
                total: res.data.length,
                critical,
                moderate,
                stable
            });
        } catch (err) {
            console.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    };



    const filteredStudents = useMemo(() => {
        const query = debouncedSearch.toLowerCase();
        return students.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.roll_no.toLowerCase().includes(query)
        );
    }, [students, debouncedSearch]);

    const renderStudentGroup = (groupName, icon, groupStudents, badgeClass) => {
        if (groupStudents.length === 0) return null;

        const INTERVENTION_OPTIONS = ['No Action Needed', 'Monitoring', 'Meeting Scheduled', 'Under Mentorship Plan'];

        return (
            <div className="mb-8">
                <div className={`flex items-center gap-3 mb-4 px-2`}>
                    {icon}
                    <h4 className="text-xl font-black font-outfit text-white">{groupName}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest ${badgeClass}`}>
                        {groupStudents.length} Students
                    </span>
                </div>
                <div className="glass-card p-0 overflow-hidden border-white/5">
                    <div className="overflow-x-auto">
                        <table className="slaa-table">
                            <thead>
                                <tr>
                                    <th className="pl-8">Student</th>
                                    <th>Dept / Batch</th>
                                    <th className="text-center">Attendance</th>
                                    <th className="text-center">Adaptability</th>
                                    <th>Risk Factors</th>
                                    <th className="text-center">Priority Level</th>
                                    <th className="pr-8 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupStudents.map((student) => {
                                    return (
                                        <tr key={student.roll_no} className="group hover:bg-white/[0.03] transition-colors">
                                            <td className="pl-8">
                                                <div className="flex items-center gap-4">
                                                    {student.profile_pic ? (
                                                        <img 
                                                            src={student.profile_pic} 
                                                            alt={student.name} 
                                                            className="w-10 h-10 rounded-xl object-cover border border-white/10"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-accent font-outfit">
                                                            {student.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{student.name}</p>
                                                        <p className="text-[10px] text-text-dim font-black tracking-widest mt-1 uppercase opacity-60">{student.roll_no}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <p className="text-xs font-bold text-white mb-1">{student.dept_name}</p>
                                                <span className="text-[9px] text-text-dim font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">{student.batch_name}</span>
                                            </td>
                                            <td>
                                                <div className="flex flex-col items-center gap-1 text-center">
                                                    <span className={`text-sm font-black tracking-tighter ${student.avg_attendance === null ? 'text-text-dim' :
                                                        student.avg_attendance < 75 ? 'text-danger' : 'text-success'
                                                        }`}>
                                                        {student.avg_attendance !== null ? `${Number(student.avg_attendance).toFixed(1)}%` : 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <Activity size={12} className={parseFloat(student.adaptability_score) < 60 ? 'text-danger' : 'text-accent'} />
                                                        <span className="font-black text-white font-outfit text-base tracking-tighter">
                                                            {student.adaptability_score ?? 'N/A'}
                                                        </span>
                                                    </div>
                                                    {student.confidence !== undefined && (
                                                        <span className={`text-[9px] font-bold uppercase tracking-widest ${student.confidence >= 80 ? 'text-success' : student.confidence >= 60 ? 'text-warning' : 'text-danger'
                                                            }`}>{student.confidence}% conf.</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-wrap gap-1 max-w-[150px]">
                                                    {student.risk_factors && student.risk_factors.map((factor, i) => (
                                                        <span key={i} className="text-[9px] bg-danger/10 text-danger px-1.5 py-0.5 rounded border border-danger/20" title={factor}>
                                                            {factor.length > 20 ? factor.substring(0, 20) + '...' : factor}
                                                        </span>
                                                    ))}
                                                    {(!student.risk_factors || student.risk_factors.length === 0) && (
                                                        <span className="text-[9px] text-text-dim italic">None</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex justify-center">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-md border
                                                        ${student.risk_priority === 'Stable' ? 'bg-white/5 border-white/10 text-white' :
                                                            student.risk_priority === 'Moderate Risk' ? 'bg-warning/10 border-warning/20 text-warning' :
                                                                'bg-danger/10 border-danger/20 text-danger'}`}>
                                                        {student.risk_priority || 'Unassigned'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="pr-8 text-right">
                                                <Link
                                                    to={`/mentor/student/${student.roll_no}`}
                                                    className="inline-flex w-8 h-8 rounded-lg text-text-dim hover:text-white hover:bg-white/10 transition-all items-center justify-center"
                                                    title="View Profile Dossier"
                                                >
                                                    <ArrowUpRight size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-10 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold font-outfit text-white flex items-center gap-3 tracking-tight">
                        Mentorship Portal
                        <Sparkles className="text-accent animate-pulse" size={24} />
                    </h1>
                    <p className="text-text-muted mt-2">Strategic intervention and student adaptability monitoring</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card flex items-center gap-4 border-primary/20 p-5">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-text-dim text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Assigned Cohort</p>
                        <h3 className="text-2xl font-black text-white font-outfit">{stats.total}</h3>
                    </div>
                </div>

                <div className="glass-card flex items-center gap-4 border-danger/30 p-5 shadow-glow-danger/10">
                    <div className="p-3 bg-danger/10 rounded-xl text-danger ring-1 ring-danger/30">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <p className="text-text-dim text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Critical Risk</p>
                        <h3 className="text-2xl font-black text-white font-outfit">{stats.critical}</h3>
                    </div>
                </div>

                <div className="glass-card flex items-center gap-4 border-warning/30 p-5">
                    <div className="p-3 bg-warning/10 rounded-xl text-warning ring-1 ring-warning/30">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-text-dim text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Moderate Risk</p>
                        <h3 className="text-2xl font-black text-white font-outfit">{stats.moderate}</h3>
                    </div>
                </div>

                <div className="glass-card flex items-center gap-4 border-success/20 p-5">
                    <div className="p-3 bg-success/10 rounded-xl text-success ring-1 ring-success/20">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-text-dim text-[9px] font-black uppercase tracking-[0.2em] mb-0.5">Stable Profile</p>
                        <h3 className="text-2xl font-black text-white font-outfit">{stats.stable}</h3>
                    </div>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="glass-card py-4 px-6 flex flex-wrap items-center justify-between gap-6 border-white/5 bg-white/[0.02]">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                    <input
                        type="text"
                        placeholder="Search mentees by name or roll no..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-accent transition-all placeholder:text-text-dim/50"
                    />
                </div>
            </div>

            {/* Priority Grouped Renderings */}
            <div className="space-y-6">
                {renderStudentGroup(
                    "Critical Attention Required",
                    <ShieldAlert className="text-danger" size={24} />,
                    filteredStudents.filter(s => s.risk_priority === 'Critical Risk'),
                    "bg-danger/20 text-danger border border-danger/30"
                )}

                {renderStudentGroup(
                    "Moderate Monitoring",
                    <AlertTriangle className="text-warning" size={24} />,
                    filteredStudents.filter(s => s.risk_priority === 'Moderate Risk'),
                    "bg-warning/20 text-warning border border-warning/30"
                )}

                {renderStudentGroup(
                    "Stable Profile",
                    <CheckCircle2 className="text-success" size={24} />,
                    filteredStudents.filter(s => s.risk_priority === 'Stable'),
                    "bg-success/10 text-success border border-success/20"
                )}

                {filteredStudents.length === 0 && !loading && (
                    <div className="py-20 text-center glass-card">
                        <AlertCircle size={48} className="mx-auto text-text-dim mb-4" />
                        <h3 className="text-xl font-bold font-outfit text-text-muted italic">No matching personnel records retrieved.</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MentorDashboard;
