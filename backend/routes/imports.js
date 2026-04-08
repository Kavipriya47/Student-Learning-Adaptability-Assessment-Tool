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

/**
 * parseFile — Parses an Excel or CSV upload into a structured object.
 * Returns: { headers: string[], rows: any[][], getCol(row, name): any }
 *
 * getCol does a CASE-INSENSITIVE column name lookup so the admin's file
 * column order doesn't need to be exact — as long as the headers are present.
 */
const parseFile = async (filePath, originalName) => {
    let rawRows;
    try {
        const ext = path.extname(originalName).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls') {
            rawRows = await readXlsxFile(filePath);
        } else if (ext === '.csv') {
            rawRows = await new Promise((resolve, reject) => {
                const results = [];
                fs.createReadStream(filePath)
                    .pipe(csv({ headers: false }))
                    .on('data', (data) => results.push(Object.values(data)))
                    .on('end', () => resolve(results))
                    .on('error', reject);
            });
        } else {
            throw new Error('Unsupported file format. Use .xlsx, .xls, or .csv');
        }
    } finally {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    if (!rawRows || rawRows.length === 0) return { headers: [], rows: [], getCol: () => '' };

    // First row = headers, normalised to lowercase trimmed strings
    const headers = rawRows[0].map(h => String(h || '').toLowerCase().trim());
    const dataRows = rawRows.slice(1);

    /**
     * Get a column value from a data row by its header name.
     * Falls back to positional index if name not found (backwards compat).
     */
    const getCol = (row, name) => {
        const idx = headers.indexOf(name.toLowerCase().trim());
        const val = idx !== -1 ? row[idx] : undefined;
        return String(val ?? '').trim();
    };

    return { headers, rows: dataRows, getCol };
};

const { isAdmin } = require('../middleware/auth');

