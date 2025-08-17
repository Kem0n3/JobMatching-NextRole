const express = require('express');
const router = express.Router();

const JobPosting = require('../models/JobPosting');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const { ensureAuthenticated, ensureRecruiter } = require('../middleware/authMiddleware');
const {
    locationsList, jobTypeList, careerLevelsList, skillsList,
    degreeLevelsList, fieldsOfStudyList, broaderCategoriesList
} = require('../config/selectData');

router.get('/jobs', ensureAuthenticated, async (req, res, next) => {
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

        res.render('job/browseJobs', {
            title: 'Browse Jobs',
            activeNavItem: 'browseJobs',
            jobs: jobs.map(job => job.toObject()),
            currentFilters: req.query,
            locationsList,
            jobTypeList,
            careerLevelsList,
            skillsList,
            degreeLevelsList,
            fieldsOfStudyList,
            broaderCategoriesList
        });
    } catch (err) {
        console.error("Error in GET /browse/jobs:", err);
        next(err);
    }
});

router.get('/seekers', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    try {
        const {
            skills: seekerSkills,
            degreeLevel,
            fieldOfStudy
        } = req.query;

        let filterQuery = {};

        if (seekerSkills) {
            const skillsToFilter = Array.isArray(seekerSkills) ? seekerSkills : [seekerSkills];
            const validSkills = skillsToFilter.filter(skill => skill && skill !== '');
            if (validSkills.length > 0) {
                filterQuery.skills = { $all: validSkills };
            }
        }
        if (degreeLevel && degreeLevel !== '') filterQuery.degreeLevel = degreeLevel;
        if (fieldOfStudy && fieldOfStudy !== '') filterQuery.fieldOfStudy = fieldOfStudy;

        const seekers = await JobSeekerProfile.find(filterQuery)
            .populate('user_id', 'username email')
            .limit(50);

        res.render('recruiter/browseSeekers', {
            title: 'Browse Job Seekers',
            activeNavItem: 'browseSeekers',
            seekers: seekers.map(s => s.toObject()),
            currentFilters: req.query,
            skillsList,
            degreeLevelsList,
            fieldsOfStudyList,
            broaderCategoriesList,
            locationsList,
            jobTypeList
        });
    } catch (err) {
        console.error("Error in GET /browse/seekers:", err);
        next(err);
    }
});

module.exports = router;