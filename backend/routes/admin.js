const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Batch = require('../models/Batch');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Student = require('../models/Student');
const FacultySubject = require('../models/FacultySubject');
const Attendance = require('../models/Attendance');
const Reward = require('../models/Reward');
const Marks = require('../models/Marks');
const AdaptabilityHistory = require('../models/AdaptabilityHistory');
const EvaluationRun = require('../models/EvaluationRun');
const MentoringNote = require('../models/MentoringNote');
const { calculateAdaptability } = require('../utils/adaptability');
const { generateOTP, hashOTP } = require('../utils/otp');
const { sendEmail } = require('../utils/email');

const { isAdmin } = require('../middleware/auth');
const { cloudinary, upload } = require('../config/cloudinary');

const { getCachedAnalytics, setAnalyticsCache, clearAnalyticsCache } = require('../utils/cache');


// --- Departments ---
router.get('/departments', isAdmin, async (req, res) => {
    try {
        const departments = await Department.find().lean();
        res.json(departments.map(d => ({ ...d, id: d._id })));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching departments' });
    }
});

router.post('/departments', isAdmin, async (req, res) => {
    const { name, code } = req.body;
    try {
        const department = new Department({ name, code });
        await department.save();
        res.status(201).json(department);
    } catch (error) {
        res.status(400).json({ message: 'Error creating department' });
    }
});

router.put('/departments/:id', isAdmin, async (req, res) => {
    const { name, code } = req.body;
    try {
        const department = await Department.findByIdAndUpdate(req.params.id, { name, code }, { new: true });
        if (!department) return res.status(404).json({ message: 'Department not found' });
        res.json(department);
    } catch (error) {
        res.status(400).json({ message: 'Error updating department' });
    }
});

router.delete('/departments/:id', isAdmin, async (req, res) => {
    try {
        const deptId = req.params.id;

        // 1. Find all Batches in this Department
        const batches = await Batch.find({ dept_id: deptId });
        const batchIds = batches.map(b => b._id);

        // 2. Find all Students in this Department
        const students = await Student.find({ dept_id: deptId });
        const studentRolls = students.map(s => s.roll_no);

        // 3. Find all Subjects in this Department
        const subjects = await Subject.find({ dept_id: deptId });
        const subjectIds = subjects.map(s => s._id);

        // --- Cascading Deletions (Sequential for compatibility) ---

        // Delete Students' associated data
        await Attendance.deleteMany({ student_roll: { $in: studentRolls } });
        await Reward.deleteMany({ student_roll: { $in: studentRolls } });
        await Marks.deleteMany({ student_roll: { $in: studentRolls } });
        await AdaptabilityHistory.deleteMany({ student_roll: { $in: studentRolls } });
        await MentoringNote.deleteMany({ student_roll: { $in: studentRolls } });

        // Delete Students
        await Student.deleteMany({ dept_id: deptId });

        // Delete Evaluation Runs associated with Batches
        await EvaluationRun.deleteMany({ batch_id: { $in: batchIds } });

        // Delete Faculty Mappings linked to Department, Batches, or Subjects
        await FacultySubject.deleteMany({
            $or: [
                { dept_id: deptId },
                { batch_id: { $in: batchIds } },
                { subject_id: { $in: subjectIds } }
            ]
        });

        // Delete Subjects
        await Subject.deleteMany({ dept_id: deptId });

        // Delete Batches
        await Batch.deleteMany({ dept_id: deptId });

        // Finally, delete the Department
        const deletedDept = await Department.findByIdAndDelete(deptId);

        if (!deletedDept) {
            return res.status(404).json({ message: 'Department not found' });
        }

        res.json({ message: 'Department and all associated data (batches, students, subjects, mappings) deleted successfully' });
    } catch (error) {
        console.error('[Admin] Cascading Department Delete Error:', error);
        res.status(500).json({ message: `Error performing cascading delete for department: ${error.message}` });
    }
});

// --- Batches ---
router.get('/batches', isAdmin, async (req, res) => {
    try {
        const batches = await Batch.find().populate('dept_id').lean();

        // Enhance batches with current semester context from mapped students
        const enhancedBatches = await Promise.all(batches.map(async b => {
            // Find most frequent semester for students in this batch
            const students = await Student.find({ batch_id: b._id }).select('semester').lean();
            let currentSem = 1;
            if (students.length > 0) {
                const sems = students.map(s => s.semester);
                currentSem = sems.sort((a, b) =>
                    sems.filter(v => v === a).length - sems.filter(v => v === b).length
                ).pop();
            }

            return {
                id: b._id,
                name: b.name,
                dept_id: b.dept_id ? b.dept_id._id : null,
                dept_name: b.dept_id ? b.dept_id.name : 'Unknown',
                dept_code: b.dept_id ? b.dept_id.code : '???',
                current_semester: b.current_semester || currentSem
            };
        }));

        res.json(enhancedBatches);
    } catch (error) {
        console.error('[Admin] Error fetching batches:', error);
        res.status(500).json({ message: 'Error fetching batches' });
    }
});

router.post('/batches', isAdmin, async (req, res) => {
    const { name, dept_id } = req.body;
    try {
        const batch = new Batch({ name, dept_id });
        await batch.save();
        res.status(201).json(batch);
    } catch (error) {
        res.status(400).json({ message: 'Error creating batch' });
    }
});

