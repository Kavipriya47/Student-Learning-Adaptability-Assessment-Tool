require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Department = require('./models/Department');
const Batch = require('./models/Batch');
const Subject = require('./models/Subject');
const Student = require('./models/Student');
const FacultySubject = require('./models/FacultySubject');
const Attendance = require('./models/Attendance');
const Marks = require('./models/Marks');

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/slaa';

const DEPARTMENTS = [
    { name: 'Computer Science and Engineering', code: 'CSE' },
    { name: 'Information Technology', code: 'IT' },
    { name: 'Electronics and Communication Engineering', code: 'ECE' },
    { name: 'Computer Science and Business Systems', code: 'CB' }
];

const BATCH_NAMES = ['2021-2025', '2022-2026', '2023-2027', '2024-2028'];

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(DB_URI);
        console.log('Connected.');

        // 1. Clear Collections
        console.log('Clearing existing data...');
        await Promise.all([
            User.deleteMany({ role: { $ne: 'Admin' } }),
            Department.deleteMany({}),
            Batch.deleteMany({}),
            Subject.deleteMany({}),
            Student.deleteMany({}),
            FacultySubject.deleteMany({}),
            Attendance.deleteMany({}),
            Marks.deleteMany({})
        ]);

        // 2. Create Departments
        console.log('Creating Departments...');
        const createdDepts = await Department.insertMany(DEPARTMENTS);
        const deptIds = createdDepts.map(d => d._id);

        // 3. Create Batches
        console.log('Creating Batches...');
        const batchesToCreate = [];
        createdDepts.forEach(dept => {
            BATCH_NAMES.forEach((name) => {
                batchesToCreate.push({
                    name: name,
                    dept_id: dept._id
                });
            });
        });
        const createdBatches = await Batch.insertMany(batchesToCreate);

        // 4. Create Subjects (3 per semester, 8 sem)
        console.log('Creating Subjects (3 per sem, 8 sem)...');
        const subjectsToCreate = [];
        createdDepts.forEach(dept => {
            for (let sem = 1; sem <= 8; sem++) {
                for (let i = 1; i <= 3; i++) {
                    subjectsToCreate.push({
                        name: `${dept.code} Subject ${sem}.${i}`,
                        code: `${dept.code}${sem}0${i}`,
                        dept_id: dept._id,
                        semester: sem
                    });
                }
            }
        });
        const createdSubjects = await Subject.insertMany(subjectsToCreate);

        // 5. Create Staff (1 Faculty, 1 Mentor per Dept)
        console.log('Creating Staff members...');
        const staffToCreate = [];
        const passwordHash = await bcrypt.hash('password123', 10);
        createdDepts.forEach(dept => {
            // Faculty
            staffToCreate.push({
                name: `Prof. ${dept.code} Faculty`,
                email: `faculty.${dept.code.toLowerCase()}@bitsathy.ac.in`,
                role: 'Faculty',
                staff_id: `F-${dept.code}-01`,
                dept_id: dept._id,
                password: 'password123' // Will be hashed by pre-save hook
            });
            // Mentor
            staffToCreate.push({
                name: `${dept.code} Mentor Lead`,
                email: `mentor.${dept.code.toLowerCase()}@bitsathy.ac.in`,
                role: 'Mentor',
                staff_id: `M-${dept.code}-01`,
                dept_id: dept._id,
                password: 'password123' // Will be hashed by pre-save hook
            });
        });
        const createdStaff = await User.insertMany(staffToCreate);

        // 6. Create Students (5 per batch)
        console.log('Creating Students (5 per batch)...');
        const studentsToCreate = [];
        createdBatches.forEach(batch => {
            const mentor = createdStaff.find(s => s.role === 'Mentor' && s.dept_id.toString() === batch.dept_id.toString());
            // Determine current semester based on batch name index for demo variety
            const yearIdx = BATCH_NAMES.indexOf(batch.name);
            const currentSemester = (yearIdx + 1) * 2;

            for (let i = 1; i <= 5; i++) {
                const deptCode = createdDepts.find(d => d._id.toString() === batch.dept_id.toString()).code;
                const rollNo = `${batch.name.split('-')[0].slice(-2)}${deptCode}${i.toString().padStart(2, '0')}`;
                studentsToCreate.push({
                    roll_no: rollNo,
                    name: `Student ${rollNo}`,
                    email: `${rollNo.toLowerCase()}@bitsathy.ac.in`,
                    dept_id: batch.dept_id,
                    batch_id: batch._id,
                    semester: currentSemester,
                    mentor_email: mentor ? mentor.email : 'admin@bitsathy.ac.in'
                });
            }
        });
        const createdStudents = await Student.insertMany(studentsToCreate);

        // 7. Create Faculty-Subject Mappings (Current Semester only)
        console.log('Mapping Faculty to Subjects/Batches...');
        const mappingsToCreate = [];
        createdBatches.forEach(batch => {
            const faculty = createdStaff.find(s => s.role === 'Faculty' && s.dept_id.toString() === batch.dept_id.toString());
            const yearIdx = BATCH_NAMES.indexOf(batch.name);
            const currentSemester = (yearIdx + 1) * 2;

            const currentSubjects = createdSubjects.filter(s =>
                s.dept_id.toString() === batch.dept_id.toString() &&
                s.semester === currentSemester
            );

            currentSubjects.forEach(subject => {
                mappingsToCreate.push({
                    faculty_email: faculty.email,
                    subject_id: subject._id,
                    batch_id: batch._id,
                    dept_id: batch.dept_id
                });
            });
        });
        await FacultySubject.insertMany(mappingsToCreate);

        // 8. Create Marks and Attendance for Current Semester Students
        console.log('Seeding Marks and Attendance records...');
        const marksToCreate = [];
        const attendanceToCreate = [];

        for (const student of createdStudents) {
            const currentSubjects = createdSubjects.filter(s =>
                s.dept_id.toString() === student.dept_id.toString() &&
                s.semester === student.semester
            );

            currentSubjects.forEach(subject => {
                marksToCreate.push({
                    student_roll: student.roll_no,
                    subject_id: subject._id,
                    pt1: 15 + Math.floor(Math.random() * 10),
                    pt2: 15 + Math.floor(Math.random() * 10),
                    assignment: 5 + Math.floor(Math.random() * 5),
                    semester_grade: ['O', 'A+', 'A', 'B+', 'B'][Math.floor(Math.random() * 5)],
                    updated_by: `faculty.${createdDepts.find(d => d._id.toString() === student.dept_id.toString()).code.toLowerCase()}@bitsathy.ac.in`
                });
            });

            attendanceToCreate.push({
                student_roll: student.roll_no,
                semester: student.semester,
                percentage: 75 + Math.floor(Math.random() * 20),
                updated_by: 'System'
            });
        }

        await Marks.insertMany(marksToCreate);
        await Attendance.insertMany(attendanceToCreate);

        console.log('-----------------------------------');
        console.log('COMPLETE DUMMY DATA SEEDING FINISHED');
        console.log(`Departments: ${createdDepts.length}`);
        console.log(`Batches: ${createdBatches.length}`);
        console.log(`Subjects: ${createdSubjects.length}`);
        console.log(`Students: ${createdStudents.length}`);
        console.log(`Staff Users: ${createdStaff.length}`);
        console.log('-----------------------------------');

        process.exit(0);
    } catch (err) {
        console.error('SEEDING ERROR:', err);
        process.exit(1);
    }
}

seed();
