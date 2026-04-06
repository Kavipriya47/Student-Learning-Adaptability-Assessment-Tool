const express = require('express');
const router = express.Router();
const multer = require('multer');
const readXlsxFile = require('read-excel-file/node');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Student = require('../models/Student');
const Department = require('../models/Department');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const Reward = require('../models/Reward');
const User = require('../models/User');
const Subject = require('../models/Subject');
const FacultySubject = require('../models/FacultySubject');
const Marks = require('../models/Marks');

const upload = multer({ dest: 'uploads/' });

const parseFile = async (filePath, originalName) => {
    try {
        const ext = path.extname(originalName).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
            return await readXlsxFile(filePath);
        } else if (ext === '.csv') {
            return await new Promise((resolve, reject) => {
                const results = [];
                fs.createReadStream(filePath)
                    .pipe(csv({ headers: false })) // Match read-excel-file's array output
                    .on('data', (data) => results.push(Object.values(data)))
                    .on('end', () => resolve(results))
                    .on('error', reject);
            });
        } else {
            throw new Error('Unsupported file format. Use .xlsx, .xls, or .csv');
        }
    } finally {
        // Clean up the uploaded file from the disk to prevent resource leaks
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};

const { isAdmin } = require('../middleware/auth');

// --- 1. Import Departments ---
router.post('/departments', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const rows = await parseFile(req.file.path, req.file.originalname);
        const data = rows.slice(1); // Header: [Name, Code]

        for (let i = 0; i < data.length; i++) {
            const [name, code] = data[i].map(v => String(v || '').trim());
            if (!name || !code) continue;

            try {
                await Department.findOneAndUpdate({ code }, { name }, { upsert: true, new: true });
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }

    res.json({
        message: `Processed ${successCount} departments successfully.`,
        errors: errors.length ? errors : null
    });
});

// --- 2. Import Batches ---
router.post('/batches', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const rows = await parseFile(req.file.path, req.file.originalname);
        const data = rows.slice(1); // Header: [Name, Dept Code]

        for (let i = 0; i < data.length; i++) {
            const [name, dept_code] = data[i].map(v => String(v || '').trim());
            if (!name || !dept_code) continue;

            try {
                const dept = await Department.findOne({ code: dept_code });
                if (!dept) throw new Error(`Department code '${dept_code}' not found.`);

                await Batch.findOneAndUpdate({ name, dept_id: dept._id }, { name, dept_id: dept._id }, { upsert: true, new: true });
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }

    res.json({ message: `Processed ${successCount} batches.`, errors: errors.length ? errors : null });
});

// --- 3. Import Subjects ---
router.post('/subjects', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const rows = await parseFile(req.file.path, req.file.originalname);
        const data = rows.slice(1); // Header: [Name, Code, Dept Code, Semester]

        for (let i = 0; i < data.length; i++) {
            const [name, code, dept_code, semester] = data[i].map(v => String(v || '').trim());
            if (!name || !code) continue;

            try {
                const dept = await Department.findOne({ code: dept_code });
                if (!dept) throw new Error(`Department code '${dept_code}' not found.`);

                const sem = parseInt(semester);
                if (isNaN(sem) || sem < 1 || sem > 8) throw new Error(`Invalid semester '${semester}'.`);

                await Subject.findOneAndUpdate(
                    { code },
                    { name, code, dept_id: dept._id, semester: sem },
                    { upsert: true, new: true }
                );
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }

    res.json({ message: `Processed ${successCount} subjects.`, errors: errors.length ? errors : null });
});

