import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import {
    BookOpen,
    UserCheck,
    Save,
    ChevronRight,
    Search,
    Clock,
    ArrowLeft,
    Download,
    Sparkles,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import './FacultyDashboard.css';

const FacultyDashboard = () => {
    const [subjects, setSubjects] = useState([]);
    const [selectedMapping, setSelectedMapping] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    // Unsaved changes blocker
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (unsavedChanges) {
                const msg = 'You have unsaved marks. Are you sure you want to leave?';
                e.returnValue = msg;
                return msg;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [unsavedChanges]);

    useEffect(() => {
        fetchMySubjects();
    }, []);

    const fetchMySubjects = async () => {
        try {
            const res = await api.get('/api/faculty/my-subjects');
            setSubjects(res.data);
        } catch (err) {
            console.error('Failed to fetch subjects');
        } finally {
            setLoading(false);
        }
    };

    const loadStudents = async (mapping) => {
        setLoading(true);
        setSelectedMapping(mapping);
        try {
            const res = await api.get(`/api/faculty/students?dept_id=${mapping.dept_id}&batch_id=${mapping.batch_id}&subject_id=${mapping.subject_id}`);
            setStudents(res.data);
        } catch (err) {
            console.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (roll, field, value) => {
        setUnsavedChanges(true); // Flag for dirty state

        // Enforce soft visual limits (backend enforces hard limits)
        let processedValue = value;
        if (field === 'pt1' || field === 'pt2') {
            if (Number(value) > 50) processedValue = '50';
            if (Number(value) < 0) processedValue = '0';
        }
        if (field === 'assignment') {
            if (Number(value) > 100) processedValue = '100';
            if (Number(value) < 0) processedValue = '0';
        }

        setStudents(prev => prev.map(s =>
            s.roll_no === roll ? { ...s, [field]: processedValue } : s
        ));
    };

    const handleExcelPaste = (e, targetRoll, startField) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text');
        if (!pasteData) return;

        setUnsavedChanges(true);
        const rows = pasteData.split('\n').map(row => row.split('\t'));

        setStudents(prev => {
            const nextStudents = [...prev];
            const startIndex = nextStudents.findIndex(s => s.roll_no === targetRoll);
            if (startIndex === -1) return prev;

            const fields = ['pt1', 'pt2', 'assignment', 'semester_grade'];
            const startFieldIndex = fields.indexOf(startField);

            rows.forEach((rowVals, rIdx) => {
                const sIdx = startIndex + rIdx;
                if (sIdx >= nextStudents.length) return; // Ignore overflow

                const student = { ...nextStudents[sIdx] };
                rowVals.forEach((val, cIdx) => {
                    const fIdx = startFieldIndex + cIdx;
                    if (fIdx < fields.length) {
                        const fieldName = fields[fIdx];
                        let cleanVal = val.trim();

                        // Limit enforce
                        if (fieldName === 'pt1' || fieldName === 'pt2') {
                            if (Number(cleanVal) > 50) cleanVal = '50';
                            if (Number(cleanVal) < 0) cleanVal = '0';
                        }
                        if (fieldName === 'assignment') {
                            if (Number(cleanVal) > 100) cleanVal = '100';
                            if (Number(cleanVal) < 0) cleanVal = '0';
                        }

                        student[fieldName] = cleanVal;
                    }
                });
                nextStudents[sIdx] = student;
            });

            return nextStudents;
        });
    };

    const saveMarks = async (student) => {
        setSaving(student.roll_no);
        try {
            await api.post('/api/faculty/marks', {
                student_roll: student.roll_no,
                subject_id: selectedMapping.subject_id,
                pt1: student.pt1,
                pt2: student.pt2,
                assignment: student.assignment,
                semester_grade: student.semester_grade
            });

            // Trigger visual pulse feedback
            setStudents(prev => prev.map(s =>
                s.roll_no === student.roll_no ? { ...s, is_synced: true, justSaved: true } : s
            ));

            // Clear pulse after animation
            setTimeout(() => {
                setStudents(prev => prev.map(s =>
                    s.roll_no === student.roll_no ? { ...s, justSaved: false } : s
                ));
            }, 800);

        } catch (err) {
            console.error('Error saving marks:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleBackToCatalog = () => {
        if (unsavedChanges) {
            if (!window.confirm("You have unsaved edits that might still be syncing. Are you sure you want to go back?")) {
                return;
            }
        }
        setSelectedMapping(null);
        setUnsavedChanges(false);
    };

    // Compute Analytics for Completion Status Panel
    const completionStats = React.useMemo(() => {
        let missingPt1 = 0, missingPt2 = 0, pendingAssign = 0, pendingGrade = 0;
        students.forEach(s => {
            if (s.pt1 === '' || s.pt1 === null) missingPt1++;
            if (s.pt2 === '' || s.pt2 === null) missingPt2++;
            if (s.assignment === '' || s.assignment === null) pendingAssign++;
            if (s.semester_grade === '' || s.semester_grade === null) pendingGrade++;
        });
        return { missingPt1, missingPt2, pendingAssign, pendingGrade };
    }, [students]);

    const isStudentIncomplete = (s) =>
        s.pt1 === '' || s.pt1 === null ||
        s.pt2 === '' || s.pt2 === null ||
        s.assignment === '' || s.assignment === null ||
        s.semester_grade === '' || s.semester_grade === null;

    const filteredStudents = useMemo(() => {
        const query = debouncedSearch.toLowerCase();
        return students.filter(s =>
            (s.name.toLowerCase().includes(query) ||
                s.roll_no.toLowerCase().includes(query)) &&
            (!showIncompleteOnly || isStudentIncomplete(s))
        );
    }, [students, debouncedSearch, showIncompleteOnly]);

    if (loading && subjects.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-text-dim font-bold uppercase tracking-widest text-[10px]">Initializing Academic Hub</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold font-outfit text-white tracking-tight flex items-center gap-3">
                        Academic Hub
                        <Sparkles className="text-primary animate-pulse" size={24} />
                    </h1>
                    <p className="text-text-muted mt-2 font-medium">Strategic assessment and student performance directory</p>
                </div>
                {selectedMapping && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                const headers = ['Name', 'Roll No', 'PT1', 'PT2', 'Assignment', 'Grade'];
                                const rows = students.map(s => [
                                    s.name,
                                    s.roll_no,
                                    s.pt1 ?? '',
                                    s.pt2 ?? '',
                                    s.assignment ?? '',
                                    s.semester_grade || ''
                                ]);
                                const csv = [
                                    headers.join(','),
                                    ...rows.map(r => r.map(v => `"${v}"`).join(','))
                                ].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Roster_${selectedMapping.subject_name}_${selectedMapping.batch_name}_${new Date().toISOString().slice(0, 10)}.csv`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }}
                            className="btn btn-outline border-white/10 text-white hover:bg-white/5"
                        >
                            <Download size={18} />
                            Export Roster
                        </button>
                    </div>
                )}
            </div>

            {!selectedMapping ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {subjects.map((s) => (
                        <div
                            key={s.id}
                            onClick={() => loadStudents(s)}
                            className="glass-card cursor-pointer group hover:border-primary/50 flex flex-col justify-between min-h-[17rem] relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(99,102,241,0.1)]"
                        >
                            {/* Animated Background Mesh */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_70%)]"></div>

                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 -rotate-12 group-hover:scale-110 group-hover:rotate-0">
                                <BookOpen size={120} />
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-all duration-500 ring-1 ring-primary/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                        <BookOpen size={28} className="group-hover:rotate-3 transition-transform" />
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className="text-[9px] bg-white/5 text-text-dim px-2.5 py-1 rounded-md font-black uppercase tracking-widest border border-white/10 group-hover:border-primary/30 transition-colors">
                                            {s.batch_name}
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[9px] font-black text-success uppercase tracking-wider bg-success/5 px-2 py-1 rounded-md border border-success/10">
                                            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                            Active SEM
                                        </div>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold font-outfit text-white group-hover:text-primary transition-colors leading-tight mb-2">{s.subject_name}</h3>

                                <div className="flex items-center gap-2 mb-6">
                                    <span className="text-text-muted text-[10px] font-bold px-2 py-0.5 bg-white/5 rounded border border-white/5 uppercase tracking-tighter">{s.dept_name}</span>
                                    <span className="text-primary/90 text-[10px] font-black uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Sem {s.semester}</span>
                                </div>

                                {/* Modernized Telemetry Stats */}
                                {s.telemetry && (
                                    <div className="mt-8 pt-4 border-t border-white/5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-text-dim uppercase font-black tracking-widest leading-none">Roster</p>
                                                <p className="text-lg font-bold text-white font-mono leading-none">{s.telemetry.enrolled}</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[10px] text-text-dim uppercase font-black tracking-widest leading-none">Pending</p>
                                                <p className="text-lg font-bold text-accent font-mono leading-none">{s.telemetry.pending}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] text-text-dim uppercase font-black tracking-widest">Entry Progress</span>
                                                <span className="text-[10px] font-black text-white font-outfit bg-primary/20 px-1.5 py-0.5 rounded leading-none">{s.telemetry.completion_percentage}%</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary via-indigo-400 to-accent transition-all duration-1000 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                                                    style={{ width: `${s.telemetry.completion_percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4 mt-6 border-t border-white/5 group-hover:bg-primary/5 -mx-6 px-6 -mb-6 transition-colors">
                                <div className="flex items-center gap-2 text-text-dim text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">
                                    <UserCheck size={14} className="text-primary" />
                                    Launch Console
                                </div>
                                <ChevronRight className="text-text-dim group-hover:text-primary group-hover:translate-x-1 transition-all" size={18} />
                            </div>
                        </div>
                    ))}
                    {subjects.length === 0 && (
                        <div className="col-span-full py-24 text-center glass-card border-dashed">
                            <AlertCircle size={48} className="mx-auto text-text-dim mb-4" />
                            <h3 className="text-xl font-bold font-outfit text-text-muted">No Subjects Assigned</h3>
                            <p className="text-text-dim mt-2">Detailed mapping protocols are managed by the Administration.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <button
                            onClick={handleBackToCatalog}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all"
                        >
                            <ArrowLeft size={16} /> Back to Catalog
                        </button>
                    </div>

                    <div className="glass-card border-primary/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-3xl font-black font-outfit text-white">{selectedMapping.subject_name}</h3>
                                    <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 uppercase tracking-widest">
                                        Core Module
                                    </span>
                                </div>
                                <p className="text-text-muted font-medium flex items-center gap-2">
                                    {selectedMapping.dept_name} <span className="text-white/20">•</span> {selectedMapping.batch_name}
                                </p>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] text-text-dim font-black uppercase tracking-[0.2em] mb-1">Assessment Completion</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-accent shadow-glow transition-all duration-1000"
                                                style={{ width: `${selectedMapping.telemetry?.completion_percentage || 0}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xl font-black text-white font-outfit tracking-tighter">
                                            {selectedMapping.telemetry?.completion_percentage || 0}%
                                        </span>
                                    </div>
                                </div>
                                <div className="hidden md:block w-[1px] h-12 bg-white/10"></div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            // Trigger bulk save if needed, though they save on blur
                                            setUnsavedChanges(false);
                                            fetchMySubjects(); // Refresh stats
                                        }}
                                        className="btn btn-primary shadow-glow transition-transform active:scale-95"
                                    >
                                        <Save size={18} /> Apply All Saves
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Completion Status Panel */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className={`p-4 rounded-2xl border flex flex-col justify-center items-center text-center transition-colors ${completionStats.missingPt1 > 0 ? 'bg-warning/10 border-warning text-warning' : 'bg-success/10 border-success/20 text-success'}`}>
                            <span className="text-3xl font-black font-outfit">{completionStats.missingPt1}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Missing PT1</span>
                        </div>
                        <div className={`p-4 rounded-2xl border flex flex-col justify-center items-center text-center transition-colors ${completionStats.missingPt2 > 0 ? 'bg-warning/10 border-warning text-warning' : 'bg-success/10 border-success/20 text-success'}`}>
                            <span className="text-3xl font-black font-outfit">{completionStats.missingPt2}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Missing PT2</span>
                        </div>
                        <div className={`p-4 rounded-2xl border flex flex-col justify-center items-center text-center transition-colors ${completionStats.pendingAssign > 0 ? 'bg-danger/10 border-danger/50 text-danger' : 'bg-success/10 border-success/20 text-success'}`}>
                            <span className="text-3xl font-black font-outfit">{completionStats.pendingAssign}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Assignments Pend</span>
                        </div>
                        <div className={`p-4 rounded-2xl border flex flex-col justify-center items-center text-center transition-colors ${completionStats.pendingGrade > 0 ? 'bg-info/10 border-info/50 text-info' : 'bg-success/10 border-success/20 text-success'}`}>
                            <span className="text-3xl font-black font-outfit">{completionStats.pendingGrade}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Grades Pend</span>
                        </div>
                    </div>

                    <div className="glass-card p-0 overflow-hidden border-white/5">
                        <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02]">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search student roster..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-text-dim/50"
                                />
                            </div>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={showIncompleteOnly}
                                            onChange={() => setShowIncompleteOnly(!showIncompleteOnly)}
                                        />
                                        <div className={`block w-10 h-6 rounded-full transition-colors ${showIncompleteOnly ? 'bg-warning' : 'bg-white/10'}`}></div>
                                        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showIncompleteOnly ? 'translate-x-4' : ''}`}></div>
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${showIncompleteOnly ? 'text-warning' : 'text-text-dim group-hover:text-white'}`}>
                                        Show Incomplete Only
                                    </span>
                                </label>
                                <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-2 transition-colors ${unsavedChanges ? 'bg-warning/10 text-warning border-warning/30' : 'bg-success/10 text-success border-success/20'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${unsavedChanges ? 'bg-warning animate-pulse' : 'bg-success'}`}></div>
                                    {unsavedChanges ? 'Unsaved Edits' : 'Secure Entry Protocol Active'}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
                            <table className="slaa-table relative">
                                <thead>
                                    <tr>
                                        <th className="pl-8">Student Architecture</th>
                                        <th className="w-28 text-center">PT1 (50)</th>
                                        <th className="w-28 text-center">PT2 (50)</th>
                                        <th className="w-28 text-center">ASM (100)</th>
                                        <th className="w-40">Semester Grade</th>
                                        <th className="w-24 text-center pr-8">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student) => (
                                        <tr
                                            key={student.roll_no}
                                            className={`group hover:bg-white/[0.03] transition-colors ${student.justSaved ? 'row-save-pulse' : ''} ${isStudentIncomplete(student) ? 'relative after:absolute after:inset-y-0 after:left-0 after:w-1 after:bg-warning' : ''}`}
                                        >
                                            <td className="pl-8">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl bg-white/5 border flex items-center justify-center font-bold font-outfit text-sm group-hover:scale-110 transition-transform overflow-hidden ${isStudentIncomplete(student) ? 'text-warning border-warning/50' : 'text-primary border-white/10'}`}>
                                                        {student.profile_pic ? (
                                                            <img src={student.profile_pic} alt={student.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            student.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white group-hover:text-primary transition-colors">{student.name}</p>
                                                        <p className="text-[10px] text-text-dim font-black tracking-widest mt-0.5">{student.roll_no}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={student.pt1 || ''}
                                                    onChange={(e) => handleMarkChange(student.roll_no, 'pt1', e.target.value)}
                                                    onPaste={(e) => handleExcelPaste(e, student.roll_no, 'pt1')}
                                                    onBlur={() => saveMarks(student)}
                                                    className={`w-full bg-bg-surface border rounded-xl px-3 py-2.5 text-sm md:text-base text-center text-white focus:outline-none focus:border-primary focus:shadow-glow transition-all font-mono ${student.pt1 === '' || student.pt1 === null ? 'border-warning/50' : 'border-border-subtle'}`}
                                                    placeholder="00"
                                                    max="50"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={student.pt2 || ''}
                                                    onChange={(e) => handleMarkChange(student.roll_no, 'pt2', e.target.value)}
                                                    onPaste={(e) => handleExcelPaste(e, student.roll_no, 'pt2')}
                                                    onBlur={() => saveMarks(student)}
                                                    className={`w-full bg-bg-surface border rounded-xl px-3 py-2.5 text-sm md:text-base text-center text-white focus:outline-none focus:border-primary focus:shadow-glow transition-all font-mono ${student.pt2 === '' || student.pt2 === null ? 'border-warning/50' : 'border-border-subtle'}`}
                                                    placeholder="00"
                                                    max="50"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={student.assignment || ''}
                                                    onChange={(e) => handleMarkChange(student.roll_no, 'assignment', e.target.value)}
                                                    onPaste={(e) => handleExcelPaste(e, student.roll_no, 'assignment')}
                                                    onBlur={() => saveMarks(student)}
                                                    className={`w-full bg-bg-surface border rounded-xl px-3 py-2.5 text-sm md:text-base text-center text-white focus:outline-none focus:border-primary focus:shadow-glow transition-all font-mono ${student.assignment === '' || student.assignment === null ? 'border-danger/50' : 'border-border-subtle'}`}
                                                    placeholder="000"
                                                    max="100"
                                                />
                                            </td>
                                            <td>
                                                <select
                                                    value={student.semester_grade || ''}
                                                    onChange={(e) => {
                                                        handleMarkChange(student.roll_no, 'semester_grade', e.target.value);
                                                        saveMarks({ ...student, semester_grade: e.target.value });
                                                    }}
                                                    className={`w-full bg-bg-surface border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all font-bold appearance-none cursor-pointer ${student.semester_grade === '' || student.semester_grade === null ? 'border-info/50' : 'border-border-subtle'}`}
                                                >
                                                    <option value="">Pending...</option>
                                                    <option value="S">S (Excellent)</option>
                                                    <option value="A">A (Very Good)</option>
                                                    <option value="B">B (Good)</option>
                                                    <option value="C">C (Fair)</option>
                                                    <option value="D">D (Average)</option>
                                                    <option value="F">F (Fail)</option>
                                                </select>
                                            </td>
                                            <td className="pr-8">
                                                <div className="flex justify-center">
                                                    {saving === student.roll_no ? (
                                                        <Clock size={16} className="text-primary animate-spin" />
                                                    ) : student.is_synced || student.pt1 ? (
                                                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20">
                                                            <CheckCircle2 size={16} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-dim border border-white/5 group-hover:border-primary/30 transition-all">
                                                            <Save size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStudents.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="6" className="text-center py-20 text-text-dim italic bg-white/[0.01]">
                                                No personnel records found matching the search criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyDashboard;
