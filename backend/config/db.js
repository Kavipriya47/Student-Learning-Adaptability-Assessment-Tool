const mongoose = require('mongoose');
const User = require('../models/User');

const initDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/slaa');
        console.log('MongoDB Connected successfully');

        // Seed Mock Users for Development / Testing
        if (process.env.NODE_ENV === 'development' || process.env.SEED_DATA === 'true') {
            const mockUsers = [
                { name: 'System Admin', email: 'kavipriyaponnusamy47@gmail.com', role: 'Admin' },
                { name: 'Faculty Lead', email: 'meena@bitsathy.ac.in', role: 'Faculty' },
                { name: 'Mentor Hub', email: 'hariharan.cb23@bitsathy.ac.in', role: 'Mentor' },
                { name: 'Student Portal', email: 'student@bitsathy.ac.in', role: 'Student' },
            ];

            for (const u of mockUsers) {
                const checkUser = await User.findOne({ email: u.email });
                if (!checkUser) {
                    // Set default password = email for mock users
                    await User.create({
                        ...u,
                        password: u.email,
                        mustChangePassword: true
                    });
                    console.log(`Seeded mock user: ${u.email} (${u.role})`);
                }
            }
        }
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const closeDb = async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
};

module.exports = { initDb, closeDb };
