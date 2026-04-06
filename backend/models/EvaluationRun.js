const mongoose = require('mongoose');

const EvaluationRunSchema = new mongoose.Schema({
    batch_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true
    },
    cycle_name: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    total_cohort: {
        type: Number,
        default: 0
    },
    processed_count: {
        type: Number,
        default: 0
    },
    skipped_count: {
        type: Number,
        default: 0
    },
    skipped_details: [{
        roll: String,
        name: String,
        reason: String
    }],
    coverage_percent: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('EvaluationRun', EvaluationRunSchema);
