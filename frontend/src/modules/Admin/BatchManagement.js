import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Calendar, Plus, Trash2, ArrowLeft, GraduationCap, Building2, ChevronRight, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './BatchManagement.css';

const BatchManagement = () => {
    const [batches, setBatches] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newBatch, setNewBatch] = useState({ name: '', dept_id: '' });
    const [editingBatch, setEditingBatch] = useState(null);

    const fetchData = async () => {
        try {
            const [batchRes, deptRes] = await Promise.all([
                api.get('/api/admin/batches'),
                api.get('/api/admin/departments')
            ]);
            setBatches(batchRes.data);
            setDepartments(deptRes.data);
        } catch (err) {
            console.error('Failed to fetch batches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreateBatch = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/admin/batches', newBatch);
            setNewBatch({ name: '', dept_id: '' });
            setShowAddModal(false);
            fetchData();
            toast.success('Batch created successfully');
        } catch (err) {
            toast.error('Error creating batch: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateBatch = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/admin/batches/${editingBatch.id}`, editingBatch);
            setEditingBatch(null);
            setShowEditModal(false);
            fetchData();
            toast.success('Batch updated successfully');
        } catch (err) {
            toast.error('Error updating batch: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteBatch = async (id) => {
        const confirmMessage = "WARNING: Deleting this batch will PERMANENTLY DELETE all associated:\n" +
            "• Students and their Attendance/Marks/Rewards\n" +
            "• Mentoring Notes and Adaptability History\n" +
            "• Evaluation Runs and Faculty Mappings\n\n" +
            "This action cannot be undone. Proceed?";

        if (!window.confirm(confirmMessage)) return;
        try {
            await api.delete(`/api/admin/batches/${id}`);
            fetchData();
            toast.success('Batch deleted successfully');
        } catch (err) {
            toast.error('Error deleting batch: ' + (err.response?.data?.message || err.message));
        }
    };

    const filteredBatches = useMemo(() => {
        return batches.filter(b => {
            const matchesSearch = b.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                b.dept_code.toLowerCase().includes(debouncedSearch.toLowerCase());
            const matchesDept = !filterDept || b.dept_id === filterDept;
            return matchesSearch && matchesDept;
        });
    }, [batches, debouncedSearch, filterDept]);

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <Link to="/admin" className="text-primary hover:text-accent text-sm font-medium flex items-center gap-2 mb-2 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Command Center
                    </Link>
                    <h1 className="text-4xl font-extrabold font-outfit text-white">Academic Batches</h1>
                    <p className="text-text-muted">Manage student cohorts and timelines</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                    <Plus size={20} />
                    New Batch
                </button>
            </div>

            <div className="glass-card mb-8">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative min-w-[300px] flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                        <input
                            type="text"
                            placeholder="Search cohorts by name or department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl pl-12 pr-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <div className="p-3 bg-white/5 rounded-xl text-text-dim">
                            <Filter size={18} />
                        </div>
                        <select
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBatches.map((batch) => (
                    <div key={batch.id} className="relative group">
                        <Link to={`/admin/batches/${batch.id}`} className="block h-full">
                            <div className="glass-card hover:border-accent/50 h-full flex flex-col transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-accent/10 rounded-2xl text-accent group-hover:scale-110 transition-transform">
                                        <GraduationCap size={32} />
                                    </div>
                                    <span className="font-mono text-xs font-bold text-text-muted bg-white/5 px-2 py-1 rounded">
                                        ID: {batch.id}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold font-outfit text-text-main mb-1">
                                    {batch.name} <span className="text-accent text-sm font-medium">({batch.dept_code})</span>
                                </h3>
                                <div className="flex items-center gap-2 text-text-dim text-sm">
                                    <Building2 size={14} />
                                    {departments.find(d => d.id === batch.dept_id)?.name || 'Unknown Department'}
                                </div>
                                <div className="flex items-center justify-between pt-6 mt-6 border-t border-border-subtle/30 mt-auto">
                                    <div className="flex items-center gap-2 text-success text-xs font-bold uppercase tracking-wider">
                                        <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                                        Active Cycle
                                    </div>
                                    <div className="p-2 text-text-muted group-hover:text-accent transition-colors">
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setEditingBatch(batch);
                                setShowEditModal(true);
                            }}
                            className="absolute top-4 right-24 p-2 text-text-dim hover:text-primary transition-all opacity-0 group-hover:opacity-100 z-10"
                            title="Edit Batch"
                        >
                            <Plus className="rotate-45" size={18} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteBatch(batch.id);
                            }}
                            className="absolute top-4 right-14 p-2 text-text-dim hover:text-danger transition-all opacity-0 group-hover:opacity-100 z-10"
                            title="Delete Batch"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}

                {batches.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center glass-card border-dashed">
                        <div className="inline-flex p-6 bg-border-subtle/10 rounded-full text-text-dim mb-4">
                            <Calendar size={48} />
                        </div>
                        <h3 className="text-xl font-bold font-outfit text-text-muted">No Batches Found</h3>
                        <p className="text-text-dim mt-2">Add student cohorts to categorize data.</p>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card max-w-md w-full animate-scale-in border-accent/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-accent/10 rounded-xl text-accent">
                                <Plus size={24} />
                            </div>
                            <h3 className="text-2xl font-bold font-outfit">New Academic Batch</h3>
                        </div>

                        <form onSubmit={handleCreateBatch} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Batch Name</label>
                                <input
                                    type="text"
                                    value={newBatch.name}
                                    onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                    placeholder="e.g. 2021-2025"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Department</label>
                                <select
                                    value={newBatch.dept_id}
                                    onChange={(e) => setNewBatch({ ...newBatch, dept_id: e.target.value })}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary bg-accent hover:shadow-accent/40 flex-1">Create Batch</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card max-w-md w-full animate-scale-in border-accent/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-accent/10 rounded-xl text-accent">
                                <Plus className="rotate-45" size={24} />
                            </div>
                            <h3 className="text-2xl font-bold font-outfit">Edit Academic Batch</h3>
                        </div>

                        <form onSubmit={handleUpdateBatch} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Batch Name</label>
                                <input
                                    type="text"
                                    value={editingBatch.name}
                                    onChange={(e) => setEditingBatch({ ...editingBatch, name: e.target.value })}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                    placeholder="e.g. 2021-2025"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Department</label>
                                <select
                                    value={editingBatch.dept_id}
                                    onChange={(e) => setEditingBatch({ ...editingBatch, dept_id: e.target.value })}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary bg-accent hover:shadow-accent/40 flex-1">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchManagement;
