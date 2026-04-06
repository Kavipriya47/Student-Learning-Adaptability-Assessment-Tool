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
    const [result, setResult] = useState(null);

    const importConfigs = {
        departments: {
            title: 'Departments',
            desc: 'Import department codes and names.',
            template: ['Name', 'Code'],
            endpoint: '/api/imports/departments'
        },
        batches: {
            title: 'Batches',
            desc: 'Register batches linked to department codes.',
            template: ['Name', 'Dept Code'],
            endpoint: '/api/imports/batches'
        },
        subjects: {
            title: 'Subjects',
            desc: 'Import subject codes with semester and dept mapping.',
            template: ['Name', 'Code', 'Dept Code', 'Semester'],
            endpoint: '/api/imports/subjects'
        },
        staff: {
            title: 'Staff Records',
            desc: 'Register Faculty and Mentors with institutional emails.',
            template: ['Name', 'Email', 'Role', 'Staff ID', 'Dept Code'],
            endpoint: '/api/imports/staff'
        },
        mapping: {
            title: 'Staff Mappings',
            desc: 'Assign faculty to specific subjects and batches.',
            template: ['Faculty Email', 'Subject Code', 'Batch Name', 'Dept Code'],
            endpoint: '/api/imports/staff-mapping'
        },
        students: {
            title: 'Student Enrollment',
            desc: 'Register students and map them to batches and mentors.',
            template: ['Roll No', 'Name', 'Email', 'Dept Code', 'Batch Name', 'Semester', 'Mentor Email'],
            endpoint: '/api/imports/students'
        },
        performance: {
            title: 'Student Performance',
            desc: 'Consolidated import for Attendance, Rewards, and Marks.',
            template: ['Roll No', 'Semester (Optional)', 'Attendance %', 'Reward Points', 'Reward Category', 'Subject Code', 'PT1', 'PT2', 'Assignment', 'Grade'],
            endpoint: '/api/imports/student-attributes'
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post(importConfigs[activeType].endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setResult({ type: 'success', message: res.data.message });
            setFile(null);
        } catch (err) {
            const data = err.response?.data || {};
            setResult({ type: 'error', message: (data.message || 'Upload failed') + (data.error ? ` - ${data.error}` : '') });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold font-outfit text-white">Data Pipeline</h1>
                <p className="text-text-muted">Bulk import institutional datasets with validation and mapping</p>
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
                                <div className="text-center import-result">
                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${result.type === 'success' ? 'import-result-success' : 'import-result-error'
                                        }`}>
                                        {result.type === 'success' ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">{result.type === 'success' ? 'Import Successful' : 'Import Failed'}</h4>
                                    <p className="text-text-muted max-w-sm mb-8">{result.message}</p>
                                    <button onClick={() => setResult(null)} className="btn btn-outline">Upload Another File</button>
                                </div>
                            ) : (
                                <div className="text-center w-full max-w-md">
                                    <div className="import-upload-icon mb-6 inline-flex p-5 bg-primary/5 text-primary rounded-full border border-primary/10">
                                        <Upload size={32} />
                                    </div>
                                    <h4 className="text-lg font-bold text-text-muted mb-2">Select Dataset (Excel / CSV)</h4>
                                    <p className="text-sm text-text-dim mb-8">Ensure your file matches the column template exactly for seamless mapping. Supports .xlsx, .xls and .csv</p>

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
                                                Push to DB
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Template Information */}
                        <div className="mt-8 p-6 bg-bg-surface-light/20 rounded-xl border border-border-subtle">
                            <div className="flex items-center gap-2 mb-4 text-text-muted">
                                <Info size={16} />
                                <span className="text-xs font-bold uppercase tracking-widest">Required Column Mapping</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {importConfigs[activeType].template.map((col, i) => (
                                    <span key={i} className="import-col-tag">
                                        {col}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataImport;
