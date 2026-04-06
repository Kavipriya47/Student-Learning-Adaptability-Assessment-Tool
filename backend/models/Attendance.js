const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    student_roll: { type: String, ref: 'Student', required: true },
    percentage: { type: Number, required: true },
    semester: { type: Number, required: true },
    updated_by: { type: String, default: 'System' },
    updated_at: { type: Date, default: Date.now }
});

attendanceSchema.index({ student_roll: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