router.put('/batches/:id', isAdmin, async (req, res) => {
    const { name, dept_id } = req.body;
    try {
        const batch = await Batch.findByIdAndUpdate(req.params.id, { name, dept_id }, { new: true });
        if (!batch) return res.status(404).json({ message: 'Batch not found' });
        res.json(batch);
    } catch (error) {
        res.status(400).json({ message: 'Error updating batch' });
    }
});

router.delete('/batches/:id', isAdmin, async (req, res) => {
    try {
        const batchId = req.params.id;

        // 1. Find all Students in this Batch
        const students = await Student.find({ batch_id: batchId });
        const studentRolls = students.map(s => s.roll_no);

        // --- Cascading Deletions ---

        // Delete Students' associated data
        await Attendance.deleteMany({ student_roll: { $in: studentRolls } });
        await Reward.deleteMany({ student_roll: { $in: studentRolls } });
        await Marks.deleteMany({ student_roll: { $in: studentRolls } });
        await AdaptabilityHistory.deleteMany({ student_roll: { $in: studentRolls } });
        await MentoringNote.deleteMany({ student_roll: { $in: studentRolls } });

        // Delete Students
        await Student.deleteMany({ batch_id: batchId });

        // Delete Evaluation Runs
        await EvaluationRun.deleteMany({ batch_id: batchId });

        // Revoke Staff Mappings
        await FacultySubject.deleteMany({ batch_id: batchId });

        // Delete the Batch itself
        const deletedBatch = await Batch.findByIdAndDelete(batchId);
        if (!deletedBatch) return res.status(404).json({ message: 'Batch not found' });

        res.json({ message: 'Batch and all associated data (students, marks, mappings) deleted successfully' });
    } catch (error) {
        console.error('[Admin] Cascading Batch Delete Error:', error);
        res.status(500).json({ message: `Error performing cascading delete for batch: ${error.message}` });
    }
});

// --- Subjects ---
router.get('/subjects', isAdmin, async (req, res) => {
    try {
        const { search = '', dept_id = '', semester = '' } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }
        if (dept_id) query.dept_id = dept_id;
        if (semester) query.semester = semester;

        const subjects = await Subject.find(query).populate('dept_id').lean();
        res.json(subjects.map(s => ({
            id: s._id,
            name: s.name,
            code: s.code,
            semester: s.semester,
            dept_id: s.dept_id ? s.dept_id._id : null,
            dept_name: s.dept_id ? s.dept_id.name : 'All Departments'
        })));
    } catch (error) {
        console.error('[Admin] Error fetching subjects:', error);
        res.status(500).json({ message: 'Error fetching subjects' });
    }
});

router.post('/subjects', isAdmin, async (req, res) => {
    const { name, code, dept_id, semester } = req.body;
    try {
        const subject = new Subject({ name, code, dept_id: dept_id || null, semester });
        await subject.save();
        res.status(201).json(subject);
    } catch (error) {
        res.status(400).json({ message: 'Error creating subject' });
    }
});

router.put('/subjects/:id', isAdmin, async (req, res) => {
    const { name, code, dept_id, semester } = req.body;
    try {
        const subject = await Subject.findByIdAndUpdate(req.params.id, { name, code, dept_id: dept_id || null, semester }, { new: true });
        if (!subject) return res.status(404).json({ message: 'Subject not found' });
        res.json(subject);
    } catch (error) {
        console.error('[Admin] Error updating subject:', error);
        res.status(400).json({ message: 'Error updating subject', error: error.message });
    }
});

router.delete('/subjects/:id', isAdmin, async (req, res) => {
    try {
        const subjectId = req.params.id;

        // --- Cascading Deletions ---

        // 1. Remove Student Marks for this subject
        await Marks.deleteMany({ subject_id: subjectId });

        // 2. Revoke Faculty Subject Mappings for this subject
        await FacultySubject.deleteMany({ subject_id: subjectId });

        // 3. Delete the subject itself
        const deletedSubject = await Subject.findByIdAndDelete(subjectId);

        if (!deletedSubject) {
            return res.status(404).json({ message: 'Subject not found' });
        }

        res.json({ message: 'Subject and all associated marks and faculty mappings deleted successfully' });
    } catch (error) {
        console.error('[Admin] Cascading Subject Delete Error:', error);
        res.status(500).json({ message: `Error performing cascading delete for subject: ${error.message}` });
    }
});

// --- Staff Management ---
/**
 * @openapi
 * /api/admin/staff:
 *   get:
 *     summary: Retrieve a paginated list of staff members
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of staff members
 *       401:
 *         description: Unauthorized
 */
router.get('/staff', isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const role = req.query.role || '';
        const dept_id = req.query.dept_id || '';
        const skip = (page - 1) * limit;

        let query = {}; // Include all roles including Admin

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { staff_id: { $regex: search, $options: 'i' } }
            ];
        }

        if (role) {
            query.role = role;
        } else {
            // Globally exclude Admins from staff listings for cleaner UI
            query.role = { $ne: 'Admin' };
        }

        if (dept_id) {
            query.dept_id = dept_id;
        }

        const total = await User.countDocuments(query);
        const staff = await User.find(query)
            .populate('dept_id')
            .skip(skip)
            .limit(limit)
            .lean();

        res.json({
            staff: staff.map(u => ({
                id: u._id,
                name: u.name,
                email: u.email,
                role: u.role,
                staff_id: u.staff_id,
                profile_pic: u.profile_pic,
                dept_id: u.dept_id ? u.dept_id._id : null,
                dept_name: u.dept_id ? u.dept_id.name : null
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ message: 'Error fetching staff', error: error.message });
    }
});