// --- 1. Import Departments ---
router.post('/departments', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const { rows, getCol } = await parseFile(req.file.path, req.file.originalname);
        if (!rows || rows.length === 0) throw new Error('The uploaded file contains no data rows.');

        // 1. Intelligent Column Mapping
        for (let i = 0; i < rows.length; i++) {
            const name = getCol(rows[i], 'Name');
            const code = (getCol(rows[i], 'Code') || getCol(rows[i], 'Dept Code')).toUpperCase();
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
        const { rows, getCol } = await parseFile(req.file.path, req.file.originalname);
        if (!rows || rows.length === 0) throw new Error('File has no data rows after the header.');

        // 2. Intelligent Column Mapping
        for (let i = 0; i < rows.length; i++) {
            const name = getCol(rows[i], 'Name') || getCol(rows[i], 'Batch Name');
            const dept_code = getCol(rows[i], 'Dept Code') || getCol(rows[i], 'Department');
            if (!name || !dept_code) continue;

            try {
                const dept = await Department.findOne({ code: dept_code.toUpperCase() });
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
// --- 3. Import Subjects (Optimized) ---
router.post('/subjects', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const { rows, getCol } = await parseFile(req.file.path, req.file.originalname);
        if (!rows || rows.length === 0) throw new Error('Uploaded file is empty or missing headers.');

        const depts = await Department.find().lean();
        const deptMap = new Map(depts.map(d => [d.code, d]));
        const subjectOps = [];

        for (let i = 0; i < rows.length; i++) {
            const name = getCol(rows[i], 'Name') || getCol(rows[i], 'Subject Name');
            const code = getCol(rows[i], 'Code') || getCol(rows[i], 'Subject Code');
            const dept_code = getCol(rows[i], 'Dept Code') || getCol(rows[i], 'Department');
            const semester = getCol(rows[i], 'Semester');

            if (!name || !code) continue;

            try {
                const dept = deptMap.get(dept_code.toUpperCase());
                if (!dept) throw new Error(`Department code '${dept_code}' not found.`);

                const sem = parseInt(semester);
                if (isNaN(sem) || sem < 1 || sem > 8) throw new Error(`Invalid semester '${semester}'.`);

                subjectOps.push({
                    updateOne: {
                        filter: { code: code.toUpperCase() },
                        update: { name, code: code.toUpperCase(), dept_id: dept._id, semester: sem },
                        upsert: true
                    }
                });
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
        if (subjectOps.length > 0) await Subject.bulkWrite(subjectOps);
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }
    res.json({ message: `Successfully synchronized ${successCount} subjects.`, errors: errors.length ? errors : null });
});

// --- 4. Import Staff (Optimized) ---
router.post('/staff', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const { rows, getCol } = await parseFile(req.file.path, req.file.originalname);
        if (!rows || rows.length === 0) throw new Error('File has no staff records to process.');

        const depts = await Department.find().lean();
        const deptMap = new Map(depts.map(d => [d.code, d]));
        const staffOps = [];

        for (let i = 0; i < rows.length; i++) {
            const name = getCol(rows[i], 'Name');
            const email = getCol(rows[i], 'Email');
            const role = getCol(rows[i], 'Role');
            const staff_id = getCol(rows[i], 'Staff ID') || getCol(rows[i], 'ID');
            const dept_code = getCol(rows[i], 'Dept Code') || getCol(rows[i], 'Department');

            if (!name || !email) continue;

            try {
                if (!['Faculty', 'Mentor'].includes(role)) throw new Error(`Invalid role '${role}'. Only 'Faculty' or 'Mentor' are allowed.`);
                const dept = deptMap.get(dept_code.toUpperCase());
                if (!dept) throw new Error(`Department code '${dept_code}' not found in the system.`);

                staffOps.push({
                    updateOne: {
                        filter: { email: email.toLowerCase() },
                        update: { name, role, staff_id, dept_id: dept._id },
                        upsert: true
                    }
                });
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
        if (staffOps.length > 0) await User.bulkWrite(staffOps);
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }
    res.json({ message: `Successfully synchronized ${successCount} staff records.`, errors: errors.length ? errors : null });
});

// --- 5. Import Staff-Subject Mappings (Optimized) ---
router.post('/staff-mapping', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const { rows, getCol } = await parseFile(req.file.path, req.file.originalname);
        if (!rows || rows.length === 0) throw new Error('Mapping file is empty.');
        
        const [subjects, batches, depts, staffMembers] = await Promise.all([
            Subject.find().lean(),
            Batch.find().lean(),
            Department.find().lean(),
            User.find({ role: { $in: ['Faculty', 'Mentor'] } }).lean()
        ]);

        const subjectMap = new Map(subjects.map(s => [s.code.toUpperCase(), s]));
        const batchMap = new Map(batches.map(b => [`${b.name}_${b.dept_id}`, b]));
        const deptMap = new Map(depts.map(d => [d.code, d]));
        const staffMap = new Map(staffMembers.map(u => [u.email.toLowerCase(), u]));
        const mappingOps = [];

        for (let i = 0; i < rows.length; i++) {
            const email = getCol(rows[i], 'Faculty Email') || getCol(rows[i], 'Email');
            const sub_code = getCol(rows[i], 'Subject Code') || getCol(rows[i], 'Subject');
            const batch_name = getCol(rows[i], 'Batch Name') || getCol(rows[i], 'Batch');
            const dept_code = getCol(rows[i], 'Dept Code') || getCol(rows[i], 'Department');

            if (!email || !sub_code) continue;

            try {
                const staff = staffMap.get(email.toLowerCase());
                const subject = subjectMap.get(sub_code.toUpperCase());
                const dept = deptMap.get(dept_code.toUpperCase());

                if (!staff) throw new Error(`Staff with email '${email}' not registered.`);
                if (!subject) throw new Error(`Subject with code '${sub_code}' not found in catalog.`);
                if (!dept) throw new Error(`Department code '${dept_code}' not found.`);

                const batchKey = `${batch_name}_${dept._id}`;
                const batch = batchMap.get(batchKey);
                if (!batch) throw new Error(`Batch '${batch_name}' not found for department '${dept_code}'.`);

                mappingOps.push({
                    updateOne: {
                        filter: { faculty_email: email.toLowerCase(), subject_id: subject._id, batch_id: batch._id },
                        update: { dept_id: dept._id },
                        upsert: true
                    }
                });
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }
        if (mappingOps.length > 0) await FacultySubject.bulkWrite(mappingOps);
    } catch (e) {
        return res.status(400).json({ message: 'Error reading file', error: e.message });
    }
    res.json({ message: `Successfully synchronized ${successCount} mappings.`, errors: errors.length ? errors : null });
});

// --- 6. Import Students (Master Enrollment - Optimized) ---
router.post('/students', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const { rows, getCol } = await parseFile(req.file.path, req.file.originalname);
        if (!rows || rows.length === 0) throw new Error('Enrollment file is empty or formatted incorrectly.');

        // 1. PRE-FETCH ALL DEPARTMENTS, BATCHES AND USERS (MENTORS)
        const [depts, batches, users] = await Promise.all([
            Department.find().lean(),
            Batch.find().lean(),
            User.find({ role: { $in: ['Mentor', 'Faculty'] } }).lean()
        ]);

        const deptMap = new Map(depts.map(d => [d.code, d]));
        const batchMap = new Map(batches.map(b => [`${b.name}_${b.dept_id}`, b]));
        const mentorMap = new Map(users.map(u => [u.email.toLowerCase(), u]));

        const studentOps = [];

        // 2. PROCESS ROWS with Intelligent Column Mapping
        for (let i = 0; i < rows.length; i++) {
            const roll_no = getCol(rows[i], 'Roll No') || getCol(rows[i], 'RollNumber');
            const name = getCol(rows[i], 'Name');
            const email = getCol(rows[i], 'Email');
            const dept_code = getCol(rows[i], 'Dept Code') || getCol(rows[i], 'Department');
            const batch_name = getCol(rows[i], 'Batch Name') || getCol(rows[i], 'Batch');
            const semester = getCol(rows[i], 'Semester');
            const mentor_email = getCol(rows[i], 'Mentor Email') || getCol(rows[i], 'Mentor');

            if (!roll_no || !name || !email) continue;

            try {
                const dept = deptMap.get(dept_code);
                if (!dept) throw new Error(`Dept Code '${dept_code}' not found.`);

                const batchKey = `${batch_name}_${dept._id}`;
                const batch = batchMap.get(batchKey);
                if (!batch) throw new Error(`Batch '${batch_name}' not found for Dept '${dept_code}'.`);

                const sem = parseInt(semester);
                if (isNaN(sem) || sem < 1 || sem > 8) throw new Error(`Invalid Semester '${semester}'.`);

                if (mentor_email) {
                    const mentor = mentorMap.get(mentor_email.toLowerCase());
                    if (!mentor) throw new Error(`Mentor email '${mentor_email}' not found. Please register staff first.`);
                }

                studentOps.push({
                    updateOne: {
                        filter: { roll_no: roll_no.toUpperCase() },
                        update: { 
                            name, 
                            email: email.toLowerCase(), 
                            dept_id: dept._id, 
                            batch_id: batch._id, 
                            semester: sem, 
                            mentor_email: mentor_email ? mentor_email.toLowerCase() : null 
                        },
                        upsert: true
                    }
                });
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        // 3. EXECUTE BULK WRITE
        if (studentOps.length > 0) {
            await Student.bulkWrite(studentOps);
        }
    } catch (e) {
        return res.status(400).json({ message: 'Critical error reading file', error: e.message });
    }

    res.json({ message: `Successfully synchronized ${successCount} student profiles.`, errors: errors.length ? errors : null });
});

// --- 7. Import Student Attributes (Consolidated Performance - Batch Optimized) ---
router.post('/student-attributes', isAdmin, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let successCount = 0;
    let errors = [];
    try {
        const { rows, getCol } = await parseFile(req.file.path, req.file.originalname);
        if (!rows || rows.length === 0) throw new Error('Performance dataset is empty.');

        // 1. COLLECT ALL UNIQUE KEYS FOR BULK FETCHING
        const rollIndices = ['Roll No', 'RollNumber'];
        const uniqueRolls = [...new Set(rows.map(row => {
            const r = getCol(row, 'Roll No') || getCol(row, 'RollNumber');
            return String(r || '').trim().toUpperCase();
        }).filter(Boolean))];
        
        const uniqueSubCodes = [...new Set(rows.map(row => {
            const s = getCol(row, 'Subject Code') || getCol(row, 'Subject');
            return String(s || '').trim().toUpperCase();
        }).filter(Boolean))];

        // 2. ONE-SHOT FETCH FOR CACHED LOOKUPS
        const [students, subjects] = await Promise.all([
            Student.find({ roll_no: { $in: uniqueRolls } }).lean(),
            Subject.find({ code: { $in: uniqueSubCodes } }).lean()
        ]);

        const studentMap = new Map(students.map(s => [s.roll_no, s]));
        const subjectMap = new Map(subjects.map(s => [s.code, s]));

        const attendanceOps = [];
        const rewardOps = [];
        const marksOps = [];

        // 3. PROCESS ROWS
        for (let i = 0; i < rows.length; i++) {
            const roll = getCol(rows[i], 'Roll No') || getCol(rows[i], 'RollNumber');
            const sem = getCol(rows[i], 'Semester');
            const att = getCol(rows[i], 'Attendance %');
            const pts = getCol(rows[i], 'Reward Points');
            const cat = getCol(rows[i], 'Reward Category');
            const sub_code = getCol(rows[i], 'Subject Code') || getCol(rows[i], 'Subject');
            const pt1 = getCol(rows[i], 'PT1');
            const pt2 = getCol(rows[i], 'PT2');
            const asgn = getCol(rows[i], 'Assignment');
            const grade = getCol(rows[i], 'Grade');

            if (!roll) continue;

            try {
                const rollUpper = roll.toUpperCase();
                const student = studentMap.get(rollUpper);
                if (!student) throw new Error(`Student ${rollUpper} not found. Please enroll them first via the Master Enrollment module.`);

                const targetSem = parseInt(sem) || student.semester;

                // 1. Attendance Operation
                if (att !== '') {
                    const percentage = parseFloat(att);
                    if (!isNaN(percentage)) {
                        attendanceOps.push({
                            updateOne: {
                                filter: { student_roll: rollUpper, semester: targetSem },
                                update: { percentage, updated_by: 'Admin (Bulk Import)', updated_at: Date.now() },
                                upsert: true
                            }
                        });
                    }
                }

                // 2. Reward Operation
                if (pts !== '') {
                    const points = parseFloat(pts);
                    if (!isNaN(points) && points > 0) {
                        rewardOps.push({
                            updateOne: {
                                filter: { student_roll: rollUpper, points, category: cat || 'Performance Import' },
                                update: { updated_at: Date.now() },
                                upsert: true
                            }
                        });
                    }
                }

                // 3. Marks Operation
                if (sub_code) {
                    const subUpper = sub_code.toUpperCase();
                    const subject = subjectMap.get(subUpper);
                    if (!subject) throw new Error(`Subject with code '${subUpper}' not found in the catalog.`);

                    const marksData = { updated_by: 'Admin (Bulk Import)', updated_at: Date.now() };
                    if (pt1 !== '') marksData.pt1 = parseFloat(pt1);
                    if (pt2 !== '') marksData.pt2 = parseFloat(pt2);
                    if (asgn !== '') marksData.assignment = parseFloat(asgn);
                    if (grade !== '') marksData.semester_grade = grade.toUpperCase();

                    marksOps.push({
                        updateOne: {
                            filter: { student_roll: rollUpper, subject_id: subject._id },
                            update: marksData,
                            upsert: true
                        }
                    });
                }
                successCount++;
            } catch (err) {
                errors.push(`Row ${i + 2}: ${err.message}`);
            }
        }

        // 4. EXECUTE BULK WRITES
        await Promise.all([
            attendanceOps.length > 0 ? Attendance.bulkWrite(attendanceOps) : Promise.resolve(),
            rewardOps.length > 0 ? Reward.bulkWrite(rewardOps) : Promise.resolve(),
            marksOps.length > 0 ? Marks.bulkWrite(marksOps) : Promise.resolve()
        ]);
    } catch (e) {
        return res.status(400).json({ message: 'Critical Error reading dataset', error: e.message });
    }

    res.json({ message: `Successfully synchronized ${successCount} performance records.`, errors: errors.length ? errors : null });
});

module.exports = router;
