const express = require('express');
const router = express.Router();
const { ensureApiAuthenticated } = require('../../middleware/authMiddleware');
const JobPosting = require('../../models/JobPosting');
const JobSeekerProfile = require('../../models/JobSeekerProfile');
const Application = require('../../models/Application');
const { calculateOverallMatchScore } = require('../../services/matchingService');

// @route   GET /api/dashboard/seeker
// @desc    Get all data needed for the seeker dashboard
// @access  Private
router.get('/seeker', ensureApiAuthenticated, async (req, res) => {
    try {
        const seekerId = req.user.id;
        const seekerProfile = await JobSeekerProfile.findOne({ user_id: seekerId });

        // --- Fetch all dashboard stats in parallel ---
        const activeAppsPromise = Application.countDocuments({ seeker_user_id: seekerId, status: { $nin: ['Hired', 'Rejected', 'Withdrawn'] }});
        const offersHiredAppsPromise = Application.countDocuments({ seeker_user_id: seekerId, status: { $in: ['Offered', 'Hired'] }});
        const allMyAppsPromise = Application.find({ seeker_user_id: seekerId });
        
        let matchedJobsPromise;
        if (seekerProfile) {
            // This logic can be intensive, so it's wrapped
            matchedJobsPromise = (async () => {
                const allActiveJobs = await JobPosting.find({ isActive: true }).populate('recruiter_id', 'companyName');
                const matchedJobs = [];
                for (const job of allActiveJobs) {
                    const score = calculateOverallMatchScore(seekerProfile, job);
                    if (score > 0.3) {
                        matchedJobs.push({ job, matchScore: score });
                    }
                }
                matchedJobs.sort((a, b) => b.matchScore - a.matchScore);
                return matchedJobs;
            })();
        } else {
            matchedJobsPromise = Promise.resolve([]);
        }

        const [
            activeApplicationsCount,
            offersOrHiredCount,
            allMyApps,
            matchedJobs
        ] = await Promise.all([
            activeAppsPromise,
            offersHiredAppsPromise,
            allMyAppsPromise,
            matchedJobsPromise
        ]);

        // --- Process Application Status for Chart ---
        const applicationStatusCounts = {};
        const statusOrder = ['Applied', 'Viewed', 'Under Review', 'Interviewing', 'Offered', 'Hired', 'Rejected', 'Withdrawn'];
        
        statusOrder.forEach(status => {
            const count = allMyApps.filter(app => app.status === status).length;
            applicationStatusCounts[status] = count;
        });

        res.json({
            activeApplicationsCount,
            offersOrHiredCount,
            matchedJobsCount: matchedJobs.length,
            applicationStatusCounts
        });

    } catch (error) {
        console.error("Error in GET /api/dashboard/seeker:", error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