// Update or Create Staff (Upsert Logic)
router.post('/staff', isAdmin, async (req, res) => {
    const { name, email, role, staff_id, dept_id } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            // Update existing user (don't change password)
            user.name = name;
            user.role = role;
            user.staff_id = staff_id;
            if (dept_id) user.dept_id = dept_id;
            await user.save();
        } else {
            // Create new user — randomized temporary password, must set own via OTP
            const otpCode = generateOTP();
            user = new User({
                name,
                email,
                role,
                staff_id,
                dept_id,
                password: Math.random().toString(36).slice(-12), // Randomized temp password
                mustChangePassword: true,
                otp: await hashOTP(otpCode),
                otpExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours for onboarding
            });
            await user.save();

            // Send Onboarding Email
            await sendEmail({
                to: email,
                subject: 'Welcome to SLAA Platform — Account Activation',
                html: `
                    <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:32px;background:#0f1117;color:#fff;border-radius:20px;border:1px solid #ffffff10">
                        <div style="text-align:center;margin-bottom:30px">
                            <div style="display:inline-block;padding:12px;background:#818cf815;border-radius:12px">
                                <span style="font-size:24px;font-weight:900;color:#818cf8;letter-spacing:-1px">SLAA</span>
                            </div>
                        </div>
                        <h2 style="color:#fff;font-size:20px;font-weight:800;margin-bottom:10px">Welcome, ${name}!</h2>
                        <p style="color:#94a3b8;font-size:14px;line-height:1.6">You have been registered as <strong>${role}</strong> on the SLAA Analytics Platform. Use the activation code below to set your password and access your dashboard.</p>
                        
                        <div style="background:#1a1d26;border:1px dashed #818cf840;border-radius:12px;padding:24px;text-align:center;margin:30px 0">
                            <span style="font-size:36px;font-weight:900;letter-spacing:10px;color:#818cf8">${otpCode}</span>
                        </div>

                        <p style="color:#94a3b8;font-size:12px;text-align:center">This activation code is valid for <strong>24 hours</strong>.<br>Please do not share this code with anyone.</p>
                    </div>
                `
            });
        }
        res.status(201).json({ id: user._id, name, email, role, staff_id, dept_id });
    } catch (error) {
        console.error('Error creating/updating staff member:', error);
        res.status(400).json({ message: 'Error managing staff record', error: error.message });
    }
});

router.put('/staff/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, email, role, staff_id, dept_id } = req.body;
    console.log('[API] PUT /staff/:id called with ID:', id);
    console.log('[API] Body payload:', req.body);
    try {
        const updatePayload = { name, email, role, staff_id };

        // Sanitize dept_id: if it's not a valid 24-char hex string, treat it as null/unset
        if (dept_id && dept_id.length === 24) {
            updatePayload.dept_id = dept_id;
        } else {
            // Clear department if empty or invalid
            updatePayload.$unset = { dept_id: 1 };
        }

        const oldUser = await User.findById(id);
        if (!oldUser) {
            return res.status(404).json({ message: `Staff member with ID ${id} not found.` });
        }

        const oldEmail = oldUser.email;
        const user = await User.findByIdAndUpdate(id, updatePayload, { new: true }).populate('dept_id');

        // IF EMAIL CHANGED -> PROPAGATE
        if (email && email !== oldEmail) {
            console.log(`[Sync] Staff email changed from ${oldEmail} to ${email}. Propagating...`);

            // 1. Update Faculty-Subject Mappings
            const mappingResult = await FacultySubject.updateMany(
                { faculty_email: oldEmail },
                { $set: { faculty_email: email } }
            );
            console.log(`[Sync] Updated ${mappingResult.modifiedCount} faculty-subject mappings.`);

            // 2. Update Student Mentorships
            const studentResult = await Student.updateMany(
                { mentor_email: oldEmail },
                { $set: { mentor_email: email } }
            );
            console.log(`[Sync] Updated ${studentResult.modifiedCount} student mentorship records.`);

            // 3. Update Mentoring Notes
            const noteResult = await MentoringNote.updateMany(
                { mentor_email: oldEmail },
                { $set: { mentor_email: email } }
            );
            console.log(`[Sync] Updated ${noteResult.modifiedCount} mentoring notes for the staff member.`);
        }

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            staff_id: user.staff_id,
            dept_id: user.dept_id ? user.dept_id._id : null,
            dept_name: user.dept_id ? user.dept_id.name : null
        });
    } catch (error) {
        console.error('[API] Error updating staff:', error);
        res.status(400).json({ message: 'Error updating staff record', error: error.message });
    }
});

// Manual Password Reset by Admin
router.patch('/staff/:id/reset-password', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: 'Staff member not found' });
        }

        // Reset to default (institutional email)
        user.password = user.email; // Pre-save hook hashes this
        user.mustChangePassword = true;

        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();

        res.json({ message: `Password for ${user.name} has been reset to default.` });
    } catch (error) {
        console.error('[Admin] Reset Error:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});


router.delete('/staff/:id', isAdmin, async (req, res) => {
    try {
        const staffId = req.params.id;
        const staffMember = await User.findById(staffId);
        if (!staffMember) return res.status(404).json({ message: 'Staff not found' });

        // Referential Integrity Guard
        const mappingCount = await FacultySubject.countDocuments({ faculty_email: staffMember.email });
        const studentCount = await Student.countDocuments({ mentor_email: staffMember.email });

        if (mappingCount > 0 || studentCount > 0) {
            return res.status(400).json({
                message: `Cannot delete staff member. They are mapped to ${mappingCount} subjects and assigned as mentor to ${studentCount} students. Reassign these first.`
            });
        }

        await User.findByIdAndDelete(staffId);
        res.json({ message: 'Staff deleted successfully' });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ message: 'Error deleting staff record', error: error.message });
    }
});

