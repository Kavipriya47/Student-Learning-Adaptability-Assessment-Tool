import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import {
    BookOpen, Clock,
    MessageSquare, User,
    TrendingUp, Lightbulb, ArrowRight, ShieldCheck, Edit2, Check, X, Trash2, Sparkles, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import './StudentDetail.css';

const StudentDetail = () => {
    const { roll_no } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [note, setNote] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);
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
        fetchStudentDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roll_no]);

    const fetchStudentDetail = async () => {
        try {
            const res = await api.get(`/api/mentor/student-detail/${roll_no}`);
            setData(res.data);
        } catch (err) {
            console.error('Failed to fetch student details');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        setSubmittingNote(true);
        try {
            await api.post('/api/mentor/add-note', {
                student_roll: roll_no,
                note,
                type: 'counselling'
            });
            setNote('');
            fetchStudentDetail();
            toast.success('Mentoring note added successfully');
        } catch (err) {
            toast.error('Error adding note: ' + (err.response?.data?.message || err.message));
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleUpdateAttendance = async (sem, pct) => {
        setUpdatingAttendance(true);
        try {
            await api.post('/api/mentor/update-attendance', {
                student_roll: roll_no,
                semester: sem,
                percentage: pct
            });
            setEditingAttendance(null);
            setShowAddAttendance(false);
            setNewAttendance({ semester: '', percentage: '' });
            fetchStudentDetail();
            toast.success('Attendance updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error updating attendance');
        } finally {
            setUpdatingAttendance(false);
        }
    };

    const handleUpdateMarks = async (m) => {
        setUpdatingMarks(true);
        try {
            await api.post('/api/mentor/update-marks', {
                student_roll: roll_no,
                subject_id: m.subject_id,
                pt1: m.pt1,
                pt2: m.pt2,
                assignment: m.assignment,
                semester_grade: m.semester_grade
            });
            setEditingMarks(null);
            fetchStudentDetail();
            toast.success('Marks updated successfully');
        } catch (err) {
            toast.error('Error updating marks: ' + (err.response?.data?.message || err.message));
        } finally {
            setUpdatingMarks(false);
        }
    };

    const handleUpdateRewards = async (points, category, id = null) => {
        setUpdatingRewards(true);
        const finalId = id || editingRewards?._id || editingRewards?.id;
        try {
            await api.post('/api/mentor/update-rewards', {
                student_roll: roll_no,
                points: points,
                category: category,
                reward_id: finalId
            });
            setEditingRewards(null);
            setShowAddReward(false);
            setNewReward({ points: '', category: '' });
            await fetchStudentDetail();
            toast.success('Rewards updated successfully');
        } catch (err) {
            console.error('[StudentDetail] Hub Update Error:', err);
            toast.error('Error updating rewards: ' + (err.response?.data?.message || err.message));
        } finally {
            setUpdatingRewards(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/mentor/update-student-basic', {
                student_roll: roll_no,
                ...profileData
            });
            setEditingProfile(false);
            fetchStudentDetail();
            toast.success('Profile updated successfully');
        } catch (err) {
            toast.error('Error updating profile: ' + (err.response?.data?.message || err.message));
        }
    };

    const startEditingProfile = () => {
        setProfileData({
            name: data.student.name,
            semester: data.student.semester,
            mentor_email: data.student.mentor_email || ''
        });
        setEditingProfile(true);
    };

    const handleDeleteReward = async (rewardId) => {
        if (!window.confirm('Are you sure you want to remove this badge?')) return;
        try {
            await api.delete(`/api/mentor/reward/${rewardId}`);
            fetchStudentDetail();
        } catch (err) {
            console.error('Error deleting reward:', err);
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('Are you sure you want to delete this mentoring note?')) return;
        try {
            await api.delete(`/api/mentor/note/${noteId}`);
            fetchStudentDetail();
        } catch (err) {
            console.error('Error deleting note:', err);
        }
    };

    const handleDeleteAttendance = async (attendanceId) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) return;
        try {
            await api.delete(`/api/mentor/attendance/${attendanceId}`);
            fetchStudentDetail();
        } catch (err) {
            console.error('Error deleting attendance:', err);
        }
    };

    const handleDeleteMarks = async (markId) => {
        if (!window.confirm('Are you sure you want to delete this marks record?')) return;
        try {
            await api.delete(`/api/mentor/marks/${markId}`);
            fetchStudentDetail();
        } catch (err) {
            console.error('Error deleting marks:', err);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-text-dim font-bold uppercase tracking-widest text-[10px]">Retrieving Profile Dossier</p>
        </div>
    );
    if (!data) return <div className="p-8 text-danger font-bold glass-card border-danger/20">Student not found in this sector.</div>;

    const radarData = [
        { subject: 'ACADEMIC', A: data.adaptability.scores.academic ?? 0, fullMark: 100 },
        { subject: 'ATTENDANCE', A: data.adaptability.scores.attendance ?? 0, fullMark: 100 },
        { subject: 'SKILLS', A: data.adaptability.scores.skills ?? 0, fullMark: 100 },
        { subject: 'ASSIGNMENTS', A: data.adaptability.scores.assignments ?? 0, fullMark: 100 },
        { subject: 'RECOVERY', A: data.adaptability.scores.recovery ?? 0, fullMark: 100 },
    ];

    // history is now [{date, score, academic_score}] from the API
    const historyData = data.history && data.history.length > 0
        ? data.history.map(h => ({
            name: new Date(h.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
            score: parseFloat(h.score)
        }))
        : [
            { name: 'Baseline', score: 65 },
            { name: 'Current', score: parseFloat(data.adaptability.finalScore) }
        ];

    const getRecommendations = () => {
        const scores = data.adaptability.scores;
        const recs = [];
        if (scores.academic !== null && scores.academic < 60) recs.push({ text: "Schedule 1-on-1 subject remediation", priority: "High" });
        if (scores.attendance !== null && scores.attendance < 75) recs.push({ text: "Contact parents regarding attendance gap", priority: "High" });
        if (scores.assignments !== null && scores.assignments < 50) recs.push({ text: "Assign peer-learning partner for coursework", priority: "Medium" }); // fixed: was .assignment
        if (scores.recovery !== null && scores.recovery < 40) recs.push({ text: "Evaluate socio-economic or emotional blockers", priority: "High" });
        if (recs.length === 0) recs.push({ text: "Maintain current growth trajectory", priority: "Low" });
        if (recs.length < 3) recs.push({ text: "Recommend participation in advanced skills lab", priority: "Low" });
        return recs.slice(0, 3);
    };

    const recommendations = getRecommendations();

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/mentor')}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-dim hover:text-white transition-colors"
                >
                    <ArrowRight className="rotate-180" size={14} /> Back to Cohort
                </button>
            </div>

            {/* Profile Header */}
            <div className="glass-card flex flex-col md:flex-row items-center gap-8 border-primary/20 p-8 relative overflow-hidden">
                <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-glow-primary overflow-hidden">
                    {data.student.profile_pic ? (
                        <img src={data.student.profile_pic} alt={data.student.name} className="w-full h-full object-cover" />
                    ) : (
                        <User size={48} />
                    )}
                </div>
                {editingProfile ? (
                    <form onSubmit={handleUpdateProfile} className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-primary uppercase tracking-widest">Full Name</label>
                            <input
                                type="text"
                                value={profileData.name}
                                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                className="w-full bg-bg-surface border border-primary/30 rounded-xl px-4 py-2 text-white font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-primary uppercase tracking-widest">Semester</label>
                            <select
                                value={profileData.semester}
                                onChange={(e) => setProfileData({ ...profileData, semester: e.target.value })}
                                className="w-full bg-bg-surface border border-primary/30 rounded-xl px-4 py-2 text-white font-bold"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                    <option key={s} value={s}>Semester {s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-primary uppercase tracking-widest">Mentor Email</label>
                            <input
                                type="email"
                                value={profileData.mentor_email}
                                onChange={(e) => setProfileData({ ...profileData, mentor_email: e.target.value })}
                                className="w-full bg-bg-surface border border-primary/30 rounded-xl px-4 py-2 text-white font-bold"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button type="submit" className="btn btn-primary px-6 py-2 text-xs">Save</button>
                            <button type="button" onClick={() => setEditingProfile(false)} className="btn bg-white/5 px-6 py-2 text-xs">Cancel</button>
                        </div>
                    </form>
                ) : (
                    <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                            <h1 className="text-4xl font-black font-outfit text-white tracking-tight">{data.student.name}</h1>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${parseFloat(data.adaptability.finalScore) < 60 ? 'bg-danger/10 text-danger border-danger/30' : 'bg-success/10 text-success border-success/20'}`}>
                                {parseFloat(data.adaptability.finalScore) >= 75 ? 'High Performer' : parseFloat(data.adaptability.finalScore) >= 60 ? 'In Progress' : 'Needs Attention'}
                            </span>
                            <button onClick={startEditingProfile} className="p-2 text-text-dim hover:text-white transition-colors">
                                <Edit2 size={16} />
                            </button>
                        </div>
                        <div className="flex flex-wrap justify-center md:justify-start gap-y-4 gap-x-12">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-text-dim font-black uppercase tracking-widest mb-1 opacity-60">Identity Domain</span>
                                <span className="text-white font-bold flex items-center gap-2 italic">{data.student.roll_no}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-text-dim font-black uppercase tracking-widest mb-1 opacity-60">Department</span>
                                <span className="text-white font-bold">{data.student.dept_name}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-text-dim font-black uppercase tracking-widest mb-1 opacity-60">Cohort / Batch</span>
                                <span className="text-white font-bold">{data.student.batch_name}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Radar + Confidence Stack */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Radar Chart */}
                    <div className="glass-card flex flex-col" style={{ minHeight: '320px' }}>
                        <h3 className="text-xl font-bold font-outfit mb-6 text-white">Dimension Matrix</h3>
                        <div className="flex-1" style={{ minHeight: '240px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Current Score" dataKey="A" stroke="hsl(244, 75%, 65%)" fill="hsl(244, 75%, 65%)" fillOpacity={0.3} strokeWidth={3} />
                                    <Tooltip contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Data Confidence Widget - Synced with Institutional Spec */}
                    {(() => {
                        const confidence = data.adaptability.confidence ?? 0;
                        const colorClass = confidence < 50 ? 'text-error' : 'text-success';
                        const barClass = confidence < 50 ? 'bg-error' : 'bg-success';
                        const dims = [
                            { key: 'academic', label: 'ACADEMIC', weight: '30%', color: 'text-primary' },
                            { key: 'attendance', label: 'ATTENDANCE', weight: '20%', color: 'text-success' },
                            { key: 'assignments', label: 'ASSIGNMENTS', weight: '20%', color: 'text-secondary' },
                            { key: 'skills', label: 'SKILLS', weight: '15%', color: 'text-accent' },
                            { key: 'recovery', label: 'RECOVERY', weight: '15%', color: 'text-white' },
                        ];
                        return (
                            <div className="glass-card">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${confidence < 50 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                                            <ShieldCheck size={18} />
                                        </div>
                                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Data Confidence</h4>
                                    </div>
                                    <span className={`text-2xl font-black ${colorClass}`}>{confidence}%</span>
                                </div>

                                <div className="w-full h-2 bg-white/5 rounded-full mb-4 overflow-hidden">
                                    <div className={`h-full transition-all duration-1000 ${barClass}`} style={{ width: `${confidence}%` }} />
                                </div>

                                <p className="text-[10px] font-black text-text-dim uppercase tracking-widest mb-8">
                                    {confidence < 100 ? 'Some dimensions awaiting data' : 'Full Statistical Integrity'}
                                </p>

                                <div className="space-y-6">
                                    {dims.map(({ key, label, weight, color }) => {
                                        const score = data.adaptability.scores?.[key];
                                        const status = data.adaptability.breakdown?.[key] ?? (score != null ? 'Computed' : 'Pending');
                                        const hasData = score != null;
                                        return (
                                            <div key={key} className="flex items-center justify-between group">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[11px] font-black tracking-widest ${color}`}>{label}</span>
                                                        <span className="text-[9px] text-text-dim font-bold">({weight})</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-xs font-black ${hasData ? 'text-white' : 'text-text-dim'}`}>
                                                        {hasData ? `${score.toFixed(1)}` : '--'}
                                                    </span>
                                                    <span className={`text-[10px] font-medium italic ${!hasData || status.includes('Awaiting') ? 'text-error/60' : 'text-text-dim'}`}>
                                                        - {status}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Recommendations Engine */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="glass-card border-accent/20 bg-accent/[0.02]">
                        <h3 className="text-xl font-bold font-outfit mb-6 text-white flex items-center gap-3">
                            <Lightbulb className="text-accent" size={24} />
                            Strategic Advisor Recommendations
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recommendations.map((rec, i) => (
                                <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-2xl relative group hover:border-accent/40 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${rec.priority === 'High' ? 'bg-danger/20 text-danger' : 'bg-primary/20 text-primary'}`}>
                                            {rec.priority} Priority
                                        </span>
                                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white leading-tight mb-4">{rec.text}</p>
                                    <div className="pt-4 border-t border-white/5 text-[9px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                                        Initiate Action <ArrowRight size={10} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trend Chart */}
                    <div className="glass-card min-h-[300px]">
                        <h3 className="text-xl font-bold font-outfit mb-6 text-white flex items-center gap-3">
                            <TrendingUp className="text-success" size={20} />
                            Adaptability Growth Index
                        </h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(10,10,10,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff', fontWeight: 800 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="hsl(158, 64%, 52%)"
                                        strokeWidth={4}
                                        dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                                        activeDot={{ r: 8, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Notes and Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card">
                    <h3 className="text-xl font-bold font-outfit mb-6 flex items-center gap-3 text-white">
                        <MessageSquare className="text-primary" size={20} />
                        Add Mentoring Note
                    </h3>
                    <form onSubmit={handleAddNote} className="space-y-4">
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Describe the counselling session or follow-up actions..."
                            className="w-full bg-bg-surface border border-border-subtle rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-primary focus:shadow-glow transition-all h-32 placeholder:text-text-dim/30"
                        />
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={submittingNote || !note.trim()}
                                className="btn btn-primary px-8"
                            >
                                {submittingNote ? 'Storing Record...' : 'Log Session'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="glass-card max-h-[400px] overflow-y-auto">
                    <h3 className="text-lg font-bold font-outfit mb-6 text-white text-center">Neural-Linked Session History</h3>
                    <div className="space-y-4">
                        {data.notes.map((n) => (
                            <div key={n._id || n.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest">{n.type}</span>
                                        <button
                                            onClick={() => handleDeleteNote(n._id || n.id)}
                                            className="p-1.5 text-text-dim hover:text-danger hover:bg-danger/10 rounded transition-all"
                                            title="Delete Note"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <span className="text-[10px] text-text-dim font-black tracking-tighter opacity-50">{new Date(n.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-text-dim leading-relaxed">{n.note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <h3 className="text-xl font-bold font-outfit text-white flex items-center gap-3">
                            <BookOpen className="text-primary" size={20} />
                            Academic Performance Matrix
                        </h3>
                    </div>
                    <table className="slaa-table">
                        <thead>
                            <tr>
                                <th className="pl-6">Core Subject</th>
                                <th className="text-center">PT1</th>
                                <th className="text-center">PT2</th>
                                <th className="text-center pr-6">Status/Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.marks || []).map((m, i) => {
                                if (!m) return null;
                                const isEditing = editingMarks && editingMarks.subject_id === m.subject_id;
                                return (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="pl-6">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-white group-hover:text-primary transition-colors">{m.subject_name}</span>
                                                <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingMarks({ ...m })}
                                                        className="p-1.5 text-text-dim hover:text-white transition-all rounded hover:bg-white/10"
                                                        title="Edit Marks"
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMarks(m._id)}
                                                        className="p-1.5 text-text-dim hover:text-danger transition-all rounded hover:bg-danger/10"
                                                        title="Delete Marks"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editingMarks.pt1 ?? ''}
                                                    onChange={(e) => setEditingMarks({ ...editingMarks, pt1: e.target.value })}
                                                    className="w-12 bg-bg-surface border border-primary/30 rounded text-xs text-center text-white"
                                                />
                                            ) : (
                                                <span className="font-mono opacity-80">{m.pt1 ?? '--'}</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editingMarks.pt2 ?? ''}
                                                    onChange={(e) => setEditingMarks({ ...editingMarks, pt2: e.target.value })}
                                                    className="w-12 bg-bg-surface border border-primary/30 rounded text-xs text-center text-white"
                                                />
                                            ) : (
                                                <span className="font-mono opacity-80">{m.pt2 ?? '--'}</span>
                                            )}
                                        </td>
                                        <td className="text-center pr-6">
                                            {isEditing ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingMarks.semester_grade ?? ''}
                                                        onChange={(e) => setEditingMarks({ ...editingMarks, semester_grade: e.target.value.toUpperCase() })}
                                                        className="w-12 bg-bg-surface border border-primary/30 rounded text-xs text-center text-white"
                                                        placeholder="Grade"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateMarks(editingMarks)}
                                                        disabled={updatingMarks}
                                                        className="p-1 bg-success/20 text-success rounded-lg hover:bg-success/30"
                                                    >
                                                        <Check size={12} />
                                                    </button>
                                                    <button onClick={() => setEditingMarks(null)} className="p-1 bg-white/10 text-text-dim rounded-lg hover:bg-white/20">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border ${['S', 'A', 'B'].includes(m.semester_grade) ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                                                    {m.semester_grade || 'PENDING'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="glass-card p-0 overflow-hidden">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex items-center justify-between w-full">
                            <h3 className="text-xl font-bold font-outfit text-white flex items-center gap-3">
                                <Clock className="text-info" size={20} />
                                Semester Attendance Matrix
                            </h3>
                            <button
                                onClick={() => setShowAddAttendance(true)}
                                className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-all border border-primary/20"
                                title="Add Semester Data"
                            >
                                <Edit2 size={16} /> {/* Using Edit2 for consistency but label as Add */}
                            </button>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* New Record Inline Form */}
                        {showAddAttendance && (
                            <div className="flex flex-col gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20 animate-slide-up mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">Manual Data Injection</span>
                                    <button onClick={() => setShowAddAttendance(false)} className="text-text-dim hover:text-white"><X size={14} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-text-dim uppercase tracking-widest">Target Semester</label>
                                        <select
                                            value={newAttendance.semester}
                                            onChange={(e) => setNewAttendance({ ...newAttendance, semester: e.target.value })}
                                            className="w-full bg-bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                        >
                                            <option value="">Select...</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                                <option key={s} value={s}>Semester {s}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-text-dim uppercase tracking-widest">Attendance %</label>
                                        <input
                                            type="number"
                                            value={newAttendance.percentage}
                                            onChange={(e) => setNewAttendance({ ...newAttendance, percentage: e.target.value })}
                                            placeholder="Score"
                                            className="w-full bg-bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUpdateAttendance(newAttendance.semester, newAttendance.percentage)}
                                    disabled={updatingAttendance || !newAttendance.semester || newAttendance.percentage === ''}
                                    className="w-full btn btn-primary py-2 text-[10px] uppercase font-black tracking-widest"
                                >
                                    {updatingAttendance ? 'Processing...' : 'Apply Dimension Data'}
                                </button>
                            </div>
                        )}
                        {data.attendance.map((a, i) => (
                            <div key={i} className="flex flex-col gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="font-black text-[10px] uppercase tracking-widest text-text-dim">Semester {a.semester}</span>
                                        {a.updated_by && (
                                            <span className="text-[8px] text-text-dim/50 font-bold uppercase tracking-wider">
                                                Audit: {a.updated_by}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {editingAttendance && editingAttendance.semester === a.semester ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={editingAttendance.percentage}
                                                    onChange={(e) => setEditingAttendance({ ...editingAttendance, percentage: e.target.value })}
                                                    className="w-16 bg-bg-surface border border-accent/40 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                                                    min="0"
                                                    max="100"
                                                />
                                                <button
                                                    onClick={() => handleUpdateAttendance(editingAttendance.semester, editingAttendance.percentage)}
                                                    disabled={updatingAttendance}
                                                    className="p-1.5 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-all"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingAttendance(null)}
                                                    className="p-1.5 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <span className={`text-sm font-black font-mono ${a.percentage < 75 ? 'text-danger' : 'text-success'}`}>{a.percentage}%</span>
                                                <div className="flex gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setEditingAttendance({ semester: a.semester, percentage: a.percentage })}
                                                        className="p-1.5 text-text-dim hover:text-white transition-colors rounded hover:bg-white/10"
                                                        title="Edit Attendance"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAttendance(a._id)}
                                                        className="p-1.5 text-text-dim hover:text-danger transition-colors rounded hover:bg-danger/10"
                                                        title="Delete Attendance"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-1000 ${a.percentage < 75 ? 'bg-danger' : 'bg-success'}`}
                                        style={{ width: `${a.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Rewards & Badges Section */}
            <div className="glass-card p-0 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <h3 className="text-xl font-bold font-outfit text-white flex items-center gap-3">
                        <TrendingUp className="text-accent" size={20} />
                        Behavioral Analytics & Badges
                    </h3>
                    <button
                        onClick={() => setShowAddReward(true)}
                        className="p-2 bg-accent/10 text-accent rounded-xl hover:bg-accent/20 transition-all border border-accent/20"
                    >
                        <Edit2 size={16} />
                    </button>
                </div>
                <div className="p-6">
                    {/* Rewards Gap Tracker - Mirroring Student/Admin UI */}
                    {data.reward_stats && (
                        <div className="mb-8 p-6 rounded-3xl bg-accent/5 border border-accent/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles size={48} className="text-accent" />
                            </div>

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp size={14} className="text-accent" />
                                        <span className="text-[10px] font-black text-accent uppercase tracking-widest">Reward Velocity Index</span>
                                    </div>
                                    <h4 className="text-2xl font-black text-white font-outfit">Rewards Gap Analysis</h4>
                                </div>

                                <div className="flex gap-4">
                                    <div className="text-center px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
                                        <p className="text-[8px] font-black text-text-dim uppercase tracking-tighter mb-1">Student Total</p>
                                        <p className="text-xl font-black text-white">{data.reward_stats.total}</p>
                                    </div>
                                    <div className="text-center px-4 py-2 bg-accent/10 rounded-2xl border border-accent/20">
                                        <p className="text-[8px] font-black text-accent uppercase tracking-tighter mb-1">Dept. Average</p>
                                        <p className="text-xl font-black text-accent">{data.reward_stats.dept_avg}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Progress to Benchmark</span>
                                    <span className="text-xs font-black text-white">
                                        {data.reward_stats.total >= data.reward_stats.dept_avg
                                            ? <span className="text-success flex items-center gap-1"><CheckCircle2 size={12} /> Surpassed Average</span>
                                            : <span className="text-warning">{data.reward_stats.dept_avg - data.reward_stats.total} pts behind average</span>
                                        }
                                    </span>
                                </div>
                                <div className="w-full bg-white/5 h-3 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className={`h-full transition-all duration-1000 ease-out relative ${data.reward_stats.total >= data.reward_stats.dept_avg ? 'bg-success shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-accent shadow-[0_0_15px_rgba(129,140,248,0.5)]'}`}
                                        style={{ width: `${Math.min((data.reward_stats.total / (data.reward_stats.dept_avg || 1)) * 100, 100)}%` }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showAddReward && (
                        <div className="flex flex-col gap-4 p-4 rounded-2xl bg-accent/5 border border-accent/20 animate-slide-up mb-6">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-accent uppercase tracking-widest">Inject Behavior Metric</span>
                                <button onClick={() => setShowAddReward(false)} className="text-text-dim hover:text-white"><X size={14} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-text-dim uppercase tracking-widest">Category / Badge</label>
                                    <input
                                        type="text"
                                        value={newReward.category}
                                        onChange={(e) => setNewReward({ ...newReward, category: e.target.value })}
                                        placeholder="e.g. Hackathon, Leadership"
                                        className="w-full bg-bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-text-dim uppercase tracking-widest">Dimension Multiplier (Points)</label>
                                    <input
                                        type="number"
                                        value={newReward.points}
                                        onChange={(e) => setNewReward({ ...newReward, points: e.target.value })}
                                        placeholder="Points"
                                        className="w-full bg-bg-surface border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => handleUpdateRewards(newReward.points, newReward.category)}
                                disabled={updatingRewards || !newReward.category || !newReward.points}
                                className="w-full btn bg-accent/20 text-accent py-2 text-[10px] uppercase font-black tracking-widest hover:bg-accent/30"
                            >
                                {updatingRewards ? 'Recalculating...' : 'Store Dimension'}
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.rewards.map((r, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">{r.category || 'Legacy Badge'}</span>
                                    <span className="text-xl font-black text-white">{r.points} <span className="text-[10px] text-text-dim uppercase">Pts</span></span>
                                </div>
                                <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setEditingRewards({ ...r });
                                            setShowAddReward(true);
                                            setNewReward({ points: r.points, category: r.category });
                                        }}
                                        className="p-2 text-text-dim hover:text-white transition-all rounded hover:bg-white/10"
                                        title="Edit Badge"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteReward(r._id || r.id)}
                                        className="p-2 text-text-dim hover:text-danger hover:bg-danger/10 rounded transition-all"
                                        title="Delete Badge"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDetail;
