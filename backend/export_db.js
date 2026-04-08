require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import all models
const User = require('./models/User');
const Student = require('./models/Student');
const Department = require('./models/Department');
const Batch = require('./models/Batch');
const Subject = require('./models/Subject');
const FacultySubject = require('./models/FacultySubject');
const Attendance = require('./models/Attendance');
const Marks = require('./models/Marks');
const Reward = require('./models/Reward');

const outputDir = path.join(__dirname, '..', 'db_exports');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

function toCsv(docs, fields) {
    if (!docs.length) return fields.join(',') + '\n(empty)';
    const header = fields.join(',');
    const rows = docs.map(doc => {
        return fields.map(f => {
            let val = doc[f];
            if (val === null || val === undefined) return '';
            if (typeof val === 'object' && val._id) val = val._id; // ObjectId ref
            val = String(val).replace(/,/g, ';').replace(/\n/g, ' ');
            return val;
        }).join(',');
    });
    return [header, ...rows].join('\n');
}

async function exportAll() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Departments
    const depts = await Department.find().lean();
    fs.writeFileSync(path.join(outputDir, 'departments.csv'),
        toCsv(depts, ['_id', 'name', 'code']));
    console.log(`Departments: ${depts.length} records`);

    // 2. Batches
    const batches = await Batch.find().lean();
    fs.writeFileSync(path.join(outputDir, 'batches.csv'),
        toCsv(batches, ['_id', 'name', 'dept_id']));
    console.log(`Batches: ${batches.length} records`);

    // 3. Users (Staff)
    const users = await User.find().select('-password -otp -otpExpires').lean();
    fs.writeFileSync(path.join(outputDir, 'users_staff.csv'),
        toCsv(users, ['_id', 'name', 'email', 'role', 'staff_id', 'dept_id']));
    console.log(`Users/Staff: ${users.length} records`);

    // 4. Students
    const students = await Student.find().lean();
    fs.writeFileSync(path.join(outputDir, 'students.csv'),
        toCsv(students, ['_id', 'roll_no', 'name', 'email', 'dept_id', 'batch_id', 'semester', 'mentor_email']));
    console.log(`Students: ${students.length} records`);

    // 5. Subjects
    const subjects = await Subject.find().lean();
    fs.writeFileSync(path.join(outputDir, 'subjects.csv'),
        toCsv(subjects, ['_id', 'name', 'code', 'dept_id', 'semester']));
    console.log(`Subjects: ${subjects.length} records`);

    // 6. Faculty-Subject Mappings
    const mappings = await FacultySubject.find().lean();
    fs.writeFileSync(path.join(outputDir, 'faculty_subject_mappings.csv'),
        toCsv(mappings, ['_id', 'faculty_email', 'subject_id', 'batch_id', 'dept_id']));
    console.log(`Faculty-Subject Mappings: ${mappings.length} records`);

    // 7. Attendance
    const attendance = await Attendance.find().lean();
    fs.writeFileSync(path.join(outputDir, 'attendance.csv'),
        toCsv(attendance, ['_id', 'student_roll', 'semester', 'percentage', 'updated_by']));
    console.log(`Attendance: ${attendance.length} records`);

    // 8. Marks
    const marks = await Marks.find().lean();
    fs.writeFileSync(path.join(outputDir, 'marks.csv'),
        toCsv(marks, ['_id', 'student_roll', 'subject_id', 'pt1', 'pt2', 'assignment', 'semester_grade', 'updated_by']));
    console.log(`Marks: ${marks.length} records`);

    // 9. Rewards
    const rewards = await Reward.find().lean();
    fs.writeFileSync(path.join(outputDir, 'rewards.csv'),
        toCsv(rewards, ['_id', 'student_roll', 'points', 'category', 'description']));
    console.log(`Rewards: ${rewards.length} records`);

    console.log(`\n✅ All exports saved to: ${outputDir}`);
    await mongoose.connection.close();
}

exportAll().catch(err => { console.error(err); process.exit(1); });
