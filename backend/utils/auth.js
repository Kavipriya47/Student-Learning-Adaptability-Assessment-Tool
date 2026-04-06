const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'slaa_access_secret_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'slaa_refresh_secret_2026';

const ACCESS_EXPIRE = '15m'; // Short-lived
const REFRESH_EXPIRE = '7d';  // Long-lived

exports.generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id || user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: ACCESS_EXPIRE }
    );
};

exports.generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user._id || user.id },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRE }
    );
};

exports.generateResetToken = (user) => {
    return jwt.sign(
        { id: user._id || user.id, purpose: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '10m' } // Very short-lived
    );
};

exports.verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

exports.verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, REFRESH_SECRET);
    } catch (error) {
        return null;
    }
};
