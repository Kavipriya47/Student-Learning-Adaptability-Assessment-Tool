import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import {
    Database,
    Building2,
    Calendar,
    AlertCircle,
    TrendingUp,
    Users,
    Layers,
    ArrowRight,
    Activity,
    Shield,
    CheckCircle2,
    XCircle,
    Info,
    Download,
    History,
    Search,
    Sparkles,
    Gauge,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    LayoutDashboard,
    ShieldCheck,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentAnalyticsModal from './StudentAnalyticsModal';
import './AdminDashboard.css';

// Extracted Dashboard Components
import AdminActionTile from './components/AdminActionTile';
import AnalyticsSummary from './components/AnalyticsSummary';
import RiskDistribution from './components/RiskDistribution';
import GrowthTrend from './components/GrowthTrend';
import TopImprovers from './components/TopImprovers';
import PriorityStudentTable from './components/PriorityStudentTable';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        departments: 0,
        batches: 0,
        subjects: 0,
        staff: 0,
        pendingImports: 0
    });
    const [departments, setDepartments] = useState([]);
    const [batches, setBatches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [staff, setStaff] = useState([]);

    const [showAddMapping, setShowAddMapping] = useState(false);
    const [newMapping, setNewMapping] = useState({ faculty_email: '', subject_ids: [''], batch_id: '', dept_id: '' });

    const [showRunEvaluation, setShowRunEvaluation] = useState(false);
    const [evaluationData, setEvaluationData] = useState({ batch_id: '', cycle_name: '' });
    const [runningEvaluation, setRunningEvaluation] = useState(false);
    const [evaluationError, setEvaluationError] = useState(null);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedAnalyticsBatch, setSelectedAnalyticsBatch] = useState('');
    const [evaluationResult, setEvaluationResult] = useState(null);

    // Untracked/Anomalies State
    const [untrackedData, setUntrackedData] = useState(null);
    const [loadingUntracked, setLoadingUntracked] = useState(false);
    const [showUntrackedModal, setShowUntrackedModal] = useState(false);

    // UI Table Filters
    const [studentSearch, setStudentSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(studentSearch), 300);
        return () => clearTimeout(timer);
    }, [studentSearch]);


    const [analyticsData, setAnalyticsData] = useState(null);
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);
    const [showStudentDetail, setShowStudentDetail] = useState(false);
    const [selectedStudentRoll, setSelectedStudentRoll] = useState(null);
    const [runningQuickEval, setRunningQuickEval] = useState(false);

    const priorityFilteredStudents = useMemo(() => {
        return analyticsData?.priority_students?.filter(s => {
            const searchLower = debouncedSearch.toLowerCase();
            const matchesSearch = s.name.toLowerCase().includes(searchLower) ||
                s.roll.toLowerCase().includes(searchLower);
            const matchesRisk = riskFilter === 'all' || s.category === riskFilter;
            return matchesSearch && matchesRisk;
        }) || [];
    }, [analyticsData?.priority_students, debouncedSearch, riskFilter]);

    const riskDistributionMemo = useMemo(() => analyticsData && <RiskDistribution data={analyticsData.distribution} />, [analyticsData]);
    const growthTrendMemo = useMemo(() => analyticsData && <GrowthTrend trends={analyticsData.trends} />, [analyticsData]);
    const topImproversMemo = useMemo(() => analyticsData && <TopImprovers students={analyticsData.top_improvers} />, [analyticsData]);

    const fetchStats = async () => {
        try {
            const [deptRes, batchRes, subjectRes, staffRes, untrackedRes] = await Promise.all([
                api.get('/api/admin/departments'),
                api.get('/api/admin/batches'),
                api.get('/api/admin/subjects'),
                api.get('/api/admin/staff?limit=1000'),
                api.get('/api/admin/untracked')
            ]);
            setSubjects(subjectRes.data);
            const staffList = staffRes.data.staff || staffRes.data;
            setStaff(staffList);

            const pendingCount = (untrackedRes.data.unmapped_subjects?.length || 0) +
                (untrackedRes.data.untracked_students?.length || 0);

            setStats({
                departments: deptRes.data.length,
                batches: batchRes.data.length,
                subjects: subjectRes.data.length,
                staff: staffRes.data.total || staffList.length,
                pendingImports: pendingCount
            });
        } catch (err) {
            console.error('Failed to fetch admin data');
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [deptRes, batchRes] = await Promise.all([
                    api.get('/api/admin/departments'),
                    api.get('/api/admin/batches')
                ]);
                setDepartments(deptRes.data);
                setBatches(batchRes.data);
            } catch (err) {
                console.error('Failed to fetch initial dropdown data');
            }
        };
        fetchInitialData();
        fetchStats();
    }, []);

    const filteredBatches = selectedDept
        ? batches.filter(b => b.dept_id?._id === selectedDept || b.dept_id === selectedDept)
        : batches;

    const fetchAnalytics = async (batchId) => {
        if (!batchId) {
            setAnalyticsData(null);
            return;
        }
        setLoadingAnalytics(true);
        try {
            const res = await api.get(`/api/admin/analytics/${batchId}`);
            setAnalyticsData(res.data);
        } catch (err) {
            console.error('Failed to fetch analytics');
        } finally {
            setLoadingAnalytics(false);
        }
    };

    const fetchUntrackedData = async () => {
        setLoadingUntracked(true);
        try {
            const res = await api.get('/api/admin/untracked');
            setUntrackedData(res.data);
            setShowUntrackedModal(true);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load anomaly data.');
        } finally {
            setLoadingUntracked(false);
        }
    };

    useEffect(() => {
        if (selectedAnalyticsBatch) {
            fetchAnalytics(selectedAnalyticsBatch);
        }
    }, [selectedAnalyticsBatch]);

    const handleCreateMapping = async (e) => {
        e.preventDefault();
        const validSubjectIds = newMapping.subject_ids.filter(id => id.trim() !== '');

        if (validSubjectIds.length === 0) {
            toast.error('Please select at least one subject');
            return;
        }

        const loadingToast = toast.loading(`Creating ${validSubjectIds.length} mapping(s)...`);

        try {
            await Promise.all(validSubjectIds.map(subjectId =>
                api.post('/api/admin/staff-mapping', {
                    faculty_email: newMapping.faculty_email,
                    subject_id: subjectId,
                    batch_id: newMapping.batch_id,
                    dept_id: newMapping.dept_id
                })
            ));

            setNewMapping({ faculty_email: '', subject_ids: [''], batch_id: '', dept_id: '' });
            setShowAddMapping(false);
            fetchStats();
            toast.success('All mappings synchronized successfully', { id: loadingToast });
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Error synchronizing mappings', { id: loadingToast });
        }
    };

    const handleRunEvaluation = async (e) => {
        e.preventDefault();
        setRunningEvaluation(true);
        setEvaluationError(null);
        try {
            const res = await api.post('/api/admin/run-evaluation', evaluationData);
            setEvaluationResult(res.data);
            // Refresh analytics if the current batch was evaluated
            if (selectedAnalyticsBatch === evaluationData.batch_id) {
                fetchAnalytics(selectedAnalyticsBatch);
            }
        } catch (err) {
            console.error('Evaluation Error:', err);
            setEvaluationError({
                message: err.response?.data?.message || 'A system error occurred during evaluation.',
                phase: err.response?.data?.phase || 'NETWORK_OR_SERVER'
            });
        } finally {
            setRunningEvaluation(false);
        }
    };

    const handleQuickEvaluation = async () => {
        if (!selectedAnalyticsBatch) return;
        setRunningQuickEval(true);
        try {
            const now = new Date();
            const cycleName = `Manual Refresh - ${now.toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
            await api.post('/api/admin/run-evaluation', {
                batch_id: selectedAnalyticsBatch,
                cycle_name: cycleName
            });
            await fetchStats();
            await fetchUntrackedData();
            await fetchAnalytics(selectedAnalyticsBatch);
            toast.success('Evaluation completed and analytics updated.');
        } catch (err) {
            console.error(err);
            toast.error('Failed to run quick evaluation.');
        } finally {
            setRunningQuickEval(false);
        }
    };

    const handleExportCSV = () => {
        if (!analyticsData) return;

        const headers = ["Roll No", "Name", "Department", "Batch", "Semester", "Score", "Trend", "Risk Category", "Priority Factors"];
        const rows = analyticsData.priority_students.map(s => [
            s.roll,
            s.name,
            s.dept || 'N/A',
            s.batch || 'N/A',
            s.semester || 'N/A',
            s.score,
            s.trend,
            s.category,
            (s.factors || []).join("; ")
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(e => e.map(val => `"${val}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const cycleLabel = analyticsData.last_evaluation?.cycle || new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `SLAA_Intelligence_Report_${cycleLabel}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const resetEvaluationModal = () => {
        setShowRunEvaluation(false);
        setEvaluationData({ batch_id: '', cycle_name: '' });
        setEvaluationResult(null);
        setEvaluationError(null);
    };

    

    // --- Intelligence Hub Components ---
    

    

    

    
    

    

    return (
        <div className="space-y-12 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold font-outfit text-white tracking-tight">Command Center</h1>
                    <p className="text-text-muted mt-2">Institutional oversight & evaluation control</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowRunEvaluation(true)}
                        className="btn border border-success/30 text-success bg-success/5 hover:bg-success/10"
                    >
                        <TrendingUp size={18} />
                        Run Evaluation
                    </button>
                    <button
                        onClick={() => setShowAddMapping(true)}
                        className="btn btn-primary"
                    >
                        <Shield size={18} />
                        Strategic Mapping
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Departments', value: stats.departments, icon: Building2, color: 'primary' },
                    { label: 'Active Batches', value: stats.batches, icon: Calendar, color: 'secondary' },
                    { label: 'Staff Count', value: stats.staff, icon: Users, color: 'accent' },
                    { label: 'Pending Data', value: stats.pendingImports, icon: Activity, color: 'warning' }
                ].map((stat, i) => (
                    <div key={i} className="glass-card flex items-center gap-5 border-white/5 py-6">
                        <div className={`p-3 bg-${stat.color}/10 rounded-xl text-${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em]">{stat.label}</p>
                            <h3 className="text-2xl font-black text-white font-outfit leading-none mt-1">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Institutional Intelligence Hub */}
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-3">
                            <Shield className="text-success" />
                            Institutional Intelligence Hub
                        </h2>
                        {analyticsData?.last_evaluation && (
                            <p className="text-[10px] text-text-dim uppercase tracking-widest font-bold mt-1 ml-9">
                                Last Evaluated: {new Date(analyticsData.last_evaluation.timestamp).toLocaleString()}
                            </p>
                        )}
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="relative group">
                                <select
                                    value={selectedDept}
                                    onChange={(e) => {
                                        setSelectedDept(e.target.value);
                                        setSelectedAnalyticsBatch('');
                                    }}
                                    className="bg-bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary appearance-none pr-10 min-w-[200px] hover:border-white/20 transition-all font-medium"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => (
                                        <option key={d._id} value={d._id}>{d.name}</option>
                                    ))}
                                </select>
                                <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim rotate-90 pointer-events-none" />
                            </div>

                            <div className="relative group">
                                <select
                                    value={selectedAnalyticsBatch}
                                    onChange={(e) => setSelectedAnalyticsBatch(e.target.value)}
                                    className="bg-bg-surface border border-white/10 rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary appearance-none pr-10 min-w-[240px] hover:border-white/20 transition-all font-medium"
                                    disabled={!selectedDept && departments.length > 0}
                                >
                                    <option value="">{selectedDept ? 'Select Cohort...' : 'Select Department First'}</option>
                                    {filteredBatches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                <ChevronRight size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim rotate-90 pointer-events-none" />
                            </div>
                        </div>

                        {analyticsData && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleQuickEvaluation}
                                    disabled={runningQuickEval}
                                    className={`p-2.5 bg-success/10 border border-success/20 rounded-xl text-success hover:bg-success/20 transition-all flex items-center gap-2 font-bold text-sm ${runningQuickEval ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    title="Run Real-time Evaluation"
                                >
                                    <RefreshCw size={18} className={runningQuickEval ? 'animate-spin' : ''} />
                                    <span>{runningQuickEval ? 'Evaluating...' : 'Run Evaluation'}</span>
                                </button>
                                <button
                                    onClick={handleExportCSV}
                                    className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary hover:bg-primary/20 transition-all flex items-center gap-2 font-bold text-sm"
                                    title="Export Intelligence Report"
                                >
                                    <Download size={18} />
                                    <span>Export Report</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {loadingAnalytics ? (
                    <div className="h-[400px] glass-card flex flex-col items-center justify-center gap-4 border-dashed">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm font-bold text-text-dim uppercase tracking-widest animate-pulse">Computing Institutional Metrics...</p>
                    </div>
                ) : analyticsData ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <AnalyticsSummary summary={analyticsData.summary} />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1">
                                {riskDistributionMemo}
                            </div>
                            <div className="lg:col-span-2">
                                {growthTrendMemo}
                            </div>
                        </div>

                        <div className="flex flex-col gap-8">
                                <div className="glass-card flex flex-col pb-4 border-b-0 rounded-b-none mb-[-2rem] z-10 relative">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2 shrink-0">
                                            {riskFilter === 'high' ? (
                                                <Sparkles size={18} className="text-success" />
                                            ) : riskFilter === 'stable' ? (
                                                <ShieldCheck size={18} className="text-primary" />
                                            ) : (
                                                <AlertCircle size={18} className="text-error" />
                                            )}
                                            {riskFilter === 'high' ? 'High Performers' :
                                                riskFilter === 'stable' ? 'Stable Cohort' :
                                                    riskFilter === 'all' ? 'Performance Overview' :
                                                        'Priority Attention'}
                                        </h3>
                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            <div className="relative flex-1 md:w-64">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                                                <input
                                                    type="text"
                                                    placeholder="Search student..."
                                                    value={studentSearch}
                                                    onChange={(e) => setStudentSearch(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-primary/50"
                                                />
                                            </div>
                                            <select
                                                value={riskFilter}
                                                onChange={(e) => setRiskFilter(e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-text-dim focus:outline-none focus:border-primary/50"
                                            >
                                                <option value="all">All</option>
                                                <option value="high">High</option>
                                                <option value="stable">Stable</option>
                                                <option value="warning">Warning</option>
                                                <option value="critical">Critical</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <PriorityStudentTable
                                    studentSearch={studentSearch}
                                    riskFilter={riskFilter}
                                    filtered={priorityFilteredStudents}
                                    onStudentClick={(roll) => {
                                        setSelectedStudentRoll(roll);
                                        setShowStudentDetail(true);
                                    }}
                                />
                                {topImproversMemo}
                            </div>
                    </div>
                ) : (
                    <div className="h-[300px] glass-card flex flex-col items-center justify-center gap-6 border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
                        <div className="p-4 bg-primary/5 rounded-full ring-1 ring-primary/20">
                            <LayoutDashboard size={40} className="text-primary opacity-40" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-white mb-2">No Intelligence Selected</h3>
                            <p className="text-sm text-text-dim max-w-sm mx-auto">
                                Select a cohort from the dropdown above to view institutional performance analytics, risk modeling, and growth trends.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Application Modules */}
            <div>
                <h2 className="text-2xl font-bold font-outfit text-white mb-8 flex items-center gap-3">
                    <Layers className="text-primary" />
                    Management Modules
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AdminActionTile
                        title="Staff Directory"
                        desc="Configure faculty and mentor access across the institution."
                        icon={Users}
                        color="primary"
                        path="/admin/staff"
                    />
                    <AdminActionTile
                        title="Institutional Structure"
                        desc="Define departments and organizational hierarchies."
                        icon={Building2}
                        color="secondary"
                        path="/admin/departments"
                    />
                    <AdminActionTile
                        title="Academic Timeline"
                        desc="Manage student cohorts and active evaluation cycles."
                        icon={Calendar}
                        color="accent"
                        path="/admin/batches"
                    />
                    <AdminActionTile
                        title="Subject Catalog"
                        desc="Curate the global repository of subjects and courses."
                        icon={Layers}
                        color="primary"
                        path="/admin/subjects"
                    />
                    <AdminActionTile
                        title="Data Pipeline"
                        desc="Bulk ingest student performance and attendance records."
                        icon={Database}
                        color="warning"
                        path="/admin/imports"
                    />
                </div>
            </div>

            {/* Strategic Mapping Modal */}
            {showAddMapping && (
                <div className="fixed inset-0 bg-bg-deep/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                    <div className="glass-card max-w-lg w-full animate-scale-in border-primary/20 shadow-glow">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-outfit">Strategic Mapping</h3>
                                <p className="text-xs text-text-muted mt-1 uppercase tracking-widest font-bold">Faculty-Subject-Batch Connection</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreateMapping} className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-text-dim mb-2 uppercase tracking-widest">Select Faculty Lead</label>
                                <select
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-5 py-3.5 text-text-main focus:outline-none focus:border-primary appearance-none"
                                    value={newMapping.faculty_email}
                                    onChange={(e) => setNewMapping({ ...newMapping, faculty_email: e.target.value })}
                                    required
                                >
                                    <option value="">Choose Personnel...</option>
                                    {staff.map(s => <option key={s.email} value={s.email}>{s.name} ({s.email})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-dim mb-2 uppercase tracking-widest">Department</label>
                                <select
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary appearance-none"
                                    value={newMapping.dept_id}
                                    onChange={(e) => setNewMapping({ ...newMapping, dept_id: e.target.value, batch_id: '', subject_id: '' })}
                                    required
                                >
                                    <option value="">Select Dept</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-text-dim mb-2 uppercase tracking-widest">Batch Context</label>
                                <select
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary appearance-none"
                                    value={newMapping.batch_id}
                                    onChange={(e) => {
                                        const batch = batches.find(b => b.id === e.target.value);
                                        setNewMapping({
                                            ...newMapping,
                                            batch_id: e.target.value,
                                            subject_ids: [''],
                                            target_semester: batch?.current_semester || ''
                                        });
                                    }}
                                    required
                                    disabled={!newMapping.dept_id}
                                >
                                    <option value="">{newMapping.dept_id ? 'Select Cohort' : 'Select Dept First'}</option>
                                    {batches
                                        .filter(b => b.dept_id === newMapping.dept_id || b.dept_id?._id === newMapping.dept_id)
                                        .map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.name} ({b.dept_code})
                                            </option>
                                        ))}
                                </select>
                            </div>
                            <div className="col-span-2 space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-[10px] font-black text-text-dim uppercase tracking-widest">Target Subject(s)</label>
                                    <button
                                        type="button"
                                        onClick={() => setNewMapping({ ...newMapping, subject_ids: [...newMapping.subject_ids, ''] })}
                                        className="text-[10px] font-black text-primary hover:text-accent uppercase tracking-widest flex items-center gap-1 transition-colors"
                                    >
                                        <Sparkles size={12} />
                                        Add Subject +
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {newMapping.subject_ids.map((sId, index) => (
                                        <div key={index} className="flex gap-2">
                                            <select
                                                className="flex-1 bg-bg-surface border border-border-subtle rounded-xl px-5 py-3.5 text-text-main focus:outline-none focus:border-primary appearance-none text-sm"
                                                value={sId}
                                                onChange={(e) => {
                                                    const updatedIds = [...newMapping.subject_ids];
                                                    updatedIds[index] = e.target.value;
                                                    setNewMapping({ ...newMapping, subject_ids: updatedIds });
                                                }}
                                                required
                                                disabled={!newMapping.dept_id || !newMapping.batch_id}
                                            >
                                                <option value="">
                                                    {!newMapping.dept_id ? 'Select Dept First'
                                                        : !newMapping.batch_id ? 'Select Cohort First'
                                                            : 'Link Subject...'}
                                                </option>
                                                {subjects
                                                    .filter(s => {
                                                        const matchesDept = !s.dept_id || s.dept_id === newMapping.dept_id || s.dept_id?._id === newMapping.dept_id;
                                                        // Ensure subject matches the batch's target semester
                                                        const matchesSem = newMapping.target_semester
                                                            ? Number(s.semester) === Number(newMapping.target_semester)
                                                            : true;
                                                        return matchesDept && matchesSem;
                                                    })
                                                    .map(s => <option key={s.id} value={s.id}>{s.name} ({s.code} - Sem {s.semester})</option>)}
                                            </select>
                                            {newMapping.subject_ids.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updatedIds = newMapping.subject_ids.filter((_, i) => i !== index);
                                                        setNewMapping({ ...newMapping, subject_ids: updatedIds });
                                                    }}
                                                    className="p-3.5 bg-error/10 text-error rounded-xl hover:bg-error/20 transition-colors"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="col-span-2 flex gap-4 pt-6">
                                <button type="button" onClick={() => setShowAddMapping(false)} className="btn btn-outline flex-1">Abort</button>
                                <button type="submit" className="btn btn-primary flex-1">Finalize Strategy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Evaluation Modal */}
            {showRunEvaluation && (
                <div className="fixed inset-0 bg-bg-deep/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                    <div className="glass-card max-w-md w-full animate-scale-in border-success/20 shadow-[0_0_50px_-12px_rgba(16,185,129,0.3)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-3 rounded-xl ${runningEvaluation ? 'bg-success/10 text-success animate-pulse' : evaluationError ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
                                {evaluationError ? <AlertCircle size={24} /> : <Activity size={24} />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-outfit">Evaluation Cycle</h3>
                                <p className="text-xs text-text-dim mt-1 uppercase tracking-widest font-black">Analytical Intelligence Protocol</p>
                            </div>
                        </div>

                        {!evaluationResult && !evaluationError && !runningEvaluation && (
                            <>
                                <p className="text-sm text-text-muted mb-8 leading-relaxed">Initiate a system-wide analysis to calculate adaptability scores for the selected cohort. This will update all student dashboards.</p>
                                <form onSubmit={handleRunEvaluation} className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-text-dim mb-2 uppercase tracking-widest">Cohorts for Analysis</label>
                                        <select
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl px-5 py-3.5 text-text-main focus:outline-none focus:border-success appearance-none"
                                            value={evaluationData.batch_id}
                                            onChange={(e) => setEvaluationData({ ...evaluationData, batch_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Target Batch...</option>
                                            {batches.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name} ({b.dept_code})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-text-dim mb-2 uppercase tracking-widest">Protocol Name</label>
                                        <input
                                            type="text"
                                            value={evaluationData.cycle_name}
                                            onChange={(e) => setEvaluationData({ ...evaluationData, cycle_name: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl px-5 py-3.5 text-text-main focus:outline-none focus:border-success"
                                            placeholder="e.g. SEM_MID_CYCLE_2024"
                                            required
                                        />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={resetEvaluationModal} className="btn btn-outline flex-1">Decline</button>
                                        <button type="submit" className="btn btn-primary bg-success hover:shadow-success/40 flex-1 border-none">
                                            Run Analysis
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {runningEvaluation && (
                            <div className="py-12 text-center space-y-4">
                                <div className="inline-block animate-spin-slow">
                                    <Activity size={48} className="text-success" />
                                </div>
                                <h4 className="text-xl font-bold text-white">Computing Adaptability...</h4>
                                <p className="text-sm text-text-dim">Crunching multi-dimensional metrics for the cohort.</p>
                            </div>
                        )}

                        {evaluationResult && (
                            <div className="space-y-6">
                                <div className="p-4 bg-success/10 border border-success/20 rounded-2xl flex items-start gap-4">
                                    <CheckCircle2 className="text-success shrink-0" size={20} />
                                    <div>
                                        <p className="text-sm font-bold text-success">Protocol Completed</p>
                                        <p className="text-xs text-success/80 mt-0.5">{evaluationResult.message}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="glass-card p-3 text-center border-white/5">
                                        <p className="text-[10px] text-text-dim uppercase tracking-wider font-bold">Total</p>
                                        <p className="text-xl font-black text-white">{evaluationResult.total_cohort || 0}</p>
                                    </div>
                                    <div className="glass-card p-3 text-center border-success/10 bg-success/5">
                                        <p className="text-[10px] text-success uppercase tracking-wider font-bold">Success</p>
                                        <p className="text-xl font-black text-success">{evaluationResult.successful || 0}</p>
                                    </div>
                                    <div className="glass-card p-3 text-center border-warning/10 bg-warning/5">
                                        <p className="text-[10px] text-warning uppercase tracking-wider font-bold">Skipped</p>
                                        <p className="text-xl font-black text-warning">{evaluationResult.skipped || 0}</p>
                                    </div>
                                </div>

                                {evaluationResult.warnings && evaluationResult.warnings.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                                            <Info size={12} />
                                            Calculation Warnings
                                        </div>
                                        <div className="max-h-32 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                            {evaluationResult.warnings.map((w, idx) => (
                                                <div key={idx} className="text-[11px] p-2 bg-white/5 rounded-lg border border-white/5 flex justify-between">
                                                    <span className="text-text-dim">Roll: {w.roll}</span>
                                                    <span className="text-warning/80 italic">{w.error}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button onClick={resetEvaluationModal} className="btn btn-primary w-full bg-success py-4">
                                    Acknowledge & Close
                                </button>
                            </div>
                        )}

                        {evaluationError && (
                            <div className="space-y-6">
                                <div className="p-4 bg-danger/10 border border-danger/20 rounded-2xl flex items-start gap-4">
                                    <XCircle className="text-danger shrink-0" size={20} />
                                    <div>
                                        <p className="text-sm font-bold text-danger">Protocol Aborted</p>
                                        <p className="text-xs text-danger/80 mt-0.5">{evaluationError.message}</p>
                                    </div>
                                </div>
                                <div className="p-4 glass-card border-white/5 text-center">
                                    <p className="text-[10px] text-text-dim uppercase tracking-widest font-bold">Failure Phase</p>
                                    <p className="text-sm font-mono text-text-main mt-1">{evaluationError.phase}</p>
                                </div>
                                <button onClick={resetEvaluationModal} className="btn btn-outline w-full py-4 border-danger/30 text-danger hover:bg-danger/10">
                                    Return to Command Center
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Untracked / Anomalies Modal */}
            {showUntrackedModal && untrackedData && (
                <div className="fixed inset-0 bg-bg-deep/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4 sm:p-8">
                    <div className="glass-card max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col border-warning/20 shadow-glow animate-scale-in">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning border border-warning/20">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white font-outfit uppercase tracking-tight">Data Anomalies</h2>
                                    <p className="text-xs text-text-dim font-bold uppercase tracking-[0.2em]">Untracked Students & Unmapped Subjects</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowUntrackedModal(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-dim hover:text-white"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Unmapped Subjects */}
                                <div className="glass-card border-accent/20 p-0 overflow-hidden">
                                    <div className="p-5 border-b border-white/5 bg-accent/5 flex items-center justify-between">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <Layers size={16} className="text-accent" />
                                            Unmapped Subjects
                                        </h3>
                                        <span className="px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-[10px] font-black text-accent">
                                            {untrackedData.unmapped_subjects.length}
                                        </span>
                                    </div>
                                    <div className="p-5 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                        {untrackedData.unmapped_subjects.length > 0 ? untrackedData.unmapped_subjects.map((sub, i) => (
                                            <div key={i} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] transition-all flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{sub.name}</p>
                                                    <p className="text-[10px] text-text-dim font-mono uppercase">{sub.code}</p>
                                                </div>
                                                <span className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[9px] font-black text-primary uppercase tracking-widest">
                                                    {sub.dept}
                                                </span>
                                            </div>
                                        )) : (
                                            <div className="text-center py-12 text-text-dim text-xs italic">
                                                <CheckCircle2 size={32} className="mx-auto mb-2 text-success opacity-50" />
                                                All subjects are mapped to faculty.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Untracked Students */}
                                <div className="glass-card border-warning/20 p-0 overflow-hidden">
                                    <div className="p-5 border-b border-white/5 bg-warning/5 flex items-center justify-between">
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <Users size={16} className="text-warning" />
                                            Untracked Students
                                        </h3>
                                        <span className="px-3 py-1 bg-warning/10 border border-warning/20 rounded-full text-[10px] font-black text-warning">
                                            {untrackedData.untracked_students.length}
                                        </span>
                                    </div>
                                    <div className="p-5 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
                                        {untrackedData.untracked_students.length > 0 ? untrackedData.untracked_students.map((stu, i) => (
                                            <div key={i} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.06] transition-all">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{stu.name}</p>
                                                        <p className="text-[10px] text-text-dim font-mono">{stu.roll} · {stu.dept} · Sem {stu.semester}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {stu.issues.map((issue, j) => (
                                                        <span key={j} className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border
                                                            ${issue.includes('Mentor') ? 'bg-error/10 text-error border-error/20' :
                                                                issue.includes('Attendance') ? 'bg-warning/10 text-warning border-warning/20' :
                                                                    'bg-info/10 text-info border-info/20'}`}>
                                                            {issue}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="text-center py-12 text-text-dim text-xs italic">
                                                <CheckCircle2 size={32} className="mx-auto mb-2 text-success opacity-50" />
                                                All students have complete data profiles.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Student Analytical Drill-Down */}
            {showStudentDetail && (
                <StudentAnalyticsModal
                    roll={selectedStudentRoll}
                    isAdmin={true}
                    onDataChange={() => {
                        fetchStats();
                        if (selectedAnalyticsBatch) {
                            fetchAnalytics(selectedAnalyticsBatch);
                        }
                    }}
                    onClose={() => {
                        setShowStudentDetail(false);
                        setSelectedStudentRoll(null);
                    }}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
