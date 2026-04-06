const mongoose = require('mongoose');

const facultySubjectSchema = new mongoose.Schema({
    faculty_email: { type: String, required: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    dept_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true }
});

// Ensure no duplicate mappings exist in the whole system
facultySubjectSchema.index({ faculty_email: 1, subject_id: 1, batch_id: 1, dept_id: 1 }, { unique: true });

module.exports = mongoose.model('FacultySubject', facultySubjectSchema);
