require('dotenv').config();
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const passport = require('./config/auth');
const { initDb } = require('./config/db');
const User = require('./models/User');
const Student = require('./models/Student');
const RefreshToken = require('./models/RefreshToken');
const {
    generateAccessToken,
    generateRefreshToken,
    generateResetToken, // Added
    verifyRefreshToken
} = require('./utils/auth');
const { generateOTP, hashOTP, verifyOTP } = require('./utils/otp'); // Added

const app = express();
app.set('trust proxy', 1); // Required for Render (reverse proxy) — fixes express-rate-limit
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists for temporary file processing
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize Database
if (process.env.NODE_ENV !== 'test') {
    initDb();
}

// --- Rate Limiters ---
const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { message: 'Too many login attempts. Please try again in 1 minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3,
    message: { message: 'Too many password reset requests. Please wait 15 minutes.' },
});

const { sendEmail } = require('./utils/email'); // Use shared email util

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Normalization middleware for Content-Type to fix "unsupported charset UTF-8" issue
app.use((req, res, next) => {
    if (req.headers['content-type']) {
        const ct = req.headers['content-type'];
        if (!ct.startsWith('multipart/form-data')) {
            req.headers['content-type'] = ct.split(';')[0].trim();
        }
    }
    next();
});

app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));
app.get('/health', (req, res) => res.json({ status: 'ok', port: PORT }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
app.use(passport.initialize());

// --- Authentication Routes ---

// Google Auth
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
    (req, res, next) => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        passport.authenticate('google', {
            failureRedirect: `${frontendUrl}/login?error=unauthorized`,
            session: false
        })(req, res, next);
    },
    async (req, res) => {
        try {
            const accessToken = generateAccessToken(req.user);
            const refreshToken = generateRefreshToken(req.user);

            // Store refresh token in DB
            await RefreshToken.findOneAndUpdate(
                { userId: req.user._id },
                {
                    token: refreshToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
                },
                { upsert: true }
            );

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/login?token=${accessToken}&refreshToken=${refreshToken}`);
        } catch (error) {
            console.error('Callback error:', error);
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
        }
    }
);

// ✅ Production Login (replaces mock-login)
app.post('/auth/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    try {
        // Check Staff/Admin/Faculty/Mentor users
        let userData = await User.findOne({ email: email.toLowerCase() });
        let isStaff = !!userData;

        // Fallback: check Students
        if (!userData) {
            const student = await Student.findOne({ email: email.toLowerCase() });
            if (student) {
                // Students do not have a local password; they must use Google SSO.
                return res.status(403).json({ message: 'Students must log in using Google Single Sign-On.' });
            }
            return res.status(401).json({ message: 'This email is not registered in the system. Please contact the administrator.' });
        }

        // Verify password with bcrypt
        const isMatch = await userData.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials. Please check your email and password.' });
        }

        const accessToken = generateAccessToken(userData);
        const refreshToken = generateRefreshToken(userData);

        await RefreshToken.findOneAndUpdate(
            { userId: userData._id },
            { token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
            { upsert: true }
        );

        res.json({
            message: 'Logged in successfully',
            user: {
                id: userData._id,
                name: userData.name,
                email: userData.email,
                role: userData.role,
                profile_pic: userData.profile_pic,
                mustChangePassword: userData.mustChangePassword
            },
            token: accessToken,
            refreshToken
        });
    } catch (error) {
        console.error('[Login Error]', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// ✅ Forgot Password (OTP Generation)
app.post('/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email: email?.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist. Please contact the administrator.' });
        }

        const otpCode = generateOTP();
        user.otp = await hashOTP(otpCode);
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await user.save({ validateBeforeSave: false });

        await sendEmail({
            to: user.email,
            subject: 'SLAA — Password Reset Code',
            html: `
                <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#0f1117;color:#fff;border-radius:20px;border:1px solid #ffffff10">
                    <div style="text-align:center;margin-bottom:30px">
                        <div style="display:inline-block;padding:12px;background:#818cf815;border-radius:12px">
                            <span style="font-size:24px;font-weight:900;color:#818cf8;letter-spacing:-1px">SLAA</span>
                        </div>
                    </div>
                    <h2 style="color:#fff;font-size:20px;font-weight:800;margin-bottom:10px">Verification Code</h2>
                    <p style="color:#94a3b8;font-size:14px;line-height:1.6">Hi ${user.name}, use the code below to reset your platform credentials.</p>
                    
                    <div style="background:#1a1d26;border:1px dashed #818cf840;border-radius:12px;padding:24px;text-align:center;margin:30px 0">
                        <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#818cf8">${otpCode}</span>
                    </div>

                    <p style="color:#94a3b8;font-size:12px;text-align:center">This code is valid for <strong>10 minutes</strong>.<br>If you did not request this, please ignore this email.</p>
                </div>
            `
        });

        res.json({ message: 'A 6-digit verification code has been sent to your email.' });
    } catch (error) {
        console.error('[Forgot Password Error]', error);
        res.status(500).json({ message: 'Failed to send reset code. Please try again later.' });
    }
});

// ✅ Verify OTP (Returns temporary resetToken)
app.post('/auth/verify-otp', forgotPasswordLimiter, async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email: email?.toLowerCase() });
        if (!user || !user.otp || !user.otpExpires || user.otpExpires < new Date()) {
            return res.status(400).json({ message: 'Code has expired or is invalid.' });
        }

        const isValid = await verifyOTP(otp, user.otp);
        if (!isValid) return res.status(400).json({ message: 'Incorrect verification code.' });

        // Generate short-lived reset token
        const resetToken = generateResetToken(user);
        
        // Clear OTP to prevent re-use
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        res.json({ resetToken, message: 'Code verified. You can now reset your password.' });
    } catch (error) {
        console.error('[Verify OTP Error]', error);
        res.status(500).json({ message: 'Verification failed.' });
    }
});

// ✅ Reset Password (via resetToken)
app.post('/auth/reset-password', async (req, res) => {
    const { resetToken, password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }
    if (!resetToken) return res.status(400).json({ message: 'Reset token is required.' });

    try {
        const decoded = require('./utils/auth').verifyToken(resetToken);
        if (!decoded || decoded.purpose !== 'password_reset') {
            return res.status(400).json({ message: 'Reset session expired or invalid.' });
        }

        const user = await User.findById(decoded.id);
        if (!user) return res.status(400).json({ message: 'User not found.' });

        user.password = password; // hashed in pre-save hook
        user.mustChangePassword = false;
        await user.save();

        res.json({ message: 'Password updated successfully. You can now log in.' });
    } catch (error) {
        console.error('[Reset Password Error]', error);
        res.status(500).json({ message: 'Failed to reset password.' });
    }
});

// ✅ Change Password (JWT Protected — logged-in users)
const { authenticateJWT: authJWT } = require('./middleware/auth');
app.post('/auth/change-password', authJWT, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect.' });

        user.password = newPassword;
        user.mustChangePassword = false;
        await user.save();

        res.json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error('[Change Password Error]', error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// Refresh Token Endpoint
app.post('/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    try {
        const decoded = verifyRefreshToken(refreshToken);
        if (!decoded) return res.status(403).json({ message: 'Invalid refresh token' });

        const storedToken = await RefreshToken.findOne({ userId: decoded.id, token: refreshToken });
        if (!storedToken) return res.status(403).json({ message: 'Refresh token not recognized' });

        // Find user to get current profile data
        let user = await User.findById(decoded.id);
        if (!user) {
            user = await Student.findById(decoded.id);
            if (user) {
                user = user.toObject();
                user.role = 'Student';
            }
        }

        if (!user) return res.status(404).json({ message: 'User not found' });

        const newAccessToken = generateAccessToken(user);
        res.json({ accessToken: newAccessToken });
    } catch (error) {
        res.status(500).json({ message: 'Refresh failed' });
    }
});

// Get User Session (JWT Protected)
const { authenticateJWT } = require('./middleware/auth');
app.get('/auth/user', authenticateJWT, (req, res) => {
    res.json(req.user);
});

// Logout
app.get('/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) return res.status(500).json({ message: 'Logout error' });
        res.json({ message: 'Logged out' });
    });
});

// --- API Routes ---
app.use('/api/admin', require('./routes/admin'));
app.use('/api/faculty', require('./routes/faculty'));
app.use('/api/mentor', require('./routes/mentor'));
app.use('/api/student', require('./routes/student'));
app.use('/api/imports', require('./routes/imports'));
app.use('/api/upload', require('./routes/upload'));

// --- Centralized Error Handling ---
app.use((err, req, res, next) => {
    console.error(`[Error] ${req.method} ${req.url}:`, err.message);

    const statusCode = err.status || 500;
    const response = {
        message: err.message || 'Internal Server Error',
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
