/**
 * SLAA Finalized Adaptability Score Engine — v2
 * ===============================================
 * Canonical weighted adaptability index.
 *
 * Weights:
 *   Academic Performance  : 30%
 *   Attendance            : 20%
 *   Assignment Score      : 20%
 *   Skill Engagement      : 15%
 *   Recovery Index        : 15%
 *
 * Key design rules (corrections from spec review):
 *
 *   1. Recovery is NULL if AcademicScore is NULL — it cannot be trusted without
 *      a current academic score to diff against.
 *
 *   2. Skill is NULL (not 0) when deptAvgRewards = 0 — avoids unfairly
 *      punishing students in new/unmapped departments.
 *
 *   3. Data Confidence is based on the 4 INDEPENDENT metrics only:
 *      Academic, Assignments, Attendance, Skills → confidence = (present / 4) × 100
 *      Recovery is a derived metric and must NOT inflate confidence.
 *
 *   4. Final score uses DYNAMIC WEIGHT NORMALISATION — weights are re-summed
 *      over available (non-null) metrics, so missing data never arithmetically
 *      drags the score downward.
 *
 *   5. Department average = avg reward points of all students in the SAME
 *      dept+batch, computed externally and passed in via deptAvgRewards.
 */

const GRADE_PERCENT_MAP = {
    S: 95,
    A: 85,
    B: 75,
    C: 65,
    D: 55,
    F: 40,
    U: 30,
};

/**
 * Convert a letter grade to a percentage. Returns null if unknown / missing.
 */
const gradeToPercentage = (grade) => {
    if (!grade) return null;
    return GRADE_PERCENT_MAP[grade.toUpperCase()] ?? null;
};

/** Clamp a value between lo and hi. */
const clamp = (lo, hi, val) => Math.min(hi, Math.max(lo, val));

/** True when a value is usable (not null, undefined, or empty string). */
const hasValue = (v) => v !== null && v !== undefined && v !== '';

/**
 * Main adaptability calculation function.
 *
 * @param {Object}      metrics
 * @param {Array}       metrics.academic        - Mark records per subject.
 *   Each: { pt1, pt2, assignment, semester_grade, subject_name }
 * @param {number|null} metrics.attendance      - Attendance % (0-100).
 * @param {number}      metrics.rewardPoints    - Student's total reward points.
 * @param {number}      metrics.deptAvgRewards  - Dept+batch average reward points.
 * @param {Array}       metrics.history         - AdaptabilityHistory snapshots sorted
 *   ASC by evaluation_date. Each must have `academic_score`.
 *
 * @returns {Object}
 *   .scores        - { academic, attendance, assignments, skills, recovery }
 *   .finalScore    - Dynamically-weighted aggregate string (1 dp)
 *   .confidence    - Data confidence % (0-100, based on 4 independent metrics)
 *   .isComplete    - true when all 4 independent metrics have data
 *   .breakdown     - Human-readable status per dimension
 */
