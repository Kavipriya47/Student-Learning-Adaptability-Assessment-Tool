const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    role: { type: String, required: true, enum: ['Admin', 'Faculty', 'Mentor', 'Student'] },
    staff_id: { type: String, trim: true },
    dept_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
    password: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: false },
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },
    otp: { type: String },
    otpExpires: { type: Date },
    profile_pic: { type: String, default: null },
    profile_pic_id: { type: String, default: null },
    created_at: { type: Date, default: Date.now }
});

// Pre-save hook: never store plain text passwords
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});


// Helper method to verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

