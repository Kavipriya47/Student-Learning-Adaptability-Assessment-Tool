import React, { useState } from 'react';
import api from '../../api';
import {
    FileSpreadsheet, Upload, CheckCircle2, AlertCircle,
    Info, ArrowRight, Loader2, Database
} from 'lucide-react';
import './DataImport.css';

const DataImport = () => {
    const [activeType, setActiveType] = useState('performance');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null); // { type, message, errors }

    const importConfigs = {
        departments: {
            title: 'Departments',
            desc: 'Import department codes and names.',
            template: ['Name', 'Code'],
            endpoint: '/api/imports/departments',
            dependencies: 'None'
        },
        batches: {
            title: 'Batches',
            desc: 'Register batches linked to department codes.',
            template: ['Name', 'Dept Code'],
            endpoint: '/api/imports/batches',
            dependencies: 'Departments'
        },
        subjects: {
            title: 'Subjects',
            desc: 'Import subject codes with semester and dept mapping.',
            template: ['Name', 'Code', 'Dept Code', 'Semester'],
            endpoint: '/api/imports/subjects',
            dependencies: 'Departments'
        },
        staff: {
            title: 'Staff Records',
            desc: 'Register Faculty and Mentors with institutional emails.',
            template: ['Name', 'Email', 'Role', 'Staff ID', 'Dept Code'],
            endpoint: '/api/imports/staff',
            dependencies: 'Departments'
        },
        mapping: {
            title: 'Staff Mappings',
            desc: 'Assign faculty to specific subjects and batches.',
            template: ['Faculty Email', 'Subject Code', 'Batch Name', 'Dept Code'],
            endpoint: '/api/imports/staff-mapping',
            dependencies: 'Staff, Subjects, Batches, Departments'
        },
        students: {
            title: 'Student Enrollment',
            desc: 'Register students and map them to batches and mentors.',
            template: ['Roll No', 'Name', 'Email', 'Dept Code', 'Batch Name', 'Semester', 'Mentor Email'],
            endpoint: '/api/imports/students',
            dependencies: 'Departments, Batches, Mentors (Staff)'
        },
        performance: {
            title: 'Student Performance',
            desc: 'Consolidated import for Attendance, Rewards, and Marks.',
            template: ['Roll No', 'Semester (Optional)', 'Attendance %', 'Reward Points', 'Reward Category', 'Subject Code', 'PT1', 'PT2', 'Assignment', 'Grade'],
            endpoint: '/api/imports/student-attributes',
            dependencies: 'Students (Enrolled), Subjects'
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post(importConfigs[activeType].endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            // Backend returns { message, errors: [] }
            if (res.data.errors && res.data.errors.length > 0) {
                setResult({ 
                    type: 'warning', 
                    message: res.data.message, 
                    errors: res.data.errors 
                });
            } else {
                setResult({ type: 'success', message: res.data.message });
            }
            setFile(null);
        } catch (err) {
            const data = err.response?.data || {};
            setResult({ 
                type: 'error', 
                message: data.message || 'Upload failed',
                errors: data.error ? [data.error] : [] 
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-outfit text-white">Data Pipeline</h1>
                    <p className="text-text-muted">Bulk import institutional datasets with validation and mapping</p>
                </div>
                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-lg">
                    <Info size={14} className="text-yellow-500" />
                    <span className="text-[10px] uppercase font-bold text-yellow-500 tracking-wider">Duplicate Handling: Upsert (Update on Match)</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sidebar / Selector */}
                <div className="lg:col-span-4 space-y-4">
                    {Object.entries(importConfigs).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => { setActiveType(key); setResult(null); setFile(null); }}
                            className={`import-type-btn w-full text-left p-6 rounded-2xl border transition-all duration-200 ${activeType === key
                                ? 'active bg-primary/10 border-primary shadow-lg shadow-primary/10'
                                : 'bg-bg-surface/40 border-border-subtle hover:border-border-bright'
                                }`}
                        >
                            <div className="flex items-center gap-4 mb-2">
                                <div className={`p-2 rounded-lg ${activeType === key ? 'bg-primary text-white' : 'bg-bg-surface-light text-text-dim'}`}>
                                    <FileSpreadsheet size={20} />
                                </div>
                                <h3 className={`font-bold font-outfit ${activeType === key ? 'text-white' : 'text-text-muted'}`}>
                                    {config.title}
                                </h3>
                            </div>
                            <p className="text-xs text-text-dim leading-relaxed">{config.desc}</p>
                            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-text-muted italic">
                                <span>Pre-requisites:</span>
                                <span className={config.dependencies === 'None' ? 'text-success' : 'text-primary'}>{config.dependencies}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Upload Terminal */}
                <div className="lg:col-span-8">
                    <div className="glass-card min-h-[500px] flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Database className="text-primary" size={20} />
                                <h3 className="text-xl font-bold font-outfit">Import Console</h3>
                            </div>
                            <div className="import-status-ready">
                                <div className="import-status-dot"></div>
                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">System Ready</span>
                            </div>
                        </div>

                        <div className="import-dropzone flex-1 flex flex-col items-center justify-center">
                            {uploading ? (
                                <div className="text-center space-y-4">
                                    <Loader2 className="import-spinner text-primary mx-auto" size={48} />
                                    <p className="text-text-muted font-medium italic">Processing dataset and verifying mappings...</p>
                                </div>
                            ) : result ? (
                                <div className="text-center w-full px-6">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                                        result.type === 'success' ? 'import-result-success' : 
                                        result.type === 'warning' ? 'bg-yellow-500/10 text-yellow-500' : 
                                        'import-result-error'
                                    }`}>
                                        {result.type === 'success' ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">
                                        {result.type === 'success' ? 'Import Complete' : 
                                         result.type === 'warning' ? 'Partial Success' : 'Import Failed'}
                                    </h4>
                                    <p className="text-text-dim max-w-sm mx-auto mb-6 text-sm">{result.message}</p>
                                    
                                    {result.errors && result.errors.length > 0 && (
                                        <div className="max-w-xl mx-auto mb-8 bg-red-500/5 border border-red-500/10 rounded-xl overflow-hidden">
                                            <div className="bg-red-500/10 px-4 py-2 border-b border-red-500/10 flex items-center justify-between">
                                                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Row Exceptions Found</span>
                                                <span className="text-[10px] text-red-400 font-medium">Please review and re-upload corrected rows</span>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto p-4 space-y-2 text-left">
                                                {result.errors.map((err, idx) => (
                                                    <div key={idx} className="flex gap-3 text-xs">
                                                        <span className="text-red-500 font-mono flex-shrink-0">[{idx+1}]</span>
                                                        <span className="text-text-muted">{err}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button onClick={() => setResult(null)} className="btn btn-outline">
                                        {result.type === 'success' ? 'Upload Another' : 'Back to Console'}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center w-full max-w-md">
                                    <div className="import-upload-icon mb-6 inline-flex p-5 bg-primary/5 text-primary rounded-full border border-primary/10">
                                        <Upload size={32} />
                                    </div>
                                    <h4 className="text-lg font-bold text-text-muted mb-2">Select Dataset (Excel / CSV)</h4>
                                    <p className="text-sm text-text-dim mb-8">Ensure your file matches the column template exactly. Missing dependencies will trigger errors.</p>

                                    <label className="btn btn-primary cursor-pointer w-full justify-center">
                                        <Upload size={18} />
                                        Search Files
                                        <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
                                    </label>

                                    {file && (
                                        <div className="import-file-indicator mt-6 p-4 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <FileSpreadsheet className="text-success shrink-0" size={18} />
                                                <span className="text-sm text-white truncate font-medium">{file.name}</span>
                                            </div>
                                            <button onClick={handleUpload} className="text-primary hover:text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                                                Execute Pipeline
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Template Information */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-6 bg-bg-surface-light/20 rounded-xl border border-border-subtle">
                                <div className="flex items-center gap-2 mb-4 text-text-muted">
                                    <Info size={16} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Column Mapping</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {importConfigs[activeType].template.map((col, i) => (
                                        <span key={i} className="import-col-tag">
                                            {col}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
                                <div className="flex items-center gap-2 mb-3 text-primary">
                                    <Info size={16} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Dependency Check</span>
                                </div>
                                <p className="text-xs text-text-muted leading-relaxed">
                                    {activeType === 'performance' ? 
                                        'Students MUST be enrolled and Subjects MUST exist before importing performance data.' : 
                                        `This module requires: ${importConfigs[activeType].dependencies}`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataImport;
