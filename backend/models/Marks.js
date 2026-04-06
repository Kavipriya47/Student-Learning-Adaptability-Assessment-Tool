const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema({
    student_roll: { type: String, ref: 'Student', required: true },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    pt1: { type: Number, default: null },
    pt2: { type: Number, default: null },
    assignment: { type: Number, default: null },
    semester_grade: { type: String, default: null },
    updated_by: { type: String }, // Email of faculty
    updated_at: { type: Date, default: Date.now }
});

marksSchema.index({ student_roll: 1, subject_id: 1 }, { unique: true });
marksSchema.index({ student_roll: 1 });

module.exports = mongoose.model('Marks', marksSchema);
