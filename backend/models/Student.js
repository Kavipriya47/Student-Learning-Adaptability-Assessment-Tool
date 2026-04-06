const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    roll_no: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    dept_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 8 },
    mentor_email: { type: String, trim: true, lowercase: true },
    intervention_status: {
        type: String,
        enum: ['No Action Needed', 'Monitoring', 'Meeting Scheduled', 'Under Mentorship Plan'],
        default: 'No Action Needed'
    },
    profile_pic: { type: String, default: null },
    profile_pic_id: { type: String, default: null }
});


studentSchema.index({ batch_id: 1, semester: 1 });

module.exports = mongoose.model('Student', studentSchema);
