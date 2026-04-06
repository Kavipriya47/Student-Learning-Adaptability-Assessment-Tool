import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Layers, Search, BookOpen, Trash2, ArrowLeft, GraduationCap, Edit2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import './MappingManagement.css';

const MappingManagement = () => {
    const [mappings, setMappings] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    const [filterBatch, setFilterBatch] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [departments, setDepartments] = useState([]);
    const [batches, setBatches] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMapping, setEditingMapping] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [mappingRes, staffRes, deptRes, batchRes] = await Promise.all([
                api.get(`/api/admin/staff-mapping?dept_id=${filterDept}&batch_id=${filterBatch}&semester=${filterSemester}`),
                api.get('/api/admin/staff?limit=1000'),
                api.get('/api/admin/departments'),
                api.get('/api/admin/batches')
            ]);
            setMappings(mappingRes.data);
            setStaff(staffRes.data.staff || staffRes.data);
            setDepartments(deptRes.data);
            setBatches(batchRes.data);
        } catch (err) {
            console.error('Failed to fetch mapping data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterDept, filterBatch, filterSemester]);

    const handleRevokeMapping = async (id) => {
        if (!window.confirm('Are you sure you want to revoke this mapping? The faculty will lose access to this subject immediately.')) return;
        try {
            await api.delete(`/api/admin/staff-mapping/${id}`);
            fetchData();
            toast.success('Mapping revoked successfully');
        } catch (err) {
            console.error('Revoke mapping error:', err.response?.data || err.message);
            toast.error('Error revoking mapping: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleUpdateMapping = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/admin/staff-mapping/${editingMapping.id}`, {
                faculty_email: editingMapping.faculty_email,
                subject_id: editingMapping.subject_id,
                batch_id: editingMapping.batch_id,
                dept_id: editingMapping.dept_id
            });
            setShowEditModal(false);
            setEditingMapping(null);
            fetchData();
            toast.success('Mapping updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error updating mapping');
        }
    };

    const openEditMappingModal = (mapping) => {
        setEditingMapping({
            id: mapping.id,
            faculty_email: mapping.faculty_email,
            subject_id: mapping.subject?.id,
            batch_id: mapping.batch?.id,
            dept_id: mapping.dept?.id
        });
        setShowEditModal(true);
    };

    const filteredMappings = useMemo(() => {
        const query = debouncedSearch.toLowerCase();
        return mappings.filter(m =>
            m.faculty_email.toLowerCase().includes(query) ||
            m.subject?.name.toLowerCase().includes(query) ||
            m.batch?.name.toLowerCase().includes(query)
        );
    }, [mappings, debouncedSearch]);

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <Link to="/admin" className="text-primary hover:text-accent text-sm font-medium flex items-center gap-2 mb-2 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Command Center
                    </Link>
                    <h1 className="text-4xl font-extrabold font-outfit text-white">Academic Mappings</h1>
                    <p className="text-text-muted">Manage Faculty-Subject-Batch relationships</p>
                </div>
                <div className="flex gap-4">
                    <Link to="/admin/subjects" className="btn btn-outline text-xs">
                        <BookOpen size={16} />
                        Catalog
                    </Link>
                </div>
            </div>

            <div className="glass-card">
                <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="relative min-w-[300px] flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                        <input
                            type="text"
                            placeholder="Filter by Faculty, Subject or Batch name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl pl-12 pr-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        />
                    </div>

                    <div className="min-w-[200px]">
                        <select
                            value={filterDept}
                            onChange={(e) => {
                                setFilterDept(e.target.value);
                                setFilterBatch(''); // Reset batch when dept changes
                            }}
                            className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="min-w-[200px]">
                        <select
                            value={filterBatch}
                            onChange={(e) => setFilterBatch(e.target.value)}
                            className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        >
                            <option value="">All Batches</option>
                            {batches
                                .filter(b => !filterDept || b.dept_id === filterDept || b.dept_id?._id === filterDept)
                                .map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.dept_code})</option>
                                ))}
                        </select>
                    </div>

                    <div className="min-w-[150px]">
                        <select
                            value={filterSemester}
                            onChange={(e) => setFilterSemester(e.target.value)}
                            className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        >
                            <option value="">All Semesters</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                <option key={s} value={s}>Semester {s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="slaa-table-container">
                    <table className="slaa-table">
                        <thead>
                            <tr>
                                <th>Faculty Member</th>
                                <th>Assigned Subject</th>
                                <th>Target Batch</th>
                                <th>Department</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMappings.map((m) => (
                                <tr key={m.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                {m.faculty_email?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-text-main">{m.faculty_email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-text-main">{m.subject?.name || 'Unknown'}</span>
                                            <span className="text-[10px] font-mono text-secondary">{m.subject?.code || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-text-muted">
                                            <GraduationCap size={14} className="text-accent" />
                                            <span className="text-sm">
                                                {m.batch?.name || 'N/A'}
                                                <span className="text-secondary text-[10px] font-bold ml-1">({m.batch?.dept_code || '???'})</span>
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="text-xs text-text-dim italic">{m.dept?.name || 'N/A'}</span>
                                    </td>
                                    <td className="flex gap-2">
                                        <button
                                            onClick={() => openEditMappingModal(m)}
                                            className="p-2 text-text-dim hover:text-accent transition-colors group"
                                            title="Edit Mapping"
                                        >
                                            <Edit2 size={18} className="group-hover:scale-110 transition-transform" />
                                        </button>
                                        <button
                                            onClick={() => handleRevokeMapping(m.id)}
                                            className="p-2 text-text-dim hover:text-danger transition-colors group"
                                            title="Revoke Mapping"
                                        >
                                            <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredMappings.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="text-center py-20 text-text-dim italic">
                                        <div className="flex flex-col items-center">
                                            <Layers size={48} className="mb-4 opacity-20" />
                                            <p>No active mappings found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Mapping Modal */}
            {showEditModal && editingMapping && (
                <div className="fixed inset-0 bg-bg-deep/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                    <div className="glass-card max-w-md w-full animate-scale-in border-accent/20 shadow-glow">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-accent/10 rounded-xl text-accent">
                                <Edit2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-outfit">Shift Assignment</h3>
                                <p className="text-xs text-text-muted mt-1 uppercase tracking-widest font-bold">Update Faculty Lead</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateMapping} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-text-dim mb-2 uppercase tracking-widest">Select New Faculty Lead</label>
                                <select
                                    className="w-full bg-bg-surface border border-border-subtle rounded-xl px-5 py-3.5 text-text-main focus:outline-none focus:border-accent appearance-none"
                                    value={editingMapping.faculty_email}
                                    onChange={(e) => setEditingMapping({ ...editingMapping, faculty_email: e.target.value })}
                                    required
                                >
                                    {staff.map(s => <option key={s.email} value={s.email}>{s.name} ({s.email})</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2 p-4 bg-white/5 rounded-xl border border-white/5">
                                <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">Reference Context</span>
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-muted">Subject</span>
                                    <span className="text-white font-bold">{mappings.find(m => m.id === editingMapping.id)?.subject?.name}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-muted">Batch</span>
                                    <span className="text-white font-bold">{mappings.find(m => m.id === editingMapping.id)?.batch?.name}</span>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline flex-1">Abort</button>
                                <button type="submit" className="btn btn-primary bg-accent hover:shadow-accent/40 flex-1">Update Assignment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MappingManagement;