// --- Staff-Subject Mappings ---
router.get('/staff-mapping', isAdmin, async (req, res) => {
    try {
        const { dept_id, batch_id, faculty_email, semester } = req.query;
        const query = {};
        if (dept_id) query.dept_id = dept_id;
        if (batch_id) query.batch_id = batch_id;
        if (faculty_email) query.faculty_email = faculty_email;

        if (semester) {
            const subjectsInSem = await Subject.find({ semester }).select('_id');
            query.subject_id = { $in: subjectsInSem.map(s => s._id) };
        }

        const mappings = await FacultySubject.find(query)
            .populate('subject_id')
            .populate({
                path: 'batch_id',
                populate: { path: 'dept_id' }
            })
            .populate('dept_id')
            .lean();

        // We need to fetch faculty names separately since they are in User collection
        // But for now, we have faculty_email in the mapping
        res.json(mappings.map(m => ({
            id: m._id,
            faculty_email: m.faculty_email,
            subject: m.subject_id ? { id: m.subject_id._id, name: m.subject_id.name, code: m.subject_id.code } : null,
            batch: m.batch_id ? {
                id: m.batch_id._id,
                name: m.batch_id.name,
                dept_code: m.batch_id.dept_id ? m.batch_id.dept_id.code : '???'
            } : null,
            dept: m.dept_id ? { id: m.dept_id._id, name: m.dept_id.name } : null
        })));
    } catch (err) {
        res.status(500).json({ message: 'Error fetching mappings' });
    }
});

router.post('/staff-mapping', isAdmin, async (req, res) => {
    const { faculty_email, subject_id, batch_id, dept_id } = req.body;
    try {
        const existing = await FacultySubject.findOne({ faculty_email, subject_id, batch_id });
        if (existing) {
            return res.status(400).json({ message: 'Faculty is already assigned to this subject and batch combination.' });
        }

        // --- NEW MAPPING VALIDATIONS ---
        const batch = await Batch.findById(batch_id);
        if (!batch) {
            return res.status(400).json({ message: 'Selected batch does not exist.' });
        }
        if (batch.dept_id.toString() !== dept_id.toString()) {
            return res.status(400).json({ message: 'Validation Error: Selected batch does not belong to the selected department.' });
        }

        const subject = await Subject.findById(subject_id);
        if (!subject) {
            return res.status(400).json({ message: 'Selected subject does not exist.' });
        }
        // If subject has a dept_id, it MUST match the selected dept_id
        if (subject.dept_id && subject.dept_id.toString() !== dept_id.toString()) {
            return res.status(400).json({ message: 'Validation Error: Selected subject does not belong to the selected department.' });
        }
        // ---------------------------------

        const mapping = new FacultySubject({ faculty_email, subject_id, batch_id, dept_id });
        await mapping.save();
        res.status(201).json(mapping);
    } catch (err) {
        console.error('Error creating mapping:', err);
        res.status(400).json({ message: 'Error creating mapping', error: err.message });
    }
});

router.delete('/staff-mapping/:id', isAdmin, async (req, res) => {
    try {
        const deleted = await FacultySubject.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Mapping not found. It may have already been deleted.' });
        }
        res.json({ message: 'Mapping revoked successfully' });
    } catch (err) {
        console.error('[Admin] Error revoking mapping:', err);
        res.status(500).json({ message: 'Error revoking mapping', error: err.message });
    }
});

// --- Student Management Routes ---

// Get all students with optional filters
router.get('/students', isAdmin, async (req, res) => {
    const { dept_id, batch_id, semester } = req.query;
    let query = {};
    if (dept_id) query.dept_id = dept_id;
    if (batch_id) query.batch_id = batch_id;
    if (semester) query.semester = semester;

    try {
        const students = await Student.find(query).populate('dept_id').populate('batch_id').lean();
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students' });
    }
});

router.post('/students', isAdmin, async (req, res) => {
    const { roll_no, name, email, dept_id, batch_id, semester, mentor_email } = req.body;
    try {
        // Validation: Ensure batch belongs to the department
        if (batch_id && dept_id) {
            const batch = await Batch.findById(batch_id);
            if (batch && batch.dept_id.toString() !== dept_id.toString()) {
                return res.status(400).json({
                    message: 'Validation Error: Selected batch does not belong to the selected department.'
                });
            }
        }

        const student = new Student({ roll_no, name, email, dept_id, batch_id, semester, mentor_email });
        await student.save();
        res.status(201).json(student);
    } catch (error) {
        res.status(400).json({ message: 'Error creating student', error: error.message });
    }
});

router.delete('/students/:id', isAdmin, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.json({ message: 'Student removed successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting student' });
    }
});

