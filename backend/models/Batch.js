const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true }, // e.g., 2023-2027
    dept_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    current_semester: { type: Number, min: 1, max: 8, default: 1 },
    is_active: { type: Boolean, default: true }
});

// Ensure unique combination of batch name and department
batchSchema.index({ name: 1, dept_id: 1 }, { unique: true });

module.exports = mongoose.model('Batch', batchSchema);
