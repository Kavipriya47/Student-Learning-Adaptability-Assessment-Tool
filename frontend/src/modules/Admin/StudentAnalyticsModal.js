import React, { useState, useEffect } from 'react';
import {
    X, TrendingUp, AlertCircle, Shield, Download, Trash2,
    Activity, Edit2, Clock, Check, BookOpen, Camera, User as UserIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import ImageUpload from '../../components/ImageUpload';
import {
    ResponsiveContainer, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar,
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import api from '../../api';
import { useSelector } from 'react-redux';

const StudentAnalyticsModal = ({ roll, onClose, onDataChange }) => {
    const { role } = useSelector(state => state.auth);
    const isAdmin = role === 'Admin';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editingAttendance, setEditingAttendance] = useState(null);
    const [updatingAttendance, setUpdatingAttendance] = useState(false);
    const [showAddAttendance, setShowAddAttendance] = useState(false);
    const [newAttendance, setNewAttendance] = useState({ semester: '', percentage: '' });

    useEffect(() => {
        if (showAddAttendance && data?.student?.semester) {
            setNewAttendance(prev => ({ ...prev, semester: data.student.semester }));
        }
    }, [showAddAttendance, data]);

    const [editingMarks, setEditingMarks] = useState(null);
    const [updatingMarks, setUpdatingMarks] = useState(false);

    const [editingRewards, setEditingRewards] = useState(null);
    const [updatingRewards, setUpdatingRewards] = useState(false);
    const [showAddReward, setShowAddReward] = useState(false);
    const [newReward, setNewReward] = useState({ points: '', category: '' });

    const [editingProfile, setEditingProfile] = useState(false);
    const [profileData, setProfileData] = useState({ name: '', semester: '', mentor_email: '' });

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                // Endpoint handles both Admin & Mentor roles now
                const res = await api.get(`/api/mentor/student-detail/${roll}`);
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch student analytics', err);
                setError(err.response?.data?.message || 'Statistical system synchronization failure.');
                setData(null);
            } finally {
                setLoading(false);
            }
        };
        if (roll) fetchStudentData();
    }, [roll]);

    const fetchStudentData = async () => {
        try {
            const res = await api.get(`/api/mentor/student-detail/${roll}`);
            setData(res.data);
            // Notify parent that data has changed
            if (onDataChange) onDataChange();
        } catch (err) {
            console.error('Failed to fetch student analytics', err);
            setError(err.response?.data?.message || 'Statistical system synchronization failure.');
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAttendance = async (sem, pct) => {
        setUpdatingAttendance(true);
        try {
            await api.post('/api/mentor/update-attendance', {
                student_roll: roll,
                semester: sem,
                percentage: pct
            });
            setEditingAttendance(null);
            setShowAddAttendance(false);
            setNewAttendance({ semester: '', percentage: '' });
            fetchStudentData();
        } catch (err) {
            console.error(err);
            toast.error('Error updating attendance');
        } finally {
            setUpdatingAttendance(false);
        }
    };

    const handleDeleteAttendance = async (attendanceId) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) return;
        try {
            await api.delete(`/api/mentor/attendance/${attendanceId}`);
            fetchStudentData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete attendance record.');
        }
    };

    const handleUpdateMarks = async (m) => {
        setUpdatingMarks(true);
        try {
            await api.post('/api/mentor/update-marks', {
                student_roll: roll,
                subject_id: m.subject_id,
                pt1: m.pt1,
                pt2: m.pt2,
                assignment: m.assignment,
                semester_grade: m.semester_grade
            });
            setEditingMarks(null);
            fetchStudentData();
        } catch (err) {
            console.error(err);
            toast.error('Error updating marks');
        } finally {
            setUpdatingMarks(false);
        }
    };

    const handleDeleteMarks = async (markId) => {
        if (!window.confirm('Are you sure you want to delete this academic record?')) return;
        try {
            await api.delete(`/api/mentor/marks/${markId}`);
            fetchStudentData();
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete marks.');
        }
    };

    const handleUpdateRewards = async (points, category, id = null) => {
        setUpdatingRewards(true);
        const finalId = id || editingRewards?._id || editingRewards?.id;
        try {
            await api.post('/api/mentor/update-rewards', {
                student_roll: roll,
                points: points,
                category: category,
                reward_id: finalId
            });
            setEditingRewards(null);
            setShowAddReward(false);
            setNewReward({ points: '', category: '' });
            await fetchStudentData();
        } catch (err) {
            console.error(err);
            toast.error('Error updating rewards: ' + (err.response?.data?.message || err.message));
        } finally {
            setUpdatingRewards(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/mentor/update-student-basic', {
                student_roll: roll,
                ...profileData
            });
            setEditingProfile(false);
            fetchStudentData();
        } catch (err) {
            console.error(err);
            toast.error('Error updating profile');
        }
    };

    const handleDeleteReward = async (rewardId) => {
        if (!window.confirm('Are you sure you want to remove this badge?')) return;
        try {
            await api.delete(`/api/mentor/reward/${rewardId}`);
            fetchStudentData();
        } catch (err) {
            console.error('Error deleting reward:', err);
        }
    };

    const handleExportStudentReport = () => {
        if (!data) return;
        const s = data.student;
        const ad = data.adaptability;
        const lines = [];
        lines.push(`SLAA Student Report - Generated ${new Date().toLocaleString('en-IN')}`);
        lines.push('');
        lines.push('=== STUDENT PROFILE ===');
        lines.push(`Name,${s.name}`);
        lines.push(`Roll No,${s.roll_no}`);
        lines.push(`Department,${s.dept_name}`);
        lines.push(`Batch,${s.batch_name}`);
        lines.push(`Semester,${s.semester}`);
        lines.push(`Mentor,${s.mentor_email || 'N/A'}`);
        lines.push('');
        lines.push('=== ADAPTABILITY SCORES ===');
        lines.push(`Overall Score,${ad.finalScore}`);
        lines.push(`Data Confidence,${ad.confidence}%`);
        lines.push(`Academic (30%),${ad.scores.academic !== null ? ad.scores.academic.toFixed(1) : 'N/A'}`);
        lines.push(`Attendance (20%),${ad.scores.attendance !== null ? ad.scores.attendance.toFixed(1) : 'N/A'}`);
        lines.push(`Assignments (20%),${ad.scores.assignments !== null ? ad.scores.assignments.toFixed(1) : 'N/A'}`);
        lines.push(`Skills (15%),${ad.scores.skills !== null ? ad.scores.skills.toFixed(1) : 'N/A'}`);
        lines.push(`Recovery (15%),${ad.scores.recovery !== null ? ad.scores.recovery.toFixed(1) : 'N/A'}`);
        lines.push('');
        lines.push('=== ATTENDANCE PER SEMESTER ===');
        lines.push('Semester,Percentage');
        (data.attendance || []).forEach(a => {
            if (a) lines.push(`${a.semester},${a.percentage}%`);
        });
        lines.push('');
        lines.push('=== ACADEMIC MARKS ===');
        lines.push('Subject,PT1,PT2,Assignment,Grade');
        (data.marks || []).forEach(m => {
            if (m) lines.push(`"${m.subject_name}",${m.pt1 ?? 'N/A'},${m.pt2 ?? 'N/A'},${m.assignment ?? 'N/A'},${m.semester_grade || 'N/A'}`);
        });
        lines.push('');
        lines.push('=== REWARDS / BADGES ===');
        lines.push('Category,Points');
        (data.rewards || []).forEach(r => lines.push(`"${r.category || 'General'}",${r.points}`));
        lines.push('');
        lines.push('=== EVALUATION HISTORY ===');
        lines.push('Date,Adaptability Score');
        (data.history || []).forEach(h => lines.push(`"${h.date}",${h.score}`));

        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SLAA_Report_${s.roll_no}_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const startEditingProfile = () => {
        setProfileData({
            name: data.student.name,
            semester: data.student.semester,
            mentor_email: data.student.mentor_email || ''
        });
        setEditingProfile(true);
    };

    if (!roll) return null;

    return (
        <div className="fixed inset-0 bg-bg-deep/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4 sm:p-8">
            <div className="glass-card max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border-primary/20 shadow-glow animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        {data?.student?.profile_pic ? (
                            <img 
                                src={data.student.profile_pic} 
                                alt={data.student.name} 
                                className="w-12 h-12 rounded-2xl object-cover border border-primary/20 shadow-glow-primary/20"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <Activity size={24} />
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-black text-white font-outfit uppercase tracking-tight">
                                {data ? data.student.name : 'Analytical Profile'}
                            </h2>
                            <p className="text-xs text-text-dim font-bold uppercase tracking-[0.2em]">
                                {roll} • Institutional Intelligence Drill-Down
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {data && (
                            <>
                                <div className={`hidden sm:flex flex-col items-center justify-center -space-y-1.5 px-4 py-1.5 rounded-lg border mr-4 ${data.student.mentor_name ? 'bg-accent/10 border-accent/20' : 'bg-warning/10 border-warning/20'}`}>
                                    <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${data.student.mentor_name ? 'text-accent' : 'text-warning'}`}>Assigned Mentor</span>
                                    <span className="text-[11px] font-bold text-white max-w-[150px] truncate leading-tight">
                                        {data.student.mentor_name || 'Unassigned'}
                                    </span>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('CRITICAL WARNING: This will permanently delete this student and ALL their associated data (Marks, Attendance, History, Rewards). This action cannot be undone. Are you absolutely certain?')) {
                                            try {
                                                // Call existing admin student delete endpoint if ID is known, else we might need a roll-based one.
                                                await api.delete(`/api/admin/students/roll/${roll}`);
                                                onClose();
                                                if (onDataChange) onDataChange();
                                            } catch (err) {
                                                console.error('Error deleting student:', err);
                                                toast.error('Error deleting student profile.');
                                            }
                                        }
                                    }}
                                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-danger/10 hover:bg-danger/20 border border-danger/30 rounded-lg text-[10px] font-black uppercase tracking-widest text-danger transition-all mr-2"
                                >
                                    <Trash2 size={14} />
                                    Purge
                                </button>
                                <button
                                    onClick={handleExportStudentReport}
                                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-white transition-all mr-2"
                                >
                                    <Download size={14} />
                                    Export
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-dim hover:text-white"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-black text-text-dim uppercase tracking-widest animate-pulse">Scanning Neural Profile...</p>
                    </div>
                ) : data ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                            {/* Left Column: Core Metrics & Radar */}
                            <div className="space-y-8">
                                <div className="glass-card bg-white/[0.02] border-white/5 flex flex-col items-center py-8">
                                    <div className="mb-6">
                                        {isAdmin ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <ImageUpload 
                                                    entityId={data.student.userId} 
                                                    currentImage={data.student.profile_pic} 
                                                    isAdmin={true}
                                                    onUpdate={() => fetchStudentData()}
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <div className="w-32 h-32 rounded-2xl border-4 border-white/5 overflow-hidden shadow-2xl">
                                                    {data.student.profile_pic ? (
                                                        <img src={data.student.profile_pic} alt={data.student.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary/20">
                                                            <UserIcon size={64} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative mb-6">
                                        <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
                                            <span className="text-3xl font-black text-white">{data.adaptability.finalScore}</span>
                                        </div>
                                        <div className={`absolute -bottom-2 right-0 px-3 py-1 rounded-full text-[10px] font-black uppercase
                                            ${data.adaptability.finalScore >= 80 ? 'bg-success text-bg-deep' :
                                                data.adaptability.finalScore >= 60 ? 'bg-primary text-white' :
                                                    'bg-error text-white'}`}>
                                            {data.adaptability.finalScore >= 80 ? 'High' : (data.adaptability.finalScore >= 60 ? 'Stable' : 'Critical')}
                                        </div>
                                    </div>
                                    <h3 className="text-xs font-black text-text-dim uppercase tracking-[0.2em]">Institutional Adaptability</h3>
                                </div>

                                <div className="glass-card">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="text-[10px] font-black text-text-dim uppercase tracking-widest">Dimension Matrix</h4>
                                        <button onClick={startEditingProfile} className="p-1 px-2 text-[10px] font-black uppercase text-primary hover:bg-primary/10 rounded transition-colors flex items-center gap-1">
                                            <Edit2 size={10} /> Profile
                                        </button>
                                    </div>
                                    {editingProfile && (
                                        <form onSubmit={handleUpdateProfile} className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-6 space-y-4 animate-slide-up">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black text-text-dim uppercase tracking-widest">Full Identity Name</label>
                                                <input
                                                    type="text"
                                                    value={profileData.name}
                                                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                                    className="w-full bg-bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-text-dim uppercase tracking-widest">Semester</label>
                                                    <select
                                                        value={profileData.semester}
                                                        onChange={(e) => setProfileData({ ...profileData, semester: e.target.value })}
                                                        className="w-full bg-bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                    >
                                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                                            <option key={s} value={s}>Semester {s}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black text-text-dim uppercase tracking-widest">Mentor Master</label>
                                                    <input
                                                        type="email"
                                                        value={profileData.mentor_email}
                                                        onChange={(e) => setProfileData({ ...profileData, mentor_email: e.target.value })}
                                                        className="w-full bg-bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="submit" className="flex-1 btn btn-primary py-2 text-[10px]">Update Core</button>
                                                <button type="button" onClick={() => setEditingProfile(false)} className="px-4 py-2 text-[10px] text-text-dim">Cancel</button>
                                            </div>
                                        </form>
                                    )}
                                    <div className="h-[240px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                                                { subject: 'ACADEMIC', A: data.adaptability.scores.academic || 0, fullMark: 100 },
                                                { subject: 'ATTENDANCE', A: data.adaptability.scores.attendance || 0, fullMark: 100 },
                                                { subject: 'SKILLS', A: data.adaptability.scores.skills || 0, fullMark: 100 },
                                                { subject: 'ASSIGNMENTS', A: data.adaptability.scores.assignments || 0, fullMark: 100 },
                                                { subject: 'RECOVERY', A: data.adaptability.scores.recovery || 0, fullMark: 100 },
                                            ]}>
                                                <PolarGrid stroke="#ffffff20" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#e2e8f0', fontSize: 11, fontWeight: 700 }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} />
                                                <Radar name="Student" dataKey="A" stroke="#818cf8" fill="#818cf8" fillOpacity={0.6} strokeWidth={2} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Column: Performance History */}
                            <div className="lg:col-span-2 space-y-8">
                                <div className="glass-card h-[300px]">
                                    <h4 className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <TrendingUp size={14} className="text-accent" />
                                        Institutional History
                                    </h4>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.history}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" vertical={false} />
                                            <XAxis dataKey="date" stroke="#cbd5e1" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} dy={10} />
                                            <YAxis stroke="#cbd5e1" fontSize={11} fontWeight={600} domain={[0, 100]} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' }}
                                                itemStyle={{ color: '#818cf8' }}
                                            />
                                            <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={4} dot={{ fill: '#818cf8', r: 5, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Score Breakdown Table with Confidence */}
                                <div className="glass-card overflow-hidden">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-error/10 rounded-lg text-error">
                                                <Shield size={18} />
                                            </div>
                                            <h4 className="text-xs font-black text-white uppercase tracking-widest">Data Confidence</h4>
                                        </div>
                                        <span className={`text-2xl font-black ${data.adaptability.confidence < 50 ? 'text-error' : 'text-success'}`}>
                                            {data.adaptability.confidence}%
                                        </span>
                                    </div>

                                    <div className="w-full bg-white/5 h-2 rounded-full mb-4 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${data.adaptability.confidence < 50 ? 'bg-error' : 'bg-success'}`}
                                            style={{ width: `${data.adaptability.confidence}%` }}
                                        />
                                    </div>

                                    <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-8">
                                        {data.adaptability.confidence < 100 ? 'Some dimensions awaiting data' : 'Full Statistical Integrity'}
                                    </p>

                                    <div className="space-y-6">
                                        {[
                                            { label: 'ACADEMIC', weight: '30%', value: data.adaptability.scores.academic, status: data.adaptability.breakdown.academic, color: 'text-primary' },
                                            { label: 'ATTENDANCE', weight: '20%', value: data.adaptability.scores.attendance, status: data.adaptability.breakdown.attendance, color: 'text-success' },
                                            { label: 'ASSIGNMENTS', weight: '20%', value: data.adaptability.scores.assignments, status: data.adaptability.breakdown.assignments, color: 'text-secondary' },
                                            { label: 'SKILLS', weight: '15%', value: data.adaptability.scores.skills, status: data.adaptability.breakdown.skills, color: 'text-accent' },
                                            { label: 'RECOVERY', weight: '15%', value: data.adaptability.scores.recovery, status: data.adaptability.breakdown.recovery, color: 'text-white' }
                                        ].map((dim, i) => (
                                            <div key={i} className="flex items-center justify-between group">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[11px] font-black tracking-widest ${dim.color}`}>{dim.label}</span>
                                                        <span className="text-[9px] text-text-dim font-bold">({dim.weight})</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-xs font-black ${dim.value === null ? 'text-text-dim' : 'text-white'}`}>
                                                        {dim.value !== null ? dim.value.toFixed(1) : '--'}
                                                    </span>
                                                    <span className={`text-[10px] font-medium italic ${dim.status.includes('No') || dim.status.includes('Awaiting') || dim.status.includes('Unavailable') ? 'text-error/60' : 'text-text-dim'}`}>
                                                        - {dim.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/20">
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3">Institutional Insight</h4>
                                    <p className="text-sm text-white/80 leading-relaxed font-medium">
                                        {data.adaptability.finalScore < 60
                                            ? "Critical vulnerability detected. Prioritize academic mentoring and immediate attendance monitoring. Significant intervention required to stabilize performance."
                                            : "Performance is within stable institutional parameters. Continue current trajectory; encourage high-impact participation."}
                                    </p>
                                </div>

                                {/* EDITABLE DATA SECTIONS */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Attendance Edit */}
                                    <div className="glass-card p-0 overflow-hidden">
                                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                <Clock size={14} className="text-info" /> Attendance Matrix
                                            </h4>
                                            <button onClick={() => setShowAddAttendance(true)} className="p-1.5 text-text-dim hover:text-white"><Edit2 size={14} /></button>
                                        </div>
                                        <div className="p-6 space-y-3">
                                            {showAddAttendance && (
                                                <div className="p-3 bg-white/5 rounded-xl border border-white/10 mb-4 animate-slide-up">
                                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                                        <select
                                                            value={newAttendance.semester}
                                                            onChange={e => setNewAttendance({ ...newAttendance, semester: e.target.value })}
                                                            className="bg-bg-deep border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                        >
                                                            <option value="">Select Sem</option>
                                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                                                <option key={s} value={s}>Sem {s}</option>
                                                            ))}
                                                        </select>
                                                        <input type="number" placeholder="%" value={newAttendance.percentage} onChange={e => setNewAttendance({ ...newAttendance, percentage: e.target.value })} className="bg-bg-deep border border-white/10 rounded px-2 py-1 text-xs text-white" />
                                                    </div>
                                                    <button
                                                        onClick={() => handleUpdateAttendance(newAttendance.semester, newAttendance.percentage)}
                                                        disabled={updatingAttendance}
                                                        className="w-full py-1 bg-primary/20 text-primary text-[10px] uppercase font-black rounded hover:bg-primary/30"
                                                    >
                                                        {updatingAttendance ? '...In' : 'Inject'}
                                                    </button>
                                                </div>
                                            )}
                                            {(data.attendance || []).slice(0, 4).map((a, idx) => a && (
                                                <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-white">
                                                    <span className="text-text-dim">Sem {a.semester}</span>
                                                    <div className="flex items-center gap-2">
                                                        {editingAttendance && editingAttendance.semester === a.semester ? (
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    value={editingAttendance.percentage}
                                                                    onChange={(e) => setEditingAttendance({ ...editingAttendance, percentage: e.target.value })}
                                                                    className="w-12 bg-bg-deep border border-primary/30 rounded px-1 text-center"
                                                                />
                                                                <button
                                                                    onClick={() => handleUpdateAttendance(editingAttendance.semester, editingAttendance.percentage)}
                                                                    disabled={updatingAttendance}
                                                                    className="p-1 text-success hover:bg-success/10 rounded"
                                                                >
                                                                    <Check size={10} />
                                                                </button>
                                                                <button onClick={() => setEditingAttendance(null)} className="p-1 text-text-dim hover:bg-white/10 rounded"><X size={10} /></button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <span className={a.percentage < 75 ? 'text-danger' : 'text-success'}>{a.percentage}%</span>
                                                                <button onClick={() => setEditingAttendance({ ...a })} className="text-text-dim/50 hover:text-white transition-colors"><Edit2 size={10} /></button>
                                                                <button onClick={() => handleDeleteAttendance(a._id)} className="text-text-dim/50 hover:text-danger transition-colors"><Trash2 size={10} /></button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Rewards/Badges Edit */}
                                    <div className="glass-card p-0 overflow-hidden">
                                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                <Activity size={14} className="text-accent" /> Rewards (Badges)
                                            </h4>
                                            <button onClick={() => setShowAddReward(true)} className="p-1.5 text-text-dim hover:text-white"><Edit2 size={14} /></button>
                                        </div>
                                        <div className="p-6 space-y-3">
                                            {showAddReward && (
                                                <div className="p-3 bg-white/5 rounded-xl border border-white/10 mb-4 animate-slide-up">
                                                    <input type="text" placeholder="Cat" value={newReward.category} onChange={e => setNewReward({ ...newReward, category: e.target.value })} className="w-full bg-bg-deep border border-white/10 rounded px-2 py-1 text-xs text-white mb-2" />
                                                    <input type="number" placeholder="Pts" value={newReward.points} onChange={e => setNewReward({ ...newReward, points: e.target.value })} className="w-full bg-bg-deep border border-white/10 rounded px-2 py-1 text-xs text-white mb-2" />
                                                    <button
                                                        onClick={() => handleUpdateRewards(newReward.points, newReward.category)}
                                                        disabled={updatingRewards}
                                                        className="w-full py-1 bg-accent/20 text-accent text-[10px] uppercase font-black rounded hover:bg-accent/30"
                                                    >
                                                        {updatingRewards ? '...In' : 'Inject'}
                                                    </button>
                                                </div>
                                            )}
                                            {/* Rewards Gap Tracker */}
                                            {data.reward_stats && (
                                                <div className="mb-4 space-y-2 relative">
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <div className="text-[10px] font-black text-text-dim uppercase tracking-widest">Department Baseline</div>
                                                            <div className="text-sm font-bold text-white">{data.reward_stats.dept_avg.toFixed(1)} Pts</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-accent">Student Accrual</div>
                                                            <div className="text-sm font-bold text-white">{data.reward_stats.total} Pts</div>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                                                        <div
                                                            className="absolute top-0 left-0 h-full bg-accent transition-all duration-1000 ease-out"
                                                            style={{ width: `${Math.min(100, (data.reward_stats.total / (data.reward_stats.dept_avg || 1)) * 100)}%` }}
                                                        />
                                                    </div>
                                                    {data.reward_stats.total < data.reward_stats.dept_avg && (
                                                        <div className="text-[10px] text-warning text-right font-medium">
                                                            Lagging by {(data.reward_stats.dept_avg - data.reward_stats.total).toFixed(1)} Pts
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {(data.rewards || []).slice(0, 3).map((r, idx) => r && (
                                                <div key={idx} className="flex items-center justify-between text-[11px] font-bold group text-white">
                                                    <span className="text-text-dim truncate max-w-[80px]">{r.category || 'Legacy'}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white">{r.points} Pts</span>
                                                        <button
                                                            onClick={() => {
                                                                setEditingRewards({ ...r, _id: r._id || r.id });
                                                                setShowAddReward(true);
                                                                setNewReward({ points: r.points, category: r.category });
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-text-dim hover:text-white"
                                                        >
                                                            <Edit2 size={10} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteReward(r._id || r.id)}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-text-dim hover:text-danger"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Marks Edit Table */}
                                <div className="glass-card p-0 overflow-hidden">
                                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <BookOpen size={14} className="text-primary" /> Academic Score Edit
                                        </h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="text-[9px] font-black text-text-dim uppercase tracking-widest border-b border-white/5 bg-white/[0.01]">
                                                <tr>
                                                    <th className="px-6 py-3">Subject</th>
                                                    <th className="px-6 py-3">PT1</th>
                                                    <th className="px-6 py-3">PT2</th>
                                                    <th className="px-6 py-3">Grade</th>
                                                    <th className="px-6 py-3">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[11px] font-bold text-white">
                                                {(data.marks || []).map((m, idx) => {
                                                    if (!m) return null;
                                                    return (
                                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                                            <td className="px-6 py-3 truncate max-w-[120px]">{m.subject_name}</td>
                                                            <td className="px-6 py-3">
                                                                {editingMarks && editingMarks.subject_id === m.subject_id ? (
                                                                    <input type="number" value={editingMarks.pt1 ?? ''} onChange={e => setEditingMarks({ ...editingMarks, pt1: e.target.value })} className="w-10 bg-bg-deep border border-primary/30 rounded text-center" />
                                                                ) : m.pt1 ?? '--'}
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                {editingMarks && editingMarks.subject_id === m.subject_id ? (
                                                                    <input type="number" value={editingMarks.pt2 ?? ''} onChange={e => setEditingMarks({ ...editingMarks, pt2: e.target.value })} className="w-10 bg-bg-deep border border-primary/30 rounded text-center" />
                                                                ) : m.pt2 ?? '--'}
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                {editingMarks && editingMarks.subject_id === m.subject_id ? (
                                                                    <input type="text" value={editingMarks.semester_grade ?? ''} onChange={e => setEditingMarks({ ...editingMarks, semester_grade: e.target.value.toUpperCase() })} className="w-10 bg-bg-deep border border-primary/30 rounded text-center uppercase" />
                                                                ) : m.semester_grade || '--'}
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                {editingMarks && editingMarks.subject_id === m.subject_id ? (
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => handleUpdateMarks(editingMarks)}
                                                                            disabled={updatingMarks}
                                                                            className="p-1 bg-success/20 text-success rounded-lg"
                                                                        >
                                                                            <Check size={12} />
                                                                        </button>
                                                                        <button onClick={() => setEditingMarks(null)} className="p-1 bg-white/10 text-white rounded-lg"><X size={12} /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex gap-2 items-center">
                                                                        <button onClick={() => setEditingMarks({ ...m })} className="p-1 text-text-dim hover:text-white transition-colors"><Edit2 size={12} /></button>
                                                                        <button onClick={() => handleDeleteMarks(m._id)} className="p-1 text-text-dim hover:text-danger transition-colors"><Trash2 size={12} /></button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-dim p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <AlertCircle size={40} className="opacity-20 translate-y-[-2px]" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Analysis Unavailable</h3>
                        <p className="max-w-xs text-sm leading-relaxed opacity-60">
                            {error || "We couldn't locate an analytical profile for this student identifier."}
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-8 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                        >
                            Return to Hub
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentAnalyticsModal;