router.delete('/students/roll/:roll', isAdmin, async (req, res) => {
    try {
        const roll = req.params.roll;
        const student = await Student.findOne({ roll_no: roll });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Comprehensive Data Purge
        await Promise.all([
            Student.findByIdAndDelete(student._id),
            Marks.deleteMany({ student_roll: roll }),
            Attendance.deleteMany({ student_roll: roll }),
            AdaptabilityHistory.deleteMany({ student_roll: roll }),
            MentoringNote.deleteMany({ student_roll: roll }),
            Reward.deleteMany({ student_roll: roll })
        ]);

        console.log(`[Admin] Purged student ${roll} and all associated data.`);
        res.json({ message: 'Student and all associated data purged successfully' });
    } catch (error) {
        console.error('Error purging student by roll:', error);
        res.status(500).json({ message: 'Error purging student data' });
    }
});

router.put('/students/:id', isAdmin, async (req, res) => {
    const { roll_no, name, email, dept_id, batch_id, semester, mentor_email } = req.body;
    try {
        const oldStudent = await Student.findById(req.params.id);
        if (!oldStudent) return res.status(404).json({ message: 'Student not found' });

        const oldEmail = oldStudent.email;
        const oldRoll = oldStudent.roll_no;

        const student = await Student.findByIdAndUpdate(
            req.params.id,
            { roll_no, name, email, dept_id, batch_id, semester, mentor_email },
            { new: true }
        );

        // IF EMAIL CHANGED -> SYNC AUTH USER
        if (email && email !== oldEmail) {
            console.log(`[Sync] Student email changed from ${oldEmail} to ${email}. Syncing Auth User...`);
            await User.updateMany(
                { email: oldEmail },
                { $set: { email: email, name: name } }
            );
        }

        // IF ROLL NO CHANGED -> PROPAGATE TO ALL DATA RECORDS
        if (roll_no && roll_no !== oldRoll) {
            console.log(`[Sync] Student roll no changed from ${oldRoll} to ${roll_no}. Propagating...`);

            await Promise.all([
                Marks.updateMany({ student_roll: oldRoll }, { $set: { student_roll: roll_no } }),
                Attendance.updateMany({ student_roll: oldRoll }, { $set: { student_roll: roll_no } }),
                AdaptabilityHistory.updateMany({ student_roll: oldRoll }, { $set: { student_roll: roll_no } }),
                MentoringNote.updateMany({ student_roll: oldRoll }, { $set: { student_roll: roll_no } }),
                Reward.updateMany({ student_roll: oldRoll }, { $set: { student_roll: roll_no } })
            ]);
            console.log(`[Sync] Roll number propagation completed across all collections.`);
        }

        // Bust analytics cache for the student's batch so admin sees fresh data immediately
        if (student && student.batch_id) {
            clearAnalyticsCache(student.batch_id.toString());
        }

        res.json(student);
    } catch (error) {
        res.status(400).json({ message: 'Error updating student', error: error.message });
    }
});

router.put('/staff-mapping/:id', isAdmin, async (req, res) => {
    const { faculty_email, subject_id, batch_id, dept_id } = req.body;
    try {
        const mapping = await FacultySubject.findByIdAndUpdate(
            req.params.id,
            { faculty_email, subject_id, batch_id, dept_id },
            { new: true }
        );
        if (!mapping) return res.status(404).json({ message: 'Mapping not found' });
        res.json(mapping);
    } catch (err) {
        res.status(400).json({ message: 'Error updating mapping', error: err.message });
    }
});

