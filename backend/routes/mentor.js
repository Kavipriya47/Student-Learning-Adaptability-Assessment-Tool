const express = require('express');
const router = express.Router();
const { calculateAdaptability } = require('../utils/adaptability');
const { clearAnalyticsCache } = require('../utils/cache');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Reward = require('../models/Reward');
const Marks = require('../models/Marks');
const MentoringNote = require('../models/MentoringNote');
const AdaptabilityHistory = require('../models/AdaptabilityHistory');
const Department = require('../models/Department');
const Batch = require('../models/Batch');
const Subject = require('../models/Subject');
const { isMentorOrAdmin } = require('../middleware/auth');
const User = require('../models/User');

// --- Mentor Routes ---
router.use((req, res, next) => {
    console.log(`[Mentor-Audit] ${req.method} ${req.originalUrl} | User: ${req.user?.email} | Body:`, JSON.stringify(req.body));
    next();
});
// Get students under mentor with optional filters
router.get('/my-students', isMentorOrAdmin, async (req, res) => {
    const { dept_id, batch_id } = req.query;

    let queryArgs = { mentor_email: req.user.email };
    if (dept_id) queryArgs.dept_id = dept_id;
    if (batch_id) queryArgs.batch_id = batch_id;

    try {
        const students = await Student.find(queryArgs)
            .populate('dept_id')
            .populate('batch_id')
            .lean();

        const studentRolls = students.map(s => s.roll_no);

        // Instead of basic averages, we run the full adaptability calculation for each student
        // Note: For a production system at massive scale, this aggregation would be done via nightly cron jobs into a materialized view. 
        // For accurate real-time mentoring, we calculate it dynamically here.

        const attendanceData = await Attendance.find({ student_roll: { $in: studentRolls } }).sort({ _id: -1 }).lean();
        const rewardsData = await Reward.find({ student_roll: { $in: studentRolls } }).lean();
        const marksData = await Marks.find({ student_roll: { $in: studentRolls } }).populate('subject_id').lean();

        // Compute dept+batch average reward points for each unique dept+batch combination
        const deptBatchAvgMap = {};
        const uniqueDeptBatch = [...new Set(students.map(s => `${s.dept_id?._id}_${s.batch_id?._id}`))];
        await Promise.all(uniqueDeptBatch.map(async (key) => {
            const [deptId, batchId] = key.split('_');
            const groupRolls = students
                .filter(s => String(s.dept_id?._id) === deptId && String(s.batch_id?._id) === batchId)
                .map(s => s.roll_no);
            const agg = await Reward.aggregate([
                { $match: { student_roll: { $in: groupRolls } } },
                { $group: { _id: '$student_roll', total: { $sum: '$points' } } },
                { $group: { _id: null, avg: { $avg: '$total' } } }
            ]);
            deptBatchAvgMap[key] = agg.length > 0 ? agg[0].avg : 0;
        }));

        const formattedStudents = students.map(s => {
            const roll = s.roll_no;
            const sAttData = attendanceData.filter(a => a.student_roll === roll);
            const sRewards = rewardsData.filter(r => r.student_roll === roll);
            const sMarks = marksData.filter(m => m.student_roll === roll);

            const totalRewards = sRewards.reduce((acc, curr) => acc + (curr.points || 0), 0);

            // Find attendance for the student's CURRENT semester, or fallback to their most recent available attendance
            const currentSemesterAtt = sAttData.find(a => a.semester === Number(s.semester)) || [...sAttData].sort((a, b) => b.semester - a.semester)[0];
            const lastAttendance = currentSemesterAtt ? currentSemesterAtt.percentage : null;
            const deptBatchKey = `${s.dept_id?._id}_${s.batch_id?._id}`;
            const deptAvg = deptBatchAvgMap[deptBatchKey] ?? 0;

            // Calculate core metrics
            const adaptability = calculateAdaptability({
                academic: sMarks,
                attendance: lastAttendance,
                rewardPoints: totalRewards,
                deptAvgRewards: deptAvg,
                history: [] // history not fetched in list view for performance
            });

            // MULTI-FACTOR RISK LOGIC
            let riskFactors = 0;
            const reasons = [];

            // 1. AcademicScore < 60
            if (adaptability.scores.academic !== null && adaptability.scores.academic < 60) {
                riskFactors++;
                reasons.push("Academic Score < 60");
            }

            // 2. Attendance < 75
            if (lastAttendance !== null) {
                if (lastAttendance < 75) {
                    riskFactors++;
                    reasons.push("Attendance < 75%");
                }
            } else {
                // Missing attendance is flagged for mentor oversight, but weighted less if not strictly a "failure"
                riskFactors += 0.5;
                reasons.push("Attendance Data Pending (Oversight Required)");
            }

            // 3. >= 2 subjects have grade <= C
            let lowGradeCount = 0;
            sMarks.forEach(m => {
                if (m.semester_grade === 'D' || m.semester_grade === 'U' || (m.pt1 !== undefined && m.pt1 < 25)) lowGradeCount++;
            });
            if (lowGradeCount >= 2) {
                riskFactors++;
                reasons.push("Multiple Poor Grades");
            }

            // 4. Assignment Score < 50
            if (adaptability.scores.assignments !== null && adaptability.scores.assignments < 50) {
                riskFactors++;
                reasons.push("Assignment Score < 50");
            }

            // 5. Data Sparsity Risk
            // If any independent metric is missing (confidence < 100) or academic data is missing
            if (adaptability.confidence < 100 || adaptability.scores.academic === null) {
                riskFactors++;
                if (adaptability.scores.academic === null) reasons.push("Missing Academic Performance Data");
                else reasons.push("Incomplete Profile (Partial Data)");
            }

            // 6. Overall Performance Risk (Catch-all for low final score)
            if (adaptability.finalScore !== null && Number(adaptability.finalScore) < 60 && Number(adaptability.finalScore) > 0) {
                riskFactors += 1.5;
                reasons.push(`Low Overall Adaptability (${adaptability.finalScore})`);
            }

            // Priority Grouping
            let risk_priority = 'Stable';
            if (riskFactors >= 2) risk_priority = 'Critical Risk';
            else if (riskFactors >= 0.5) risk_priority = 'Moderate Risk';
            // Safety Catch: Even if 0 factors, if confidence is very low, force Moderate to ensure visibility
            else if (adaptability.confidence < 50) risk_priority = 'Moderate Risk';

            return {
                roll_no: s.roll_no,
                name: s.name,
                profile_pic: s.profile_pic,
                email: s.email,
                dept_name: s.dept_id ? s.dept_id.name : 'Unknown',
                batch_name: s.batch_id ? s.batch_id.name : 'Unknown',
                intervention_status: s.intervention_status || 'No Action Needed',
                risk_priority,
                risk_factors: reasons,
                adaptability_score: adaptability.finalScore, // string like "77.3"
                confidence: adaptability.confidence,
                avg_attendance: lastAttendance // keep null for proper N/A display
            };
        });

        console.log('[DEBUG] mentor/my-students return payload length:', formattedStudents.length);
        console.log('[DEBUG] First student sample:', formattedStudents.length > 0 ? {
            name: formattedStudents[0].name,
            risk_priority: formattedStudents[0].risk_priority,
            keys: Object.keys(formattedStudents[0])
        } : 'empty');

        res.json(formattedStudents);
    } catch (error) {
        console.error('[DEBUG] Error in /my-students:', error);
        res.status(500).json({ message: 'Error fetching mentor students' });
    }
});