// --- 4. Import Staff ---
router.post('/staff', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const rows = await parseFile(req.file.path, req.file.originalname);
        const data = rows.slice(1); // Header: [Name, Email, Role, Staff ID, Dept Code]

        for (let i = 0; i < data.length; i++) {
            const [name, email, role, staff_id, dept_code] = data[i].map(v => String(v || '').trim());
            if (!name || !email) continue;

            try {
                if (!['Faculty', 'Mentor'].includes(role)) throw new Error(`Invalid role '${role}'.`);
                const dept = await Department.findOne({ code: dept_code });
                if (!dept) throw new Error(`Department code '${dept_code}' not found.`);

                await User.findOneAndUpdate(
                    { email: email.toLowerCase() },
                    { name, role, staff_id, dept_id: dept._id },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }

    res.json({ message: `Processed ${successCount} staff records.`, errors: errors.length ? errors : null });
});

// --- 5. Import Staff-Subject Mappings ---
router.post('/staff-mapping', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const rows = await parseFile(req.file.path, req.file.originalname);
        const data = rows.slice(1); // Header: [Faculty Email, Subject Code, Batch Name, Dept Code]

        for (let i = 0; i < data.length; i++) {
            const [faculty_email, subject_code, batch_name, dept_code] = data[i].map(v => String(v || '').trim());
            if (!faculty_email || !subject_code) continue;

            try {
                const [staff, subject, dept] = await Promise.all([
                    User.findOne({ email: faculty_email.toLowerCase() }),
                    Subject.findOne({ code: subject_code }),
                    Department.findOne({ code: dept_code })
                ]);

                if (!staff) throw new Error(`Staff with email '${faculty_email}' not found.`);
                if (!subject) throw new Error(`Subject with code '${subject_code}' not found.`);
                if (!dept) throw new Error(`Department code '${dept_code}' not found.`);

                const batch = await Batch.findOne({ name: batch_name, dept_id: dept._id });
                if (!batch) throw new Error(`Batch '${batch_name}' not found for department '${dept_code}'.`);

                // Ensure mapping is valid
                if (subject.dept_id && subject.dept_id.toString() !== dept._id.toString()) {
                    throw new Error(`Subject '${subject_code}' does not belong to department '${dept_code}'.`);
                }

                await FacultySubject.findOneAndUpdate(
                    { faculty_email, subject_id: subject._id, batch_id: batch._id },
                    { dept_id: dept._id },
                    { upsert: true, new: true }
                );
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }

    res.json({ message: `Processed ${successCount} mappings.`, errors: errors.length ? errors : null });
});

// --- 6. Import Students (Master Enrollment) ---
router.post('/students', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const rows = await parseFile(req.file.path, req.file.originalname);
        const data = rows.slice(1); // Header: [Roll No, Name, Email, Dept Code, Batch Name, Semester, Mentor Email]

        for (let i = 0; i < data.length; i++) {
            const [roll_no, name, email, dept_code, batch_name, semester, mentor_email] = data[i].map(v => String(v || '').trim());
            if (!roll_no || !name || !email) continue;

            try {
                const dept = await Department.findOne({ code: dept_code });
                if (!dept) throw new Error(`Dept Code '${dept_code}' not found.`);

                const batch = await Batch.findOne({ name: batch_name, dept_id: dept._id });
                if (!batch) throw new Error(`Batch '${batch_name}' not found for Dept '${dept_code}'.`);

                const sem = parseInt(semester);
                if (isNaN(sem) || sem < 1 || sem > 8) throw new Error(`Invalid Semester '${semester}'.`);

                if (mentor_email) {
                    const mentor = await User.findOne({ email: mentor_email.toLowerCase() });
                    if (!mentor) throw new Error(`Mentor email '${mentor_email}' not found.`);
                    if (!['Mentor', 'Faculty'].includes(mentor.role)) throw new Error(`User '${mentor_email}' is not a Mentor/Faculty.`);
                }

                await Student.findOneAndUpdate(
                    { roll_no: roll_no.toUpperCase() },
                    { name, email: email.toLowerCase(), dept_id: dept._id, batch_id: batch._id, semester: sem, mentor_email: mentor_email ? mentor_email.toLowerCase() : null },
                    { upsert: true, new: true, runValidators: true }
                );
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }

    res.json({ message: `Processed ${successCount} students.`, errors: errors.length ? errors : null });
});

// --- 7. Import Student Attributes (Consolidated Performance) ---
router.post('/student-attributes', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const rows = await parseFile(req.file.path, req.file.originalname);
        // Header: [Roll No, Semester, Attendance %, Reward Points, Reward Category, Subject Code, PT1, PT2, Assignment, Grade]
        const data = rows.slice(1);

        for (let i = 0; i < data.length; i++) {
            const [roll, sem, att, pts, cat, sub_code, pt1, pt2, asgn, grade] = data[i].map(v => String(v || '').trim());
            if (!roll) continue;

            try {
                // RULE: Verify student exists first
                const student = await Student.findOne({ roll_no: roll.toUpperCase() });
                if (!student) throw new Error(`Student ${roll} not found. Enroll them first.`);

                const targetSem = parseInt(sem) || student.semester;
                const subject = await Subject.findOne({ code: sub_code.toUpperCase() });

                const updates = [];

                // 1. Attendance Update
                if (att !== '') {
                    const percentage = parseFloat(att);
                    if (!isNaN(percentage)) {
                        updates.push(Attendance.findOneAndUpdate(
                            { student_roll: roll.toUpperCase(), semester: targetSem },
                            { percentage, updated_by: 'Admin (Bulk Attribute Import)', updated_at: Date.now() },
                            { upsert: true }
                        ));
                    }
                }

                // 2. Reward Update
                if (pts !== '') {
                    const points = parseFloat(pts);
                    if (!isNaN(points) && points > 0) {
                        updates.push(Reward.findOneAndUpdate(
                            { student_roll: roll.toUpperCase(), points, category: cat || 'Performance Import' },
                            { updated_at: Date.now() },
                            { upsert: true }
                        ));
                    }
                }

                // 3. Marks Update (if subject provided)
                if (subject) {
                    const marksData = { updated_by: 'Admin (Bulk Attribute Import)', updated_at: Date.now() };
                    if (pt1 !== '') marksData.pt1 = parseFloat(pt1);
                    if (pt2 !== '') marksData.pt2 = parseFloat(pt2);
                    if (asgn !== '') marksData.assignment = parseFloat(asgn);
                    if (grade !== '') marksData.semester_grade = grade.toUpperCase();

                    updates.push(Marks.findOneAndUpdate(
                        { student_roll: roll.toUpperCase(), subject_id: subject._id },
                        marksData,
                        { upsert: true }
                    ));
                }

                await Promise.all(updates);
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }

    res.json({ message: `Processed ${successCount} entries.`, errors: errors.length ? errors : null });
});

module.exports = router;