// --- Evaluation Cycle ---
router.post('/run-evaluation', isAdmin, async (req, res) => {
    const { batch_id, cycle_name } = req.body;
    if (!batch_id || !cycle_name) {
        return res.status(400).json({ message: 'Batch ID and Cycle Name are required' });
    }
    // 0. Strict ID Validation
    if (!mongoose.Types.ObjectId.isValid(batch_id)) {
        return res.status(400).json({ message: 'Invalid Batch ID format provided.' });
    }

    try {
        console.log(`[Admin] Initiating robust evaluation cycle: ${cycle_name} for batch: ${batch_id}`);

        // 1. Verify Batch Existence
        const batch = await Batch.findById(batch_id).lean();
        if (!batch) {
            return res.status(404).json({ message: `Evaluation aborted: Batch with ID ${batch_id} does not exist.` });
        }

        // 2. Fetch students for the batch
        const students = await Student.find({ batch_id }).populate('dept_id').lean();
        if (students.length === 0) {
            return res.status(404).json({
                message: 'Evaluation aborted: This batch currently has no registered students.',
                phase: 'STUDENT_LOOKUP'
            });
        }

        const studentRolls = students.map(s => s.roll_no);

        // 3. Bulk fetch dependent data for performance
        const [attendanceData, rewardsData, marksData, allHistoryData] = await Promise.all([
            Attendance.find({ student_roll: { $in: studentRolls } }).sort({ _id: -1 }).lean(),
            Reward.find({ student_roll: { $in: studentRolls } }).lean(),
            Marks.find({ student_roll: { $in: studentRolls } }).populate('subject_id').lean(),
            AdaptabilityHistory.find({ student_roll: { $in: studentRolls } }).sort({ evaluation_date: 1 }).lean()
        ]);

        // 4. Transform data for O(1) lookup
        const historyMap = allHistoryData.reduce((acc, h) => {
            if (!acc[h.student_roll]) acc[h.student_roll] = [];
            acc[h.student_roll].push(h);
            return acc;
        }, {});

        // Compute batch-wide reward metrics for normalization
        const rewardTotals = rewardsData.reduce((acc, r) => {
            acc[r.student_roll] = (acc[r.student_roll] || 0) + (r.points || 0);
            return acc;
        }, {});

        const rewardValues = Object.values(rewardTotals);
        const deptAvgRewards = rewardValues.length > 0
            ? rewardValues.reduce((s, v) => s + v, 0) / rewardValues.length
            : 0;

        // 5. Processing Loop with Error Boundaries
        const historyRecords = [];
        let successCount = 0;
        let skipCount = 0;
        const partialFailures = [];
        const skippedDetails = [];

        for (const student of students) {
            try {
                const roll = student.roll_no;
                const sAttData = attendanceData.filter(a => a.student_roll === roll);
                const sMarks = marksData.filter(m => m.student_roll === roll);
                const totalRewards = rewardTotals[roll] || 0;
                const currentSemesterAtt = sAttData.find(a => a.semester === Number(student.semester)) || [...sAttData].sort((a, b) => b.semester - a.semester)[0];
                const lastAttendance = currentSemesterAtt ? currentSemesterAtt.percentage : null;
                const studentHistory = historyMap[roll] || [];

                const adaptability = calculateAdaptability({
                    academic: sMarks,
                    attendance: lastAttendance,
                    rewardPoints: totalRewards,
                    deptAvgRewards: deptAvgRewards,
                    history: historyMap[roll] || []
                });

                // Validation Guard: If the calculation returned a 0 confidence or couldn't process, log it
                if (adaptability.confidence === 0) {
                    skipCount++;
                    skippedDetails.push({
                        roll: student.roll_no,
                        name: student.name,
                        reason: adaptability.breakdown.academic || 'Incomplete Data'
                    });
                    continue;
                }

                historyRecords.push({
                    student_roll: roll,
                    cycle_name: cycle_name,
                    semester: student.semester, // CAPTURE CURRENT SEMESTER
                    academic_score: adaptability.scores.academic,
                    attendance_score: adaptability.scores.attendance,
                    assignment_score: adaptability.scores.assignments,
                    skill_score: adaptability.scores.skills,
                    recovery_score: adaptability.scores.recovery,
                    final_adaptability: Number(adaptability.finalScore),
                    evaluation_date: new Date()
                });
                successCount++;
            } catch (err) {
                console.error(`[Admin] Failed processing student ${student.roll_no}:`, err.message);
                skipCount++;
                skippedDetails.push({
                    roll: student.roll_no,
                    name: student.name,
                    reason: 'Calculation Error'
                });
                partialFailures.push(`${student.roll_no}: ${err.message}`);
            }
        }

        // 6. Bulk Save & Bust the Analytics Cache so the next fetchAnalytics pulls fresh data
        clearAnalyticsCache(batch_id);
        if (historyRecords.length > 0) {
            await AdaptabilityHistory.insertMany(historyRecords, { ordered: false });
        }

        // 7. Log Evaluation Run Audit
        const coveragePercent = students.length > 0 ? (successCount / students.length) * 100 : 0;
        const evaluationRun = new EvaluationRun({
            batch_id,
            cycle_name,
            total_cohort: students.length,
            processed_count: successCount,
            skipped_count: skipCount,
            skipped_details: skippedDetails,
            coverage_percent: coveragePercent
        });
        await evaluationRun.save();

        // 8. Comprehensive Response
        res.json({
            message: `Evaluation cycle '${cycle_name}' completed.`,
            total_cohort: students.length,
            successful: successCount,
            skipped: skipCount,
            skipped_list: skippedDetails,
            warnings: partialFailures.length > 0 ? partialFailures : undefined
        });

    } catch (error) {
        console.error('[Admin] Fatal Evaluation Pipeline Error:', error);
        res.status(500).json({
            message: 'A system-level error occurred during the evaluation pipeline.',
            error: error.message,
            phase: 'CRITICAL_EXECUTION'
        });
    }
});

// --- Untracked / Anomalies ---
router.get('/untracked', isAdmin, async (req, res) => {
    try {
        // Pre-fetch departments and batches for safe manual lookup
        const [allDepts, allBatches] = await Promise.all([
            Department.find().lean(),
            Batch.find().lean()
        ]);
        const deptMap = Object.fromEntries(allDepts.map(d => [d._id.toString(), d.name]));
        const batchMap = Object.fromEntries(allBatches.map(b => [b._id.toString(), b.name]));

        // 1. Unmapped Subjects (Subjects with no faculty mappings)
        const [allSubjects, allMappings] = await Promise.all([
            Subject.find().lean(),
            FacultySubject.find().lean()
        ]);
        const mappedSubjectIds = new Set(allMappings.map(m => m.subject_id.toString()));

        const unmappedSubjects = allSubjects
            .filter(sub => !mappedSubjectIds.has(sub._id.toString()))
            .map(sub => ({
                id: sub._id,
                name: sub.name,
                code: sub.code,
                dept: deptMap[sub.dept_id?.toString()] || 'Common/All'
            }));

        // 2. Untracked Students (Missing Core Data)
        const students = await Student.find().lean();
        const studentRolls = students.map(s => s.roll_no);

        const [attendanceRecs, marksRecs] = await Promise.all([
            Attendance.find({ student_roll: { $in: studentRolls } }).lean(),
            Marks.find({ student_roll: { $in: studentRolls } }).lean()
        ]);

        const attMap = attendanceRecs.reduce((acc, a) => {
            if (!acc[a.student_roll]) acc[a.student_roll] = [];
            acc[a.student_roll].push(a);
            return acc;
        }, {});

        const marksMap = marksRecs.reduce((acc, m) => {
            if (!acc[m.student_roll]) acc[m.student_roll] = [];
            acc[m.student_roll].push(m);
            return acc;
        }, {});

        const untrackedStudents = [];

        students.forEach(student => {
            const issues = [];
            if (!student.mentor_email || student.mentor_email.trim() === '') issues.push('No Mentor Assigned');

            const studentAtt = attMap[student.roll_no] || [];
            const currentAtt = studentAtt.find(a => a.semester === Number(student.semester));
            if (!currentAtt) issues.push('Missing Current Sem Attendance');
            else if (currentAtt.percentage === 0) issues.push('0% Attendance Logged');

            const studentMarks = marksMap[student.roll_no] || [];
            if (studentMarks.length === 0) issues.push('No Academic Marks Logged');

            if (issues.length > 0) {
                untrackedStudents.push({
                    roll: student.roll_no,
                    name: student.name,
                    dept: deptMap[student.dept_id?.toString()] || 'Unknown',
                    batch: batchMap[student.batch_id?.toString()] || 'Unknown',
                    semester: student.semester || 1,
                    issues
                });
            }
        });

        res.json({
            unmapped_subjects: unmappedSubjects,
            untracked_students: untrackedStudents
        });

    } catch (error) {
        console.error('[Admin] Untracked Analytics Error:', error);
        res.status(500).json({ message: 'Error fetching untracked data anomalies' });
    }
});