// Get detailed student adaptability
router.get('/student-detail/:roll_no', isMentorOrAdmin, async (req, res) => {
    const { roll_no } = req.params;

    try {
        const student = await Student.findOne({ roll_no })
            .populate('dept_id')
            .populate('batch_id')
            .lean();

        if (!student) return res.status(404).json({ message: 'Student not found' });

        let mentor_name = null;
        if (student.mentor_email) {
            const mentor = await User.findOne({ email: student.mentor_email }).lean();
            if (mentor) mentor_name = mentor.name;
        }

        const [attendance, rewards, marksData, notes, history] = await Promise.all([
            Attendance.find({ student_roll: roll_no }).sort({ _id: -1 }).lean(),
            Reward.find({ student_roll: roll_no }).lean(),
            Marks.find({ student_roll: roll_no }).populate('subject_id').lean(),
            MentoringNote.find({ student_roll: roll_no }).sort({ created_at: -1 }).lean(),
            AdaptabilityHistory.find({ student_roll: roll_no }).sort({ evaluation_date: 1 }).lean()
        ]);

        const marks = marksData.map(m => ({
            ...m,
            subject_name: m.subject_id ? m.subject_id.name : 'Unknown'
        }));

        // Core Adaptability Calculation
        const totalRewards = rewards.reduce((acc, curr) => acc + (curr.points || 0), 0);

        // Find attendance for the student's CURRENT semester, or fallback to their most recent available attendance
        const currentSemesterAtt = attendance.find(a => a.semester === Number(student.semester)) || [...attendance].sort((a, b) => b.semester - a.semester)[0];
        const lastAttendance = currentSemesterAtt ? currentSemesterAtt.percentage : null;

        // Compute dept+batch average reward points for this student's group
        const deptStudents = await Student.find({
            dept_id: student.dept_id,
            batch_id: student.batch_id
        }).select('roll_no').lean();
        const deptRolls = deptStudents.map(s => s.roll_no);
        const deptRewardAgg = await Reward.aggregate([
            { $match: { student_roll: { $in: deptRolls } } },
            { $group: { _id: '$student_roll', total: { $sum: '$points' } } },
            { $group: { _id: null, avg: { $avg: '$total' } } }
        ]);
        const deptAvgRewards = deptRewardAgg.length > 0 ? deptRewardAgg[0].avg : 0;

        const adaptability = calculateAdaptability({
            academic: marks,
            attendance: lastAttendance,
            rewardPoints: totalRewards,
            deptAvgRewards: deptAvgRewards,
            history: history
        });

        // Find associated User to get userId for photo management
        const associatedUser = await User.findOne({ email: student.email }).select('_id').lean();

        res.json({
            student: {
                ...student,
                dept_name: student.dept_id ? student.dept_id.name : 'Unknown',
                batch_name: student.batch_id ? student.batch_id.name : 'Unknown',
                mentor_name,
                userId: associatedUser ? associatedUser._id : null
            },
            attendance,
            rewards,
            marks,
            notes,
            // Return history oldest-first for chart rendering
            history: history.map(h => ({
                date: new Date(h.evaluation_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
                score: h.final_adaptability,
                academic_score: h.academic_score
            })),
            adaptability: {
                scores: adaptability.scores,
                breakdown: adaptability.breakdown,
                finalScore: adaptability.finalScore,
                confidence: adaptability.confidence,
                isComplete: adaptability.isComplete
            },
            reward_stats: {
                total: totalRewards,
                dept_avg: deptAvgRewards
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student detail' });
    }
});

router.post('/add-note', isMentorOrAdmin, async (req, res) => {
    const { student_roll, note, type } = req.body;
    try {
        await MentoringNote.create({
            student_roll,
            mentor_email: req.user.email,
            note,
            type
        });
        res.json({ message: 'Note added successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error adding note' });
    }
});

// Update intervention status
router.post('/intervention', isMentorOrAdmin, async (req, res) => {
    const { student_roll, status } = req.body;
    try {
        const student = await Student.findOne({ roll_no: student_roll, mentor_email: req.user.email });
        if (!student) return res.status(404).json({ message: 'Student not found or not assigned to you' });

        student.intervention_status = status;
        await student.save();

        res.json({ message: 'Intervention status updated successfully', status: student.intervention_status });
    } catch (error) {
        res.status(500).json({ message: 'Error updating intervention status' });
    }
});

// Update student attendance (Manual Lookup/Edit)
router.post('/update-attendance', isMentorOrAdmin, async (req, res) => {
    const { student_roll, semester, percentage } = req.body;

    if (percentage === undefined || isNaN(percentage) || percentage < 0 || percentage > 100) {
        return res.status(400).json({ message: 'Invalid attendance percentage. Must be between 0-100.' });
    }

    if (!semester) {
        return res.status(400).json({ message: 'Semester is required for attendance records.' });
    }

    try {
        // Verify student belongs to this mentor (or user is admin)
        if (req.user.role !== 'Admin') {
            const student = await Student.findOne({ roll_no: student_roll, mentor_email: req.user.email });
            if (!student) {
                return res.status(403).json({ message: 'Access Denied: Student not assigned to your mentoring cohort.' });
            }
        } else {
            // Admin can update any student
            const studentExists = await Student.findOne({ roll_no: student_roll });
            if (!studentExists) {
                return res.status(404).json({ message: 'Student not found in system.' });
            }
        }

        const attendance = await Attendance.findOneAndUpdate(
            { student_roll, semester: Number(semester) },
            {
                percentage: Number(percentage),
                updated_by: req.user.email,
                updated_at: Date.now()
            },
            { upsert: true, new: true, runValidators: true }
        );

        // Bust analytics cache
        const studentObj = await Student.findOne({ roll_no: student_roll }).select('batch_id').lean();
        if (studentObj && studentObj.batch_id) {
            clearAnalyticsCache(studentObj.batch_id.toString());
        }

        res.json({
            message: 'Attendance profile updated successfully.',
            record: attendance
        });
    } catch (error) {
        console.error('[Mentor] Attendance Update Error:', error);
        res.status(500).json({ message: 'A system error occurred while updating attendance.', error: error.message });
    }
});

// Update student marks (Manual Edit)
router.post('/update-marks', isMentorOrAdmin, async (req, res) => {
    const { student_roll, subject_id, pt1, pt2, assignment, semester_grade } = req.body;

    try {
        if (req.user.role !== 'Admin') {
            const student = await Student.findOne({ roll_no: student_roll, mentor_email: req.user.email });
            if (!student) return res.status(403).json({ message: 'Access Denied: Student not in your cohort.' });
        }

        const updateData = { updated_by: req.user.email, updated_at: Date.now() };
        if (pt1 !== undefined) updateData.pt1 = pt1 === '' ? null : Number(pt1);
        if (pt2 !== undefined) updateData.pt2 = pt2 === '' ? null : Number(pt2);
        if (assignment !== undefined) updateData.assignment = assignment === '' ? null : Number(assignment);
        if (semester_grade !== undefined) updateData.semester_grade = semester_grade;

        const mark = await Marks.findOneAndUpdate(
            { student_roll, subject_id },
            { $set: updateData },
            { upsert: true, new: true }
        );

        // Bust analytics cache
        const studentObj = await Student.findOne({ roll_no: student_roll }).select('batch_id').lean();
        if (studentObj && studentObj.batch_id) {
            clearAnalyticsCache(studentObj.batch_id.toString());
        }

        res.json({ message: 'Academic marks updated successfully.', record: mark });
    } catch (error) {
        console.error('[Mentor] Marks Update Error:', error);
        res.status(500).json({ message: 'Error updating marks record.', error: error.message });
    }
});

// Update student rewards/badges
router.post('/update-rewards', isMentorOrAdmin, async (req, res) => {
    const { student_roll, points, category, reward_id } = req.body;

    try {
        if (req.user.role !== 'Admin') {
            const student = await Student.findOne({ roll_no: student_roll, mentor_email: req.user.email });
            if (!student) return res.status(403).json({ message: 'Access Denied: Student not in your cohort.' });
        }

        let reward;
        const mongoose = require('mongoose');
        if (reward_id && mongoose.Types.ObjectId.isValid(reward_id)) {
            // Edit existing
            reward = await Reward.findByIdAndUpdate(
                reward_id,
                { points: Number(points), category, updated_at: Date.now() },
                { new: true }
            );
        } else if (reward_id) {
            // Provided an ID but it's invalid
            return res.status(400).json({ message: 'Invalid reward ID format.' });
        } else {
            // Add new
            reward = new Reward({
                student_roll,
                points: Number(points),
                category,
                updated_at: Date.now()
            });
            await reward.save();
        }

        res.json({ message: 'Behavioral reward/badge updated.', record: reward });
    } catch (error) {
        console.error('[Mentor] Reward Update Error:', error);
        res.status(500).json({ message: 'Error updating reward record.', error: error.message });
    }
});

// Update basic student details
router.post('/update-student-basic', isMentorOrAdmin, async (req, res) => {
    const { student_roll, name, semester, mentor_email } = req.body;

    try {
        if (req.user.role !== 'Admin') {
            const student = await Student.findOne({ roll_no: student_roll, mentor_email: req.user.email });
            if (!student) return res.status(403).json({ message: 'Access Denied: Student not in your cohort.' });
        }

        const updatedStudent = await Student.findOneAndUpdate(
            { roll_no: student_roll },
            { name, semester: Number(semester), mentor_email },
            { new: true }
        );

        res.json({ message: 'Student profile details updated.', student: updatedStudent });
    } catch (error) {
        res.status(500).json({ message: 'Error updating student record.' });
    }
});

// Delete a student mark record (Academic Score)
router.delete('/marks/:id', isMentorOrAdmin, async (req, res) => {
    try {
        const mark = await Marks.findById(req.params.id);
        if (!mark) return res.status(404).json({ message: 'Mark record not found' });

        if (req.user.role !== 'Admin') {
            const student = await Student.findOne({ roll_no: mark.student_roll, mentor_email: req.user.email });
            if (!student) return res.status(403).json({ message: 'Access Denied: Student not in your cohort.' });
        }

        await Marks.findByIdAndDelete(req.params.id);
        res.json({ message: 'Academic mark record deleted successfully' });
    } catch (error) {
        console.error('Error deleting marks:', error);
        res.status(500).json({ message: 'Error deleting academic marks' });
    }
});

// Delete a reward/badge
router.delete('/reward/:id', isMentorOrAdmin, async (req, res) => {
    try {
        const reward = await Reward.findById(req.params.id);
        if (!reward) return res.status(404).json({ message: 'Reward not found' });

        if (req.user.role !== 'Admin') {
            const student = await Student.findOne({ roll_no: reward.student_roll, mentor_email: req.user.email });
            if (!student) return res.status(403).json({ message: 'Access Denied: Student not in your cohort.' });
        }

        await Reward.findByIdAndDelete(req.params.id);
        res.json({ message: 'Reward deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting reward' });
    }
});

// Delete a mentoring note
router.delete('/note/:id', isMentorOrAdmin, async (req, res) => {
    try {
        const note = await MentoringNote.findById(req.params.id);
        if (!note) return res.status(404).json({ message: 'Note not found' });

        if (req.user.role !== 'Admin' && note.mentor_email !== req.user.email) {
            return res.status(403).json({ message: 'Access Denied: You can only delete your own notes.' });
        }

        await MentoringNote.findByIdAndDelete(req.params.id);
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting note' });
    }
});

// Delete an attendance record
router.delete('/attendance/:id', isMentorOrAdmin, async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

        if (req.user.role !== 'Admin') {
            const student = await Student.findOne({ roll_no: attendance.student_roll, mentor_email: req.user.email });
            if (!student) return res.status(403).json({ message: 'Access Denied: Student not in your cohort.' });
        }

        await Attendance.findByIdAndDelete(req.params.id);
        res.json({ message: 'Attendance record deleted successfully' });
    } catch (error) {
        console.error('Error deleting attendance:', error);
        res.status(500).json({ message: 'Error deleting attendance record' });
    }
});

module.exports = router;