const calculateAdaptability = ({
    academic = [],
    attendance = null,
    rewardPoints = 0,
    deptAvgRewards = 0,
    history = [],
}) => {

    /* ------------------------------------------------------------------ */
    /* 1. ACADEMIC SCORE (30%)                                              */
    /* Subject-wise normalisation, then averaged across subjects.           */
    /* ------------------------------------------------------------------ */
    let academicScore = null;

    if (academic && academic.length > 0) {
        const subjectAcademics = [];

        for (const m of academic) {
            const components = [];
            if (hasValue(m.pt1)) components.push((Number(m.pt1) / 50) * 100);
            if (hasValue(m.pt2)) components.push((Number(m.pt2) / 50) * 100);
            const sem = gradeToPercentage(m.semester_grade);
            if (sem !== null) components.push(sem);

            if (components.length > 0) {
                subjectAcademics.push(
                    components.reduce((s, v) => s + v, 0) / components.length
                );
            }
        }

        if (subjectAcademics.length > 0) {
            academicScore =
                subjectAcademics.reduce((s, v) => s + v, 0) / subjectAcademics.length;
        }
    }

    /* ------------------------------------------------------------------ */
    /* 2. ASSIGNMENT SCORE (20%)                                            */
    /* Average of assignment marks across subjects; nulls ignored.          */
    /* ------------------------------------------------------------------ */
    let assignmentScore = null;

    if (academic && academic.length > 0) {
        const vals = academic
            .filter(m => hasValue(m.assignment))
            .map(m => Number(m.assignment)); // already out of 100

        if (vals.length > 0) {
            assignmentScore = vals.reduce((s, v) => s + v, 0) / vals.length;
        }
    }

    /* ------------------------------------------------------------------ */
    /* 3. ATTENDANCE SCORE (20%)                                            */
    /* Direct import — no transformation.                                   */
    /* ------------------------------------------------------------------ */
    const attendanceScore = hasValue(attendance) ? Number(attendance) : null;

    /* ------------------------------------------------------------------ */
    /* 4. SKILL SCORE (15%)                                                 */
    /* Normalised vs dept+batch average reward points.                      */
    /* NULL (not 0) when dept avg is 0 — avoids unfair penalisation.        */
    /* ------------------------------------------------------------------ */
    let skillScore = null;

    if (hasValue(rewardPoints)) {
        if (deptAvgRewards > 0) {
            skillScore = Math.min(100, (Number(rewardPoints) / deptAvgRewards) * 100);
        }
        // deptAvgRewards === 0 → null (not 0): new dept, no data yet
    }

    /* ------------------------------------------------------------------ */
    /* 5. RECOVERY SCORE (15%)                                              */
    /* Academic improvement across evaluation cycles.                       */
    /* RULE: Recovery is NULL when AcademicScore is NULL — derived metric.  */
    /* ------------------------------------------------------------------ */
    let recoveryScore = null;

    if (academicScore !== null) {
        if (history && history.length > 0) {
            // History sorted ASC — last element is the most-recent past cycle
            const prevAcademic = history[history.length - 1].academic_score;
            if (hasValue(prevAcademic)) {
                recoveryScore = clamp(0, 100, 70 + (academicScore - Number(prevAcademic)));
            } else {
                // History exists but academic_score not recorded — use baseline
                recoveryScore = 70;
            }
        } else {
            // No prior history — neutral baseline
            recoveryScore = 70;
        }
    }
    // If academicScore is null → recoveryScore stays null (per Issue 1 & 5)

    /* ------------------------------------------------------------------ */
    /* WEIGHTED FINAL SCORE — dynamic weight normalisation                  */
    /* Only available (non-null) dimensions contribute to the total weight. */
    /* Missing data does NOT drag the score down arithmetically.            */
    /* ------------------------------------------------------------------ */
    const weights = {
        academic: 0.30,
        attendance: 0.20,
        assignments: 0.20,
        skills: 0.15,
        recovery: 0.15,
    };

    const scores = {
        academic: academicScore,
        attendance: attendanceScore,
        assignments: assignmentScore,
        skills: skillScore,
        recovery: recoveryScore,
    };

    let weightedSum = 0;
    let totalWeightUsed = 0;

    for (const key of Object.keys(weights)) {
        if (scores[key] !== null) {
            weightedSum += scores[key] * weights[key];
            totalWeightUsed += weights[key];
        }
    }

    const finalScore =
        totalWeightUsed > 0
            ? (weightedSum / totalWeightUsed).toFixed(1)
            : '0.0';

    /* ------------------------------------------------------------------ */
    /* DATA CONFIDENCE                                                      */
    /* Based on the 4 INDEPENDENT metrics only (recovery is derived).       */
    /* TotalIndependentMetrics = 4                                          */
    /* ------------------------------------------------------------------ */
    const independentPresent =
        (academicScore !== null ? 1 : 0) +
        (attendanceScore !== null ? 1 : 0) +
        (assignmentScore !== null ? 1 : 0) +
        (skillScore !== null ? 1 : 0);

    const confidence = Math.round((independentPresent / 4) * 100);

    /* ------------------------------------------------------------------ */
    /* BREAKDOWN LABELS — human-readable per-dimension status               */
    /* ------------------------------------------------------------------ */
    const breakdown = {
        academic: academicScore !== null ? 'Computed' : 'No Marks Entered',
        attendance: attendanceScore !== null ? 'Computed' : 'Awaiting PS Data',
        assignments: assignmentScore !== null ? 'Computed' : 'No Assignments Entered',
        skills: skillScore !== null ? 'Computed' : (deptAvgRewards === 0 ? 'Dept Avg Unavailable' : 'No Reward Data'),
        recovery: recoveryScore !== null
            ? (history && history.length > 0 ? 'Trend Computed' : 'Baseline (No History)')
            : 'Requires Academic Data',
    };

    return {
        scores,
        finalScore,
        confidence,
        isComplete: independentPresent === 4,
        breakdown,
    };
};

module.exports = { calculateAdaptability, gradeToPercentage };
