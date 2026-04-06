import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Plus, Trash2, ArrowLeft, Layers, Filter, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './SubjectManagement.css';

const SubjectManagement = () => {
    const [subjects, setSubjects] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSubject, setEditingSubject] = useState(null);

    // Filters
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [departments, setDepartments] = useState([]);
    const [batches, setBatches] = useState([]);

    // Modal state
    const [newSubject, setNewSubject] = useState({ name: '', code: '', dept_id: '', semester: '' });
    const [addingForSemester, setAddingForSemester] = useState(null);

    const fetchData = async () => {
        try {
            const [subRes, deptRes, batchRes] = await Promise.all([
                api.get(`/api/admin/subjects?search=${searchTerm}&dept_id=${selectedDept}&semester=${selectedSemester}`),
                api.get('/api/admin/departments'),
                api.get('/api/admin/batches')
            ]);
            setSubjects(subRes.data || []);
            setDepartments(deptRes.data || []);
            setBatches(batchRes.data || []);
        } catch (err) {
            console.error('Failed to fetch data');
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedDept, selectedSemester]);

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/admin/subjects', newSubject);
            setNewSubject({ name: '', code: '', dept_id: '', semester: '' });
            setShowAddModal(false);
            setAddingForSemester(null);
            fetchData();
            toast.success('Course created successfully');
        } catch (err) {
            toast.error('Error creating subject: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateSubject = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/admin/subjects/${editingSubject.id}`, editingSubject);
            setEditingSubject(null);
            setShowEditModal(false);
            fetchData();
            toast.success('Course updated successfully');
        } catch (err) {
            console.error('[SubjectManagement] Update Error:', err);
            const detail = err.response?.data?.error || err.response?.data?.message || err.message;
            toast.error('Error updating subject: ' + detail);
        }
    };

    const handleDeleteSubject = async (id) => {
        const confirmMessage = "WARNING: Deleting this course will also PERMANENTLY DELETE all associated:\n" +
            "• Student Mark Records\n" +
            "• Faculty Subject Mappings (Revoked)\n\n" +
            "This action cannot be undone. Proceed?";

        if (!window.confirm(confirmMessage)) return;
        try {
            await api.delete(`/api/admin/subjects/${id}`);
            fetchData();
            toast.success('Course deleted successfully');
        } catch (err) {
            toast.error('Error deleting subject: ' + (err.response?.data?.message || err.message));
        }
    };

    const openAddModalForSemester = (semesterValue) => {
        setAddingForSemester(semesterValue);
        setNewSubject({
            name: '',
            code: '',
            dept_id: selectedDept || '',
            semester: semesterValue
        });
        setShowAddModal(true);
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setAddingForSemester(null);
    };

    // Filter Logic
    // Server-side filtering is now used for search and department.
    // We still keep client-side grouping by semester below.
    const filteredSubjects = subjects;

    // Grouping Logic
    const semestersList = [1, 2, 3, 4, 5, 6, 7, 8];

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <Link to="/admin" className="text-primary hover:text-accent text-sm font-medium flex items-center gap-2 mb-2 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Command Center
                    </Link>
                    <h1 className="text-4xl font-extrabold font-outfit text-white">Subject Catalog</h1>
                    <p className="text-text-muted">Define academic courses by semester</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-text-dim px-2">
                    <Filter size={18} />
                    <span className="font-bold uppercase tracking-widest text-xs">Filters:</span>
                </div>

                <div className="relative min-w-[250px] flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                    <input
                        type="text"
                        placeholder="Search subjects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl pl-12 pr-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-secondary transition-all"
                    />
                </div>

                <div className="min-w-[200px]">
                    <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-secondary transition-all"
                    >
                        <option value="">All Departments</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                        ))}
                    </select>
                </div>
                <div className="min-w-[200px]">
                    <select
                        value={selectedBatch}
                        onChange={(e) => setSelectedBatch(e.target.value)}
                        className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-secondary transition-all"
                    >
                        <option value="">All Batches (Context Only)</option>
                        {batches.filter(b => !selectedDept || b.dept_id === selectedDept).map(b => (
                            <option key={b.id} value={b.id}>{b.name} ({b.dept_code})</option>
                        ))}
                    </select>
                </div>

                <div className="min-w-[150px]">
                    <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value)}
                        className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl px-4 py-2.5 text-sm text-text-main focus:outline-none focus:border-secondary transition-all"
                    >
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                            <option key={s} value={s}>Semester {s}</option>
                        ))}
                    </select>
                </div>

                <div className="ml-auto">
                    <button onClick={() => openAddModalForSemester('')} className="btn btn-primary bg-secondary/20 text-secondary hover:bg-secondary/30 border-0 h-10 px-4">
                        <Plus size={18} className="mr-2" />
                        Generic Add
                    </button>
                </div>
            </div >

            {/* Semester Groups Container */}
            < div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6" >
                {
                    semestersList.map(semesterValue => {
                        const semesterSubjects = filteredSubjects.filter(s => s.semester === semesterValue);

                        return (
                            <div key={semesterValue} className="glass-card p-0 overflow-hidden flex flex-col h-full border-white/5 hover:border-secondary/20 transition-colors">
                                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary font-bold">
                                            {semesterValue}
                                        </div>
                                        <h3 className="font-bold font-outfit text-white">Semester {semesterValue}</h3>
                                    </div>
                                    <span className="text-xs font-bold text-text-dim px-2 py-1 bg-black/20 rounded-md">
                                        {semesterSubjects.length} Courses
                                    </span>
                                </div>

                                <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-2">
                                    {semesterSubjects.length > 0 ? (
                                        semesterSubjects.map(sub => (
                                            <div key={sub.id} className="p-3 bg-bg-surface border border-border-subtle/50 rounded-xl hover:border-secondary/30 transition-colors group flex items-start justify-between">
                                                <div>
                                                    <p className="font-bold text-text-main text-sm">{sub.name}</p>
                                                    <p className="font-mono text-[10px] text-secondary mt-1">{sub.code}</p>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => {
                                                            setEditingSubject(sub);
                                                            setShowEditModal(true);
                                                        }}
                                                        className="text-text-dim hover:text-primary p-1 rounded-md hover:bg-primary/10"
                                                        title="Edit Course"
                                                    >
                                                        <Plus size={14} className="rotate-45" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSubject(sub.id)}
                                                        className="text-text-dim hover:text-danger p-1 rounded-md hover:bg-danger/10"
                                                        title="Delete Course"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center py-6">
                                            <Layers size={24} className="text-text-dim mb-2 opacity-50" />
                                            <p className="text-xs text-text-dim italic">No subjects configured</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 border-t border-white/5 bg-black/10 mt-auto">
                                    <button
                                        onClick={() => openAddModalForSemester(semesterValue)}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-text-dim hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors border border-dashed border-white/10 hover:border-secondary/30"
                                    >
                                        <Plus size={16} />
                                        Add to Sem {semesterValue}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                }
            </div >

            {/* Add Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                        <div className="glass-card max-w-md w-full animate-scale-in border-secondary/20">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
                                    <Plus size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold font-outfit">New Course</h3>
                                    {addingForSemester && (
                                        <p className="text-sm text-text-muted">Targeting Semester {addingForSemester}</p>
                                    )}
                                </div>
                            </div>

                            <form onSubmit={handleCreateSubject} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Subject Name</label>
                                    <input
                                        type="text"
                                        value={newSubject.name}
                                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-secondary"
                                        placeholder="e.g. Data Communication"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Subject Code</label>
                                    <input
                                        type="text"
                                        value={newSubject.code}
                                        onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-secondary font-mono"
                                        placeholder="e.g. CS101"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Department</label>
                                    <select
                                        value={newSubject.dept_id}
                                        onChange={(e) => setNewSubject({ ...newSubject, dept_id: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-secondary"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* If opened via a specific semester button, lock the semester input */}
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Semester</label>
                                    {addingForSemester ? (
                                        <div className="w-full bg-bg-surface/50 border border-border-subtle rounded-xl px-4 py-3 text-text-dim font-bold flex items-center justify-between">
                                            <span>Semester {addingForSemester}</span>
                                            <span className="text-[10px] uppercase bg-black/20 px-2 py-0.5 rounded">Locked</span>
                                        </div>
                                    ) : (
                                        <input
                                            type="number"
                                            min="1"
                                            max="8"
                                            value={newSubject.semester}
                                            onChange={(e) => setNewSubject({ ...newSubject, semester: parseInt(e.target.value) || '' })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-secondary"
                                            placeholder="e.g. 1"
                                            required
                                        />
                                    )}
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={closeAddModal} className="btn btn-outline flex-1">Cancel</button>
                                    <button type="submit" className="btn btn-primary bg-secondary hover:shadow-secondary/40 flex-1">Register Course</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Edit Modal */}
            {
                showEditModal && (
                    <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                        <div className="glass-card max-w-md w-full animate-scale-in border-secondary/20">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-secondary/10 rounded-xl text-secondary">
                                    <Plus size={24} className="rotate-45" />
                                </div>
                                <h3 className="text-2xl font-bold font-outfit">Edit Course</h3>
                            </div>

                            <form onSubmit={handleUpdateSubject} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Subject Name</label>
                                    <input
                                        type="text"
                                        value={editingSubject.name}
                                        onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-secondary"
                                        placeholder="e.g. Data Communication"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Subject Code</label>
                                    <input
                                        type="text"
                                        value={editingSubject.code}
                                        onChange={(e) => setEditingSubject({ ...editingSubject, code: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-secondary font-mono"
                                        placeholder="e.g. CS101"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Department</label>
                                    <select
                                        value={editingSubject.dept_id}
                                        onChange={(e) => setEditingSubject({ ...editingSubject, dept_id: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-secondary"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Semester</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="8"
                                        value={editingSubject.semester}
                                        onChange={(e) => setEditingSubject({ ...editingSubject, semester: parseInt(e.target.value) || '' })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-secondary"
                                        placeholder="e.g. 1"
                                        required
                                    />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline flex-1">Cancel</button>
                                    <button type="submit" className="btn btn-primary bg-secondary hover:shadow-secondary/40 flex-1">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
        </div>
    );
};

export default SubjectManagement;
