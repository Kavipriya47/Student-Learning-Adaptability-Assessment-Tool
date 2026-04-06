const mongoose = require('mongoose');

const adaptabilityHistorySchema = new mongoose.Schema({
    student_roll: { type: String, ref: 'Student', required: true },
    cycle_name: { type: String, required: true }, // e.g., Term 1, Mid-Sem, Final
    semester: { type: Number, required: true },
    academic_score: { type: Number },
    attendance_score: { type: Number },
    assignment_score: { type: Number },
    skill_score: { type: Number },
    recovery_score: { type: Number },
    final_adaptability: { type: Number, required: true },
    evaluation_date: { type: Date, default: Date.now }
});

adaptabilityHistorySchema.index({ student_roll: 1, semester: 1 });
adaptabilityHistorySchema.index({ evaluation_date: -1 });

module.exports = mongoose.model('AdaptabilityHistory', adaptabilityHistorySchema);