// --- Advanced Analytics ---
router.get('/analytics/:batch_id', isAdmin, async (req, res) => {
    const { batch_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(batch_id)) {
        return res.status(400).json({ message: 'Invalid Batch ID format' });
    }

    // 1. Check Cache
    const cached = getCachedAnalytics(batch_id);
    if (cached) return res.json(cached);

    try {
        const students = await Student.find({ batch_id }).populate('dept_id', 'name').populate('batch_id', 'name').lean();

        if (students.length === 0) {
            return res.json({
                summary: { total: 0, evaluated: 0, missing: 0, coverage_percent: 0, critical_risk_count: 0 },
                distribution: { high: 0, stable: 0, warning: 0, critical: 0 },
                priority_students: [],
                top_improvers: [],
                trends: [],
                insights: [],
                last_evaluation: null,
                skipped_students: []
            });
        }

        const studentRolls = students.map(s => s.roll_no);

        const [lastRun, allHistory] = await Promise.all([
            EvaluationRun.findOne({ batch_id }).sort({ timestamp: -1 }).lean(),
            AdaptabilityHistory.find({
                student_roll: { $in: studentRolls }
            }).sort({ evaluation_date: 1 }).lean()
        ]);

        // 3. Process History Map
        const studentHistoryMap = allHistory.reduce((acc, h) => {
            if (!acc[h.student_roll]) acc[h.student_roll] = [];
            acc[h.student_roll].push(h);
            return acc;
        }, {});

        const distribution = { high: 0, stable: 0, warning: 0, critical: 0 };
        const priorityList = [];
        const improversList = [];
        const unassignedStudents = [];
        let criticalCount = 0;
        let evaluatedCount = 0;
        let totalScoreSum = 0;
        let unassignedCount = 0;

        students.forEach(student => {
            // Mentor Assignment Tracking
            if (!student.mentor_email || student.mentor_email.trim() === "") {
                unassignedCount++;
                unassignedStudents.push({
                    roll: student.roll_no,
                    name: student.name
                });
            }

            // Filter history to ONLY include records from the student's CURRENT semester.
            // Fall back to all history for this student if no semester-specific records exist
            // (handles data imported before the semester field was added).
            let history = (studentHistoryMap[student.roll_no] || []).filter(h => h.semester === Number(student.semester));
            if (history.length === 0) {
                // Fallback: use ALL records sorted by evaluation_date ascending
                history = (studentHistoryMap[student.roll_no] || []);
            }
            if (history.length > 0) {
                evaluatedCount++;
                const current = history[history.length - 1]; // Latest record for THIS semester
                const score = current.final_adaptability;
                totalScoreSum += score;

                // Threshold Logic
                let category = 'stable';
                if (score >= 80) { category = 'high'; distribution.high++; }
                else if (score >= 60) { category = 'stable'; distribution.stable++; }
                else if (score >= 40) { category = 'warning'; distribution.warning++; }
                else if (score > 0) { category = 'critical'; distribution.critical++; criticalCount++; }
                else {
                    // Score is exactly 0 or null — likely missing/insufficient data record
                    category = 'warning';
                    distribution.warning++;
                }

                // Trend Calculation
                let trend = 0;
                if (history.length > 1) {
                    trend = score - history[history.length - 2].final_adaptability;
                }

                // Priority Score: (100 - score) + (abs(negative_trend) * 1.5)
                const negTrendFactor = trend < 0 ? Math.abs(trend) * 1.5 : 0;
                const priorityScore = (100 - score) + negTrendFactor;

                const factors = [];
                if (score < 40 && score > 0) factors.push("Critical Risk");
                else if (score < 60 && score > 0) factors.push("Needs Attention");

                if (trend < -5) factors.push("Academic Drop");

                // Only tag if score is non-null and genuinely low (missing = null in AdaptabilityHistory)
                if (current.attendance_score !== null && current.attendance_score < 75) factors.push("Low Attendance");
                if (current.academic_score !== null && current.academic_score < 50) factors.push("Low Marks");

                if (score === 0 || score === null) factors.push("Awaiting Data");

                const studentData = {
                    roll: student.roll_no,
                    name: student.name,
                    profile_pic: student.profile_pic,
                    dept: student.dept_id ? student.dept_id.name : 'N/A',
                    batch: student.batch_id ? student.batch_id.name : 'N/A',
                    semester: student.semester || 'N/A',
                    score: score.toFixed(1),
                    trend: trend.toFixed(1),
                    category,
                    priority_score: priorityScore,
                    factors: factors.length > 0 ? factors : ["Stable"]
                };

                priorityList.push(studentData);
                if (trend > 0) improversList.push(studentData);
            }
        });

        // Sort Lists
        priorityList.sort((a, b) => b.priority_score - a.priority_score);
        improversList.sort((a, b) => b.trend - a.trend);

        // 5. Aggregate Trends by Cycle (allHistory is sorted ASC by evaluation_date)
        const cycleMap = allHistory.reduce((acc, h) => {
            if (!acc[h.cycle_name]) acc[h.cycle_name] = { sum: 0, count: 0, timestamp: h.evaluation_date };
            acc[h.cycle_name].sum += h.final_adaptability;
            acc[h.cycle_name].count++;
            return acc;
        }, {});

        // Sort cycles chronologically by the earliest record in each cycle
        const trends = Object.keys(cycleMap)
            .sort((a, b) => new Date(cycleMap[a].timestamp) - new Date(cycleMap[b].timestamp))
            .map(cycle => ({
                cycle,
                avg_score: (cycleMap[cycle].sum / cycleMap[cycle].count).toFixed(1),
                student_count: cycleMap[cycle].count
            }));

        // 6. Generate Rule-Based Insights
        const insights = [];
        const avgScore = evaluatedCount > 0 ? (totalScoreSum / evaluatedCount) : 0;

        if (criticalCount > (students.length * 0.1)) {
            insights.push({ message: "High cohort vulnerability: Over 10% students in critical risk.", severity: "critical" });
        }

        if (unassignedCount > 0) {
            insights.push({
                message: `Mentorship Gap: ${unassignedCount} students are not assigned to any mentor.`,
                severity: "warning"
            });
        }

        if (trends.length > 1) {
            const lastAvg = parseFloat(trends[trends.length - 1].avg_score);
            const prevAvg = parseFloat(trends[trends.length - 2].avg_score);
            if (lastAvg < prevAvg - 5) {
                insights.push({ message: `Performance regression detected: Score dropped by ${(prevAvg - lastAvg).toFixed(1)} pts since last cycle.`, severity: "warning" });
            } else if (lastAvg > prevAvg + 5) {
                insights.push({ message: "Significant performance growth detected in this cycle!", severity: "info" });
            }
        }

        // 7. Final Payload
        const analyticsData = {
            summary: {
                total: students.length,
                evaluated: evaluatedCount,
                missing: students.length - evaluatedCount,
                coverage_percent: students.length > 0 ? ((evaluatedCount / students.length) * 100).toFixed(1) : 0,
                critical_risk_count: criticalCount,
                avg_score: avgScore.toFixed(1),
                unassigned_mentors_count: unassignedCount
            },
            distribution,
            priority_students: priorityList.slice(0, 50),
            top_improvers: improversList.slice(0, 20),
            trends,
            insights,
            last_evaluation: lastRun ? {
                cycle: lastRun.cycle_name,
                timestamp: lastRun.timestamp,
                processed: lastRun.processed_count,
                skipped: lastRun.skipped_count,
                coverage: lastRun.coverage_percent.toFixed(1)
            } : null,
            skipped_students: lastRun ? lastRun.skipped_details : [],
            unassigned_students: unassignedStudents
        };

        setAnalyticsCache(batch_id, analyticsData);
        res.json(analyticsData);

    } catch (error) {
        console.error('[Admin] Analytics Error:', error);
        res.status(500).json({ message: 'Error generating analytics' });
    }
});

