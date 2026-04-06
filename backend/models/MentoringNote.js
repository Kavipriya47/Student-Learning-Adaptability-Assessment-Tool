const mongoose = require('mongoose');

const mentoringNoteSchema = new mongoose.Schema({
    student_roll: { type: String, ref: 'Student', required: true },
    mentor_email: { type: String, required: true },
    note: { type: String, required: true },
    type: { type: String }, // counselling, follow-up
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MentoringNote', mentoringNoteSchema);
