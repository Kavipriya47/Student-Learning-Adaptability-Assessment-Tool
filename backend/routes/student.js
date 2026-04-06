const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Reward = require('../models/Reward');
const AdaptabilityHistory = require('../models/AdaptabilityHistory');
const Marks = require('../models/Marks');
const MentoringNote = require('../models/MentoringNote');
const { authenticateJWT } = require('../middleware/auth');
const isStudent = (req, res, next) => {
    authenticateJWT(req, res, () => {
        if (req.user.role === 'Student') return next();
        res.status(403).json({ message: 'Access denied' });
    });
};

const { calculateAdaptability } = require('../utils/adaptability');

// Get personal dashboard data
router.get('/dashboard', isStudent, async (req, res) => {
    const roll_no = req.user.roll_no;

    try {
        const student = await Student.findOne({ roll_no })
            .populate('dept_id')
            .populate('batch_id')
            .lean();

        let mentor_name = null;
        if (student.mentor_email) {
            const mentor = await User.findOne({ email: student.mentor_email }).lean();
            if (mentor) mentor_name = mentor.name;
        }

        let attendance = await Attendance.findOne({ student_roll: roll_no, semester: student.semester }).lean();
        if (!attendance) {
            attendance = await Attendance.findOne({ student_roll: roll_no }).sort({ semester: -1 }).lean();
        }

        const rewardsData = await Reward.aggregate([
            { $match: { student_roll: roll_no } },
            { $group: { _id: null, total: { $sum: '$points' } } }
        ]);
        const rewardPoints = rewardsData.length > 0 ? rewardsData[0].total : 0;

        // Dept average
        const deptStudents = await Student.find({ dept_id: student.dept_id }).select('roll_no').lean();
        const deptRolls = deptStudents.map(s => s.roll_no);
        const deptRewardsData = await Reward.aggregate([
            { $match: { student_roll: { $in: deptRolls } } },
            { $group: { _id: '$student_roll', total_points: { $sum: '$points' } } },
            { $group: { _id: null, avg_rewards: { $avg: '$total_points' } } }
        ]);
        const deptAvgRewards = deptRewardsData.length > 0 ? deptRewardsData[0].avg_rewards : 0;

        const history = await AdaptabilityHistory.find({ student_roll: roll_no }).sort({ evaluation_date: -1 }).limit(5).lean();

        const mentoringNotes = await MentoringNote.find({ student_roll: roll_no })
            .sort({ created_at: -1 })
            .limit(3)
            .lean();

        const marks = await Marks.find({ student_roll: roll_no }).populate('subject_id').lean();
        const formattedMarks = marks.map(m => ({
            pt1: m.pt1,
            pt2: m.pt2,
            assignment: m.assignment,
            semester_grade: m.semester_grade,
            subject_name: m.subject_id ? m.subject_id.name : 'Unknown'
        }));

        // Core Adaptability Calculation
        const adaptability = calculateAdaptability({
            academic: formattedMarks,
            attendance: attendance ? attendance.percentage : null,
            rewardPoints: rewardPoints,
            deptAvgRewards: deptAvgRewards,
            history: history
        });

        res.json({
            student: {
                ...student,
                dept_name: student.dept_id ? student.dept_id.name : null,
                batch_name: student.batch_id ? student.batch_id.name : null,
                mentor_name
            },
            analytics: adaptability.scores,
            breakdown: adaptability.breakdown,
            finalScore: adaptability.finalScore,
            confidence: adaptability.confidence,
            isComplete: adaptability.isComplete,
            marks: formattedMarks,
            // history sorted oldest-first for chart rendering
            history: [...history].reverse().map(h => ({
                date: h.evaluation_date,
                score: h.final_adaptability,
                academic_score: h.academic_score
            })),
            reward_stats: {
                total: rewardPoints,
                dept_avg: deptAvgRewards
            },
            mentor_instructions: mentoringNotes.map(n => ({
                text: n.note,
                type: n.type || 'Instruction',
                date: n.created_at
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

module.exports = router;
