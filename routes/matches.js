const express = require('express');
const router = express.Router();
const JobSeekerProfile = require('../models/JobSeekerProfile');
const JobPosting = require('../models/JobPosting');
const Application = require('../models/Application');
const { ensureAuthenticated, ensureSeeker, ensureRecruiter } = require('../middleware/authMiddleware');
const { calculateOverallMatchScore } = require('../services/matchingService');
const {
    skillsList, degreeLevelsList, fieldsOfStudyList,
    locationsList, broaderCategoriesList, jobTypeList, careerLevelsList
} = require('../config/selectData');

router.get('/jobs', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    try {
        const seekerProfile = await JobSeekerProfile.findOne({ user_id: req.user.id });
        if (!seekerProfile) {
            if(req.flash) req.flash('error_msg', 'Please complete your profile to view matched jobs.');
            return res.redirect('/profile/form');
        }

        const allActiveJobs = await JobPosting.find({ isActive: true }).populate('recruiter_id', 'companyName');
        const applicationsForJobs = await Application.find({ seeker_user_id: req.user.id }).select('job_id -_id');
        const appliedJobIds = applicationsForJobs.map(app => app.job_id.toString());

        let matchedJobs = [];

        for (const job of allActiveJobs) {
            const score = calculateOverallMatchScore(seekerProfile, job);
            if (score > 0.3) {
                matchedJobs.push({
                    ...job.toObject(),
                    matchScore: score,
                    hasApplied: appliedJobIds.includes(job._id.toString())
                });
            }
        }

        matchedJobs.sort((a, b) => b.matchScore - a.matchScore);

        res.render('seeker/matchedJobs', {
            title: 'Matched Jobs',
            activeNavItem: 'matchedJobs',
            jobs: matchedJobs,
            skillsList,
            locationsList,
            jobTypeList,
            careerLevelsList,
            degreeLevelsList,
            fieldsOfStudyList,
            broaderCategoriesList
        });

    } catch (err) {
        console.error("Error in GET /matches/jobs:", err);
        next(err);
    }
});

router.get('/seekers/:jobId', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    try {
        const jobId = req.params.jobId;
        const jobPosting = await JobPosting.findById(jobId);
        if (!jobPosting || jobPosting.recruiter_id.toString() !== req.user.id.toString()) {
            if(req.flash) req.flash('error_msg', 'Job posting not found or you are not authorized.');
            return res.redirect('/jobs/my');
        }

        const allSeekerProfiles = await JobSeekerProfile.find({}).populate('user_id', 'username email');
        let matchedSeekers = [];

        for (const seekerProfile of allSeekerProfiles) {
            if (!seekerProfile || !seekerProfile.skills) {
                continue;
            }
            const score = calculateOverallMatchScore(seekerProfile, jobPosting);
            if (score > 0.25) {
                matchedSeekers.push({
                    ...seekerProfile.toObject(),
                    user: seekerProfile.user_id ? seekerProfile.user_id.toObject() : { username: 'N/A', email: 'N/A' },
                    matchScore: score
                });
            }
        }

        matchedSeekers.sort((a, b) => b.matchScore - a.matchScore);

        res.render('recruiter/matchedSeekers', {
            title: `Matched Seekers for "${jobPosting.jobTitle}"`,
            activeNavItem: 'myJobs',
            job: jobPosting.toObject(),
            seekers: matchedSeekers,
            skillsList,
            locationsList,
            jobTypeList,
            broaderCategoriesList,
            degreeLevelsList,
            fieldsOfStudyList
        });

    } catch (err) {
        console.error(`Error in GET /matches/seekers/:jobId:`, err);
        next(err);
    }
});

module.exports = router;