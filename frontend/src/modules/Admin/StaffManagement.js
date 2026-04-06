import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import { Plus, Search, Mail, Shield, Trash2, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import ImageUpload from '../../components/ImageUpload';
import toast from 'react-hot-toast';
import './StaffManagement.css';

const StaffManagement = () => {
    const [staff, setStaff] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [editingStaff, setEditingStaff] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [newStaff, setNewStaff] = useState({
        name: '',
        email: '',
        role: 'Faculty',
        staff_id: '',
        dept_id: ''
    });

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset to page 1 when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, filterRole, filterDept]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const deptRes = await api.get('/api/admin/departments');
            setDepartments(deptRes.data);
        } catch (err) {
            console.error('Failed to fetch departments');
        }

        try {
            const staffRes = await api.get(`/api/admin/staff?page=${currentPage}&limit=10&search=${debouncedSearch}&role=${filterRole}&dept_id=${filterDept}`);
            // Use fallback if api is older and still returns array
            setStaff(staffRes.data.staff || staffRes.data);
            setTotalPages(staffRes.data.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch staff');
        }
        setLoading(false);
    }, [currentPage, debouncedSearch, filterRole, filterDept]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/admin/staff', newStaff);
            setNewStaff({ name: '', email: '', role: 'Faculty', staff_id: '', dept_id: '' });
            setShowAddModal(false);
            fetchData();
            toast.success('Staff member registered successfully');
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            toast.error('Error creating staff member: ' + msg);
        }
    };

    const handleUpdateStaff = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/admin/staff/${editingStaff.id}`, editingStaff);
            setEditingStaff(null);
            setShowEditModal(false);
            fetchData();
            toast.success('Staff details updated');
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            toast.error('Error updating staff member: ' + msg);
        }
    };

    const handleDeleteStaff = async (id) => {
        if (!window.confirm('Are you sure you want to delete this staff member?')) return;
        try {
            await api.delete(`/api/admin/staff/${id}`);
            fetchData();
            toast.success('Staff member removed');
        } catch (err) {
            toast.error('Error deleting staff member: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleResetPassword = async (person) => {
        if (!window.confirm(`Are you sure you want to reset password for ${person.name}? The password will be set to their institutional email.`)) return;
        try {
            await api.patch(`/api/admin/staff/${person.id}/reset-password`);
            toast.success(`Password for ${person.name} reset to default.`);
        } catch (err) {
            toast.error('Error resetting password: ' + (err.response?.data?.message || err.message));
        }
    };


    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <Link to="/admin" className="text-primary hover:text-accent text-sm font-medium flex items-center gap-2 mb-2 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Command Center
                    </Link>
                    <h1 className="text-4xl font-extrabold font-outfit text-white">Staff Management</h1>
                    <p className="text-text-muted">Manage academic faculty and mentors</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
                    <UserPlus size={20} />
                    Add Staff Member
                </button>
            </div>

            <div className="glass-card">
                <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="relative min-w-[300px] flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name, email or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl pl-12 pr-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 min-w-[150px]">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full bg-bg-surface-light/30 border border-border-subtle rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary transition-all"
                        >
                            <option value="">All Roles</option>
                            <option value="Faculty">Faculty</option>
                            <option value="Mentor">Mentor</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 min-w-[200px]">
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

                <div className="slaa-table-container">
                    <table className="slaa-table">
                        <thead>
                            <tr>
                                <th>Staff Member</th>
                                <th>Staff ID</th>
                                <th>Department</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.map((person) => (
                                <tr key={person.id}>
                                    <td>
                                        <div className="flex items-center gap-4 text-left">
                                            {person.profile_pic ? (
                                                <img 
                                                    src={person.profile_pic} 
                                                    alt={person.name} 
                                                    className="w-10 h-10 rounded-full object-cover border border-border-subtle shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                                                    {person.name.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-text-main">{person.name}</p>
                                                <div className="flex items-center gap-1.5 text-text-dim text-xs">
                                                    <Mail size={12} />
                                                    {person.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="font-mono text-sm text-secondary bg-secondary/10 px-2 py-1 rounded">
                                            {person.staff_id || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="text-text-muted text-sm italic">
                                        {person.dept_name || 'Not Assigned'}
                                    </td>
                                    <td>
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${person.role === 'Mentor' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-primary/10 text-primary border border-primary/20'
                                            }`}>
                                            <Shield size={10} />
                                            {person.role}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleResetPassword(person)}
                                                className="p-2 text-text-dim hover:text-accent transition-colors"
                                                title="Reset Password to Default"
                                            >
                                                <Shield size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingStaff(person);
                                                    setShowEditModal(true);
                                                }}
                                                className="p-2 text-text-dim hover:text-primary transition-colors"
                                                title="Edit Staff"
                                            >
                                                <Plus className="rotate-45" size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStaff(person.id)}
                                                className="p-2 text-text-dim hover:text-danger transition-colors"
                                                title="Delete Staff"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                            ))}
                            {staff.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="text-center py-12 text-text-dim italic">
                                        No staff members found matching your search.
                                    </td>
                                </tr>
                            )}
                            {loading && (
                                <tr>
                                    <td colSpan="5" className="text-center py-12">
                                        <Loader2 className="animate-spin text-primary mx-auto mb-4" size={32} />
                                        <p className="text-text-dim font-medium italic">Loading records...</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {!loading && totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
            </div>

            {/* Add Staff Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                        <div className="glass-card max-w-md w-full animate-scale-in border-primary/20 bg-bg-surface-light/40">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                    <UserPlus size={24} />
                                </div>
                                <h3 className="text-2xl font-bold font-outfit">Add New Staff</h3>
                            </div>

                            <form onSubmit={handleCreateStaff} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Full Name</label>
                                    <input
                                        type="text"
                                        value={newStaff.name}
                                        onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                                        placeholder="e.g. Dr. Jane Smith"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Institutional Email</label>
                                    <input
                                        type="email"
                                        value={newStaff.email}
                                        onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                                        placeholder="e.g. jane@example.com"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Staff ID</label>
                                        <input
                                            type="text"
                                            value={newStaff.staff_id}
                                            onChange={(e) => setNewStaff({ ...newStaff, staff_id: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary font-mono"
                                            placeholder="ST-1234"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Primary Role</label>
                                        <select
                                            value={newStaff.role}
                                            onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                                        >
                                            <option value="Faculty">Faculty</option>
                                            <option value="Mentor">Mentor</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Department</label>
                                    <select
                                        value={newStaff.dept_id}
                                        onChange={(e) => setNewStaff({ ...newStaff, dept_id: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline flex-1">Cancel</button>
                                    <button type="submit" className="btn btn-primary flex-1">Register Staff</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Edit Staff Modal */}
            {
                showEditModal && (
                    <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                        <div className="glass-card max-w-md w-full animate-scale-in border-primary/20 bg-bg-surface-light/40">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                    <Plus size={24} className="rotate-45" />
                                </div>
                                <h3 className="text-2xl font-bold font-outfit">Edit Staff Member</h3>
                            </div>

                            <div className="mb-6 pb-6 border-b border-border-subtle/50">
                                <label className="block text-[10px] font-bold text-text-muted mb-4 uppercase tracking-widest text-center">Profile Photograph</label>
                                <ImageUpload 
                                    entityId={editingStaff.id} 
                                    currentImage={editingStaff.profile_pic} 
                                    isAdmin={true}
                                    onUpdate={(newPic) => {
                                        setEditingStaff({ ...editingStaff, profile_pic: newPic });
                                        fetchData(); // Refresh list to sync components
                                    }}
                                />
                            </div>

                            <form onSubmit={handleUpdateStaff} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Full Name</label>
                                    <input
                                        type="text"
                                        value={editingStaff.name}
                                        onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                                        placeholder="e.g. Dr. Jane Smith"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Institutional Email</label>
                                    <input
                                        type="email"
                                        value={editingStaff.email}
                                        onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                                        placeholder="e.g. jane@example.com"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Staff ID</label>
                                        <input
                                            type="text"
                                            value={editingStaff.staff_id}
                                            onChange={(e) => setEditingStaff({ ...editingStaff, staff_id: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary font-mono"
                                            placeholder="ST-1234"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Primary Role</label>
                                        <select
                                            value={editingStaff.role}
                                            onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                                        >
                                            <option value="Faculty">Faculty</option>
                                            <option value="Mentor">Mentor</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Department</label>
                                    <select
                                        value={editingStaff.dept_id}
                                        onChange={(e) => setEditingStaff({ ...editingStaff, dept_id: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-primary"
                                        required
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline flex-1">Cancel</button>
                                    <button type="submit" className="btn btn-primary flex-1">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default StaffManagement;
