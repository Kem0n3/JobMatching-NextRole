// routes/api/jobs.js
const express = require('express');
const router = express.Router();
const JobPosting = require('../../models/JobPosting');
// We will re-introduce API authentication after building the login UI
// const { ensureApiAuthenticated } = require('../../middleware/authMiddleware');

// --- API Route for Job Seekers to Browse/Filter Jobs ---
// Accessible at /api/jobs
// Temporarily removed authentication for frontend development
router.get('/', async (req, res) => {
    try {
        const {
            jobLocation, jobType, careerLevel, skills
        } = req.query;

        let filterQuery = { isActive: true };

        if (jobLocation && jobLocation !== '') filterQuery.jobLocation = jobLocation;
        if (jobType && jobType !== '') filterQuery.jobType = jobType;
        if (careerLevel && careerLevel !== '') filterQuery.careerLevel = careerLevel;

        if (skills) {
            const skillsToFilter = Array.isArray(skills) ? skills : [skills];
            const validSkills = skillsToFilter.filter(skill => skill && skill !== '');
            if (validSkills.length > 0) {
                filterQuery.requiredSkills = { $all: validSkills };
            }
        }

        const jobs = await JobPosting.find(filterQuery)
            .sort({ postedDate: -1 })
            .populate('recruiter_id', 'companyName username');

        res.json(jobs);
    } catch (err) {
        console.error("Error in GET /api/jobs:", err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
