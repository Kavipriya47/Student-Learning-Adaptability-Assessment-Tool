const { verifyToken } = require('../utils/auth');
const User = require('../models/User');
const Student = require('../models/Student');

const authenticateJWT = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (decoded) {
            try {
                let user;
                if (decoded.role === 'Student') {
                    user = await Student.findOne({ email: decoded.email });
                    if (user) {
                        user = user.toObject();
                        user.role = 'Student';
                    }
                } else {
                    user = await User.findOne({ email: decoded.email });
                }

                if (user) {
                    req.user = user;
                    return next();
                }
            } catch (error) {
                console.error('JWT Auth Middleware Error:', error);
            }
        }
    }

    res.status(401).json({ message: 'Unauthorized: Invalid or missing token' });
};

const isAdmin = (req, res, next) => {
    authenticateJWT(req, res, () => {
        if (req.user.role === 'Admin') {
            return next();
        }
        res.status(403).json({ message: 'Access denied: Requires Admin role' });
    });
};

const isMentorOrAdmin = (req, res, next) => {
    authenticateJWT(req, res, () => {
        if (req.user.role === 'Mentor' || req.user.role === 'Admin') {
            return next();
        }
        res.status(403).json({ message: 'Access denied: Requires Mentor or Admin role' });
    });
};

const isFacultyOrAdmin = (req, res, next) => {
    authenticateJWT(req, res, () => {
        if (req.user.role === 'Faculty' || req.user.role === 'Mentor' || req.user.role === 'Admin') {
            return next();
        }
        res.status(403).json({ message: 'Access denied' });
    });
};

module.exports = { authenticateJWT, isAdmin, isMentorOrAdmin, isFacultyOrAdmin };
