const express = require('express');
const router = express.Router();
const FacultySubject = require('../models/FacultySubject');
const Student = require('../models/Student');
const Marks = require('../models/Marks');
require('../models/Subject');
require('../models/Department');
require('../models/Batch');
const mongoose = require('mongoose');
const { clearAnalyticsCache } = require('../utils/cache');

const { isFacultyOrAdmin } = require('../middleware/auth');
const isFaculty = isFacultyOrAdmin;

// Get assigned subjects with completion telemetry (Optimized — no N+1 queries)
router.get('/my-subjects', isFaculty, async (req, res) => {
    try {
        const assignments = await FacultySubject.find({ faculty_email: req.user.email })
            .populate('subject_id')
            .populate('dept_id')
            .populate('batch_id')
            .lean();

        const validAssignments = assignments.filter(fs => fs.subject_id && fs.dept_id && fs.batch_id);
        if (validAssignments.length === 0) return res.json([]);

        // 1. ONE-SHOT FETCH: All students across all relevant dept+batch+semester combos
        const studentQueries = validAssignments.map(fs => ({
            dept_id: fs.dept_id._id,
            batch_id: fs.batch_id._id,
            semester: fs.subject_id.semester
        }));
        const allStudents = await Student.find({ $or: studentQueries }).select('roll_no dept_id batch_id semester').lean();

        // 2. ONE-SHOT FETCH: All marks for those students across all relevant subjects
        const allSubjectIds = validAssignments.map(fs => fs.subject_id._id);
        const allRolls = allStudents.map(s => s.roll_no);
        const allMarks = allRolls.length > 0
            ? await Marks.find({ student_roll: { $in: allRolls }, subject_id: { $in: allSubjectIds } }).lean()
            : [];

        // 3. Build lookup structures in memory (fast Map operations)
        // Key: `deptId_batchId_semester` → [rolls]
        const studentLookup = new Map();
        for (const s of allStudents) {
            const key = `${s.dept_id}_${s.batch_id}_${s.semester}`;
            if (!studentLookup.has(key)) studentLookup.set(key, []);
            studentLookup.get(key).push(s.roll_no);
        }

        // Key: `roll_subjectId` → marks record
        const marksLookup = new Map();
        for (const m of allMarks) {
            marksLookup.set(`${m.student_roll}_${m.subject_id}`, m);
        }

        // 4. BUILD RESPONSE — pure in-memory merging
        const enrichedSubjects = validAssignments.map(fs => {
            const key = `${fs.dept_id._id}_${fs.batch_id._id}_${fs.subject_id.semester}`;
            const rolls = studentLookup.get(key) || [];
            const enrolledCount = rolls.length;

            const enteredCount = rolls.filter(roll => {
                const m = marksLookup.get(`${roll}_${fs.subject_id._id}`);
                if (!m) return false;
                return (m.pt1 !== null && m.pt1 !== undefined) ||
                    (m.pt2 !== null && m.pt2 !== undefined) ||
                    (m.assignment !== null && m.assignment !== undefined) ||
                    !!m.semester_grade;
            }).length;

            return {
                id: fs._id,
                subject_id: fs.subject_id._id,
                subject_name: fs.subject_id.name,
                subject_code: fs.subject_id.code,
                dept_id: fs.dept_id._id,
                dept_name: fs.dept_id.name,
                batch_id: fs.batch_id._id,
                batch_name: fs.batch_id.name,
                semester: fs.subject_id.semester,
                telemetry: {
                    enrolled: enrolledCount,
                    entered: enteredCount,
                    pending: enrolledCount - enteredCount,
                    completion_percentage: enrolledCount === 0 ? 0 : Math.round((enteredCount / enrolledCount) * 100)
                }
            };
        });

        res.json(enrichedSubjects);
    } catch (error) {
        console.error('Error fetching assigned subjects:', error);
        res.status(500).json({ message: 'Error fetching assigned subjects' });
    }
});

