const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Student = require('../models/Student');
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        const email = profile.emails[0].value;

        try {
            // 1. Check if user is an Admin, Faculty, or Mentor in the 'users' table
            let user = await User.findOne({ email });

            if (user) {
                return done(null, { ...user.toObject(), type: 'staff' });
            }

            // 2. Check if user is a Student in the 'students' table
            const student = await Student.findOne({ email });
            if (student) {
                return done(null, { ...student.toObject(), role: 'Student', type: 'student' });
            }

            // 3. User not found in either table
            return done(null, false, { message: 'User not registered in SLAA system' });

        } catch (error) {
            return done(error);
        }
    }));
} else {
    console.warn('[AUTH] Google OAuth credentials missing. SSO flow will be disabled.');
}
module.exports = passport;