// --- Profile Picture Management ---

// Upload/Change Profile Picture
router.put('/users/:id/photo', isAdmin, upload.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) {
            return res.status(400).json({ message: 'No image provided' });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Delete old image from Cloudinary if it exists
        if (user.profile_pic_id) {
            await cloudinary.uploader.destroy(user.profile_pic_id);
        }

        // Update User Model
        user.profile_pic = req.file.path;
        user.profile_pic_id = req.file.filename;
        await user.save();

        // If user is a Student, sync to Student model too
        if (user.role === 'Student') {
            await Student.findOneAndUpdate(
                { email: user.email },
                { profile_pic: req.file.path, profile_pic_id: req.file.filename }
            );
        }

        res.json({
            message: 'Profile picture updated',
            profile_pic: user.profile_pic
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
});

// Remove Profile Picture
router.delete('/users/:id/photo', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.profile_pic_id) {
            await cloudinary.uploader.destroy(user.profile_pic_id);
        }

        user.profile_pic = null;
        user.profile_pic_id = null;
        await user.save();

        // Sync to Student model
        if (user.role === 'Student') {
            await Student.findOneAndUpdate(
                { email: user.email },
                { profile_pic: null, profile_pic_id: null }
            );
        }

        res.json({ message: 'Profile picture removed' });
    } catch (error) {
        console.error('Removal Error:', error);
        res.status(500).json({ message: 'Failed to remove photo' });
    }
});

module.exports = router;
