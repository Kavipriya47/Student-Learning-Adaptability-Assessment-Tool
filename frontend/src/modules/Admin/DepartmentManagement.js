import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Building2, Plus, Trash2, ArrowLeft, Hash, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './DepartmentManagement.css';

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newDept, setNewDept] = useState({ name: '', code: '' });
    const [editingDept, setEditingDept] = useState(null);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/api/admin/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error('Failed to fetch departments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleCreateDept = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/admin/departments', newDept);
            setNewDept({ name: '', code: '' });
            setShowAddModal(false);
            fetchDepartments();
            toast.success('Department created successfully');
        } catch (err) {
            toast.error('Error creating department: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateDept = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/admin/departments/${editingDept.id}`, editingDept);
            setEditingDept(null);
            setShowEditModal(false);
            fetchDepartments();
            toast.success('Department updated successfully');
        } catch (err) {
            toast.error('Error updating department: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteDept = async (id) => {
        const confirmMessage = "CRITICAL WARNING: Deleting this department will also PERMANENTLY DELETE all associated:\n" +
            "• Batches and Evaluation Cycles\n" +
            "• Students and their Attendance/Marks/Rewards\n" +
            "• Subjects and Faculty Mappings\n\n" +
            "This action CANNOT be undone. Are you absolutely sure?";

        if (!window.confirm(confirmMessage)) return;
        const toastId = toast.loading('Deleting department and all associated data...');
        try {
            await api.delete(`/api/admin/departments/${id}`);
            toast.success('Department and all associated data deleted successfully.', { id: toastId });
            fetchDepartments();
        } catch (err) {
            toast.error('Error: ' + (err.response?.data?.message || err.message), { id: toastId });
        }
    };

    const filteredDepartments = useMemo(() => {
        return departments.filter(d =>
            d.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            d.code.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    }, [departments, debouncedSearch]);

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <Link to="/admin" className="text-primary hover:text-accent text-sm font-medium flex items-center gap-2 mb-2 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Command Center
                    </Link>
                    <h1 className="text-4xl font-extrabold font-outfit text-white">Departments</h1>
                    <p className="text-text-muted">Configure institutional academic divisions</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                    <Plus size={20} />
                    Add Department
                </button>
            </div>

            <div className="glass-card mb-8">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                    <input
                        type="text"
                        placeholder="Search departments by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl pl-12 pr-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDepartments.map((dept) => (
                    <div key={dept.id} className="glass-card hover:border-primary/50 group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
                                <Building2 size={32} />
                            </div>
                            <span className="font-mono text-sm font-bold text-secondary bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">
                                {dept.code}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold font-outfit text-text-main mb-2 truncate" title={dept.name}>
                            {dept.name}
                        </h3>
                        <div className="flex items-center justify-between pt-6 mt-6 border-t border-border-subtle/30">
                            <div className="flex items-center gap-2 text-text-dim text-xs font-medium">
                                <Hash size={14} />
                                ID: {dept.id}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        setEditingDept(dept);
                                        setShowEditModal(true);
                                    }}
                                    className="text-text-dim hover:text-primary transition-colors p-2"
                                    title="Edit Department"
                                >
                                    <Plus className="rotate-45" size={18} />
                                </button>
                                <button
                                    onClick={() => handleDeleteDept(dept.id)}
                                    className="text-text-dim hover:text-danger transition-colors p-2"
                                    title="Delete Department"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {departments.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center glass-card border-dashed">
                        <div className="inline-flex p-6 bg-border-subtle/10 rounded-full text-text-dim mb-4">
                            <Building2 size={48} />
                        </div>
                        <h3 className="text-xl font-bold font-outfit text-text-muted">No Departments Configured</h3>
                        <p className="text-text-dim mt-2">Start by adding your first academic department.</p>
                        <button onClick={() => setShowAddModal(true)} className="btn btn-outline mt-6">
                            <Plus size={18} /> Add Now
                        </button>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card max-w-md w-full animate-scale-in border-primary/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                <Plus size={24} />
                            </div>
                            <h3 className="text-2xl font-bold font-outfit">New Department</h3>
                        </div>

                        <form onSubmit={handleCreateDept} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Department Name</label>
                                <input
                                    type="text"
                                    value={newDept.name}
                                    onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                                    placeholder="e.g. Information Technology"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Short Code</label>
                                <input
                                    type="text"
                                    value={newDept.code}
                                    onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary font-mono"
                                    placeholder="e.g. IT"
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary flex-1">Create Dept</button>
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
                            <h3 className="text-2xl font-bold font-outfit">Edit Department</h3>
                        </div>

                        <form onSubmit={handleUpdateDept} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Department Name</label>
                                <input
                                    type="text"
                                    value={editingDept.name}
                                    onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                    placeholder="e.g. Information Technology"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Short Code</label>
                                <input
                                    type="text"
                                    value={editingDept.code}
                                    onChange={(e) => setEditingDept({ ...editingDept, code: e.target.value })}
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent font-mono"
                                    placeholder="e.g. IT"
                                    required
                                />
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

export default DepartmentManagement;
