import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';
import {
    ArrowLeft, Users, Plus, Search,
    BookOpen, Trash2, Mail, Hash, User, Edit2
} from 'lucide-react';
import './BatchDetail.css';
import StudentAnalyticsModal from './StudentAnalyticsModal';
import toast from 'react-hot-toast';

const BatchDetail = () => {
    const { batchId } = useParams();
    const [batch, setBatch] = useState(null);
    const [students, setStudents] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [editingStudent, setEditingStudent] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    const [newStudent, setNewStudent] = useState({
        roll_no: '',
        name: '',
        email: '',
        semester: 1,
        mentor_email: ''
    });

    const [selectedStudentRoll, setSelectedStudentRoll] = useState(null);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

    const years = [1, 2, 3, 4];

    const fetchData = useCallback(async () => {
        try {
            const batchRes = await api.get('/api/admin/batches');
            const currentBatch = batchRes.data.find(b => b.id === batchId);
            setBatch(currentBatch);

            const studentRes = await api.get(`/api/admin/students?batch_id=${batchId}`);
            setStudents(studentRes.data);

            const staffRes = await api.get('/api/admin/staff?limit=1000');
            const staffList = staffRes.data.staff || staffRes.data;
            setMentors(staffList.filter(s => s.role === 'Mentor'));
        } catch (err) {
            console.error('Failed to fetch batch details');
        } finally {
            setLoading(false);
        }
    }, [batchId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddStudent = async (e) => {
        e.preventDefault();
        if (newStudent.email && !newStudent.email.includes('@')) {
            toast.error('Please enter a valid email address.');
            return;
        }
        try {
            await api.post('/api/admin/students', {
                ...newStudent,
                batch_id: batchId,
                dept_id: batch.dept_id
            });
            setShowAddModal(false);
            setNewStudent({
                roll_no: '',
                name: '',
                email: '',
                semester: selectedYear ? (selectedYear * 2) - 1 : 1,
                mentor_email: ''
            });
            fetchData();
            toast.success('Student added successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error adding student');
        }
    };

    const handleUpdateStudent = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/api/admin/students/${editingStudent._id}`, editingStudent);
            setShowEditModal(false);
            setEditingStudent(null);
            fetchData();
            toast.success('Student updated successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error updating student');
        }
    };

    const handleDeleteStudent = async (id) => {
        if (!window.confirm('Are you sure you want to remove this student?')) return;
        try {
            await api.delete(`/api/admin/students/${id}`);
            fetchData();
            toast.success('Student removed successfully');
        } catch (err) {
            toast.error('Error deleting student: ' + (err.response?.data?.message || err.message));
        }
    };

    const openAddStudentModal = () => {
        setNewStudent({
            ...newStudent,
            semester: selectedYear ? (selectedYear * 2) - 1 : 1
        });
        setShowAddModal(true);
    };

    const openEditStudentModal = (student) => {
        setEditingStudent({ ...student });
        setShowEditModal(true);
    };

    const filteredStudents = useMemo(() => {
        if (!selectedYear) return [];
        let list = students.filter(s => Math.ceil(s.semester / 2) === selectedYear);
        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            list = list.filter(s =>
                s.name.toLowerCase().includes(query) ||
                s.roll_no.toLowerCase().includes(query)
            );
        }
        return list;
    }, [students, selectedYear, debouncedSearch]);

    if (loading) return <div className="flex items-center justify-center min-h-[400px]">Loading...</div>;
    if (!batch) return <div className="text-center py-20">Batch not found</div>;

    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex items-center justify-between">
                <div>
                    <Link to="/admin/batches" className="text-primary hover:text-accent text-sm font-medium flex items-center gap-2 mb-2 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Batches
                    </Link>
                    <h1 className="text-4xl font-extrabold font-outfit text-white">
                        {batch.name} <span className="text-accent">({batch.dept_code})</span> Details
                    </h1>
                    <p className="text-text-muted">Manage yearly rosters and student enrollment</p>
                </div>
                <div className="flex gap-4">
                    <div className="glass-card px-4 py-2 flex items-center gap-2">
                        <Users size={18} className="text-accent" />
                        <span className="text-white font-bold">{students.length}</span>
                        <span className="text-text-dim text-xs">Students</span>
                    </div>
                </div>
            </div>

            {/* Year Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {years.map((year) => {
                    const count = students.filter(s => Math.ceil(s.semester / 2) === year).length;
                    return (
                        <div
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`glass-card p-6 cursor-pointer transition-all border-l-4 ${selectedYear === year
                                ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                                : 'border-white/5 hover:border-white/20'
                                }`}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-text-dim text-xs font-bold uppercase tracking-widest">Academic Year</p>
                                    <h3 className="text-3xl font-black font-outfit text-white">{getOrdinal(year)}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-accent font-bold text-xl">{count}</p>
                                    <p className="text-[10px] text-text-dim uppercase">Students</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Student Roster Section */}
            {selectedYear && (
                <div className="glass-card p-0 overflow-hidden animate-slide-up border-accent/20">
                    <div className="p-6 border-b border-white/5 flex flex-wrap items-center justify-between bg-white/5 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-accent/10 rounded-xl text-accent">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold font-outfit text-white">{getOrdinal(selectedYear)} Year Roster</h3>
                                <p className="text-text-dim text-sm">{filteredStudents.length} Students Enrolled in Semesters {(selectedYear * 2) - 1} & {selectedYear * 2}</p>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center gap-4 min-w-[300px]">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search student name or roll..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-bg-surface-light border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-accent"
                                />
                            </div>
                            <button
                                onClick={openAddStudentModal}
                                className="btn btn-primary btn-sm whitespace-nowrap"
                            >
                                <Plus size={16} />
                                Add Student
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] font-bold text-text-dim uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Roll No</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Semester</th>
                                    <th className="px-6 py-4">Mentor</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStudents.map((student) => (
                                    <tr key={student._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-mono text-sm">
                                            <button
                                                onClick={() => {
                                                    setSelectedStudentRoll(student.roll_no);
                                                    setShowAnalyticsModal(true);
                                                }}
                                                className="text-accent hover:text-white transition-colors font-bold"
                                            >
                                                {student.roll_no}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-white">{student.name}</td>
                                        <td className="px-6 py-4 text-text-dim text-sm">{student.email}</td>
                                        <td className="px-6 py-4">
                                            <span className="bg-accent/10 text-accent px-2 py-1 rounded text-xs font-bold">Sem {student.semester}</span>
                                        </td>
                                        <td className="px-6 py-4 text-text-dim text-xs">{student.mentor_email || 'Not Assigned'}</td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditStudentModal(student)}
                                                className="p-2 text-text-dim hover:text-accent opacity-0 group-hover:opacity-100 transition-all"
                                                title="Edit Student"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStudent(student._id)}
                                                className="p-2 text-text-dim hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove Student"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-text-dim">
                                            No students found in this academic year.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Student Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card max-w-lg w-full animate-scale-in border-accent/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-accent/10 rounded-xl text-accent">
                                <Plus size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-outfit">Add New Student</h3>
                                <p className="text-text-muted text-sm">Registering for {getOrdinal(selectedYear)} Year</p>
                            </div>
                        </div>

                        <form onSubmit={handleAddStudent} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Roll Number</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                                        <input
                                            type="text"
                                            value={newStudent.roll_no}
                                            onChange={(e) => setNewStudent({ ...newStudent, roll_no: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                            placeholder="e.g. 21CS001"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                                        <input
                                            type="text"
                                            value={newStudent.name}
                                            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                            placeholder="Student Name"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Semester</label>
                                    <select
                                        value={newStudent.semester}
                                        onChange={(e) => setNewStudent({ ...newStudent, semester: parseInt(e.target.value) })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                        required
                                    >
                                        <option value={(selectedYear * 2) - 1}>Semester {(selectedYear * 2) - 1}</option>
                                        <option value={selectedYear * 2}>Semester {selectedYear * 2}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Mentor (Optional)</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                                        <select
                                            value={newStudent.mentor_email}
                                            onChange={(e) => setNewStudent({ ...newStudent, mentor_email: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-text-main focus:outline-none focus:border-accent appearance-none"
                                        >
                                            <option value="">No Mentor Assigned</option>
                                            {mentors.map(m => (
                                                <option key={m.email} value={m.email}>{m.name} ({m.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                                    <input
                                        type="email"
                                        value={newStudent.email}
                                        onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                        placeholder="student@example.com"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary bg-accent hover:shadow-accent/40 flex-1">Add Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {showEditModal && editingStudent && (
                <div className="fixed inset-0 bg-bg-deep/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card max-w-lg w-full animate-scale-in border-accent/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-accent/10 rounded-xl text-accent">
                                <Edit2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold font-outfit">Edit Student Profile</h3>
                                <p className="text-text-muted text-sm">Updating details for {editingStudent.roll_no}</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateStudent} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Roll Number</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                                        <input
                                            type="text"
                                            value={editingStudent.roll_no}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, roll_no: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                                        <input
                                            type="text"
                                            value={editingStudent.name}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Semester</label>
                                    <select
                                        value={editingStudent.semester}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, semester: parseInt(e.target.value) })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                        required
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                            <option key={sem} value={sem}>Semester {sem}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Mentor</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                                        <select
                                            value={editingStudent.mentor_email || ''}
                                            onChange={(e) => setEditingStudent({ ...editingStudent, mentor_email: e.target.value })}
                                            className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-text-main focus:outline-none focus:border-accent appearance-none"
                                        >
                                            <option value="">No Mentor Assigned</option>
                                            {mentors.map(m => (
                                                <option key={m.email} value={m.email}>{m.name} ({m.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted mb-1.5 uppercase tracking-widest text-left">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                                    <input
                                        type="email"
                                        value={editingStudent.email}
                                        onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                                        className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-text-main focus:outline-none focus:border-accent"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline flex-1">Cancel</button>
                                <button type="submit" className="btn btn-primary bg-accent hover:shadow-accent/40 flex-1">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Student Analytical Drill-Down */}
            {showAnalyticsModal && (
                <StudentAnalyticsModal
                    roll={selectedStudentRoll}
                    onDataChange={fetchData}
                    onClose={() => {
                        setShowAnalyticsModal(false);
                        setSelectedStudentRoll(null);
                    }}
                />
            )}
        </div>
    );
};

export default BatchDetail;

