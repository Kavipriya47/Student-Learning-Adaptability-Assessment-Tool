require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const Department = require('./models/Department');
const Batch = require('./models/Batch');
const Attendance = require('./models/Attendance');
const Reward = require('./models/Reward');
const Marks = require('./models/Marks');
const Subject = require('./models/Subject');
const User = require('./models/User');

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/slaa';
const MENTOR_EMAIL = 'hariharan.cb23@bitsathy.ac.in';

async function seed() {
    try {
        console.log('Connecting to:', DB_URI.split('@')[1] || 'localhost');
        await mongoose.connect(DB_URI);
        // 1. Correct Typo in ECE Department Name
        const eceDept = await Department.findOne({ code: 'ECE' });
        if (eceDept && eceDept.name.includes('Enginnering')) {
            eceDept.name = 'Electrical and Communication Engineering';
            await eceDept.save();
            console.log('Fixed typo in ECE department name.');
        }

        const allDepts = await Department.find();
        const allBatches = await Batch.find();

        console.log(`Found ${allDepts.length} departments and ${allBatches.length} batches.`);

        // 2. Define Names for diversity
        const firstNames = ['Arun', 'Bala', 'Chitra', 'Deepak', 'Esha', 'Farhan', 'Gayathri', 'Hari', 'Indu', 'Jaya'];
        const lastNames = ['Kumar', 'Priya', 'Selvan', 'Devi', 'Raj', 'Banu', 'Nair', 'Santhosh', 'Rani', 'Mani'];

        for (const dept of allDepts) {
            const deptBatches = allBatches.filter(b => b.dept_id.toString() === dept._id.toString());
            console.log(`Seeding ${dept.name} (${dept.code}) - ${deptBatches.length} batches`);

            for (const batch of deptBatches) {
                // Seed 2 students per batch/dept
                for (let i = 1; i <= 2; i++) {
                    const rollNo = `${batch.name.split('-')[0].slice(-2)}${dept.code}${i.toString().padStart(2, '0')}`;
                    const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
                    const email = `${rollNo.toLowerCase()}@bitsathy.ac.in`;

                    let student = await Student.findOne({ roll_no: rollNo });
                    if (!student) {
                        student = new Student({
                            roll_no: rollNo,
                            name: name,
                            email: email,
                            dept_id: dept._id,
                            batch_id: batch._id,
                            semester: 1,
                            mentor_email: MENTOR_EMAIL
                        });
                        await student.save();
                    }

                    // Seed Attendance for sem 1
                    const existingAtt = await Attendance.findOne({ student_roll: rollNo, semester: 1 });
                    if (!existingAtt) {
                        await new Attendance({
                            student_roll: rollNo,
                            semester: 1,
                            percentage: 75 + Math.floor(Math.random() * 20),
                            updated_at: new Date()
                        }).save();
                    }
                }
            }
        }

        console.log('Global seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
