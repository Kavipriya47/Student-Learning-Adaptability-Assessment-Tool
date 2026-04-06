const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
    student_roll: { type: String, ref: 'Student', required: true },
    points: { type: Number, required: true },
    category: { type: String },
    updated_at: { type: Date, default: Date.now }
});

rewardSchema.index({ student_roll: 1 });

module.exports = mongoose.model('Reward', rewardSchema);