// Get students for a specific subject/batch
router.get('/students', isFaculty, async (req, res) => {
    const { dept_id, batch_id, subject_id } = req.query;
    console.log('[DEBUG] /students Request:', { dept_id, batch_id, subject_id });
    try {
        const Subject = mongoose.model('Subject');
        const subject = await Subject.findById(subject_id).lean();
        if (!subject) {
            console.error(`[ERROR] Subject with ID ${subject_id} not found.`);
            return res.status(404).json({ message: 'Subject not found' });
        }

        // Security Check: Verify this faculty is assigned to this combination
        if (req.user.role !== 'Admin') {
            const assignment = await FacultySubject.findOne({
                faculty_email: req.user.email,
                subject_id,
                batch_id
            });
            if (!assignment) {
                console.warn(`[Security] Unauthorized access attempt by ${req.user.email} for subject ${subject_id}`);
                return res.status(403).json({ message: 'Access Denied: You are not assigned to this subject and batch. '});
            }
        }

        // Filter students by dept, batch AND semester to match subject
        const students = await Student.find({
            dept_id,
            batch_id,
            semester: subject.semester
        }).lean();

        console.log('[DEBUG] Students found in DB:', students.length);
        if (students.length > 0) console.log('[DEBUG] Sample student:', students[0].roll_no, students[0].semester);

        // Fetch marks for these students for the given subject
        const studentRolls = students.map(s => s.roll_no);
        const marks = await Marks.find({
            student_roll: { $in: studentRolls },
            subject_id: subject_id
        }).lean();

        // Merge marks into student objects
        const marksMap = {};
        marks.forEach(m => {
            marksMap[m.student_roll] = m;
        });

        const mergedStudents = students.map(s => ({
            roll_no: s.roll_no,
            name: s.name,
            profile_pic: s.profile_pic,
            pt1: marksMap[s.roll_no]?.pt1 ?? '',
            pt2: marksMap[s.roll_no]?.pt2 ?? '',
            assignment: marksMap[s.roll_no]?.assignment ?? '',
            semester_grade: marksMap[s.roll_no]?.semester_grade ?? '',
            is_synced: !!marksMap[s.roll_no] // flag if we actually pulled it from DB
        }));

        res.json(mergedStudents);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ message: 'Error fetching students' });
    }
});

// Update marks with strict validation
router.post('/marks', isFaculty, async (req, res) => {
    const { student_roll, subject_id, pt1, pt2, assignment, semester_grade } = req.body;

    // Strict Validation
    let parsedPT1 = pt1 === '' || pt1 === null ? undefined : Number(pt1);
    let parsedPT2 = pt2 === '' || pt2 === null ? undefined : Number(pt2);
    let parsedAssignment = assignment === '' || assignment === null ? undefined : Number(assignment);

    if (parsedPT1 !== undefined && (parsedPT1 < 0 || parsedPT1 > 50)) {
        return res.status(400).json({ message: 'PT1 marks must be between 0 and 50' });
    }
    if (parsedPT2 !== undefined && (parsedPT2 < 0 || parsedPT2 > 50)) {
        return res.status(400).json({ message: 'PT2 marks must be between 0 and 50' });
    }
    if (parsedAssignment !== undefined && (parsedAssignment < 0 || parsedAssignment > 100)) {
        return res.status(400).json({ message: 'Assignment marks must be between 0 and 100' });
    }

    try {
        // Find existing student to get batch_id
        const studentObj = await Student.findOne({ roll_no: student_roll }).select('batch_id').lean();
        if (!studentObj) {
            return res.status(404).json({ message: 'Student not found.' });
        }

        // Security Check: Verify this faculty is assigned to this subject for this student's batch
        if (req.user.role !== 'Admin') {
            const assignment = await FacultySubject.findOne({
                faculty_email: req.user.email,
                subject_id,
                batch_id: studentObj.batch_id
            });
            if (!assignment) {
                console.warn(`[Security] Unauthorized marks update attempt by ${req.user.email} for student ${student_roll}`);
                return res.status(403).json({ message: 'Access Denied: You are not assigned to teach this student in this subject.'});
            }
        }

        const updateData = {};
        if (parsedPT1 !== undefined) updateData.pt1 = parsedPT1;
        if (parsedPT2 !== undefined) updateData.pt2 = parsedPT2;
        if (parsedAssignment !== undefined) updateData.assignment = parsedAssignment;
        if (semester_grade !== undefined) updateData.semester_grade = semester_grade;

        // Force logging
        updateData.updated_by = req.user.email;
        updateData.updated_at = new Date();

        const updatedMark = await Marks.findOneAndUpdate(
            { student_roll, subject_id },
            { $set: updateData },
            { upsert: true, new: true, runValidators: true }
        );

        // Bust analytics cache
        if (studentObj && studentObj.batch_id) {
            clearAnalyticsCache(studentObj.batch_id.toString());
        }

        res.json({ message: 'Marks updated successfully', mark: updatedMark });
    } catch (error) {
        console.error('Error updating marks:', error);
        res.status(400).json({ message: 'Error updating marks', error: error.message });
    }
});

module.exports = router;
