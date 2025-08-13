// routes/browseRoutes.js
console.log("--- browseRoutes.js file is being loaded ---");

const express = require('express');
const router = express.Router();

const JobPosting = require('../models/JobPosting');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const { ensureAuthenticated, ensureRecruiter } = require('../middleware/authMiddleware');
const {
    locationsList, jobTypeList, careerLevelsList, skillsList,
    degreeLevelsList, fieldsOfStudyList, broaderCategoriesList
} = require('../config/selectData');

// --- Route for Job Seekers to Browse/Filter Jobs ---
// /browse/jobs
router.get('/jobs', ensureAuthenticated, async (req, res, next) => {
    console.log("HIT: GET /browse/jobs - Query params:", req.query);
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

        console.log("Constructed filter query for /browse/jobs:", filterQuery);
        const jobs = await JobPosting.find(filterQuery)
            .sort({ postedDate: -1 })
            .populate('recruiter_id', 'companyName username'); 

        console.log(`Found ${jobs.length} jobs after filtering for /browse/jobs.`);
        res.render('job/browseJobs', { // Path to EJS: views/job/browseJobs.ejs
            title: 'Browse Jobs',
            jobs: jobs.map(job => job.toObject()),
            currentFilters: req.query,
        
            locationsList, jobTypeList, careerLevelsList, skillsList,
            degreeLevelsList, fieldsOfStudyList, broaderCategoriesList
        });
    } catch (err) {
        console.error("Error in GET /browse/jobs:", err);
        next(err);
    }
});

// ---  Route for Recruiters to Browse/Filter Seekers ---
// Accessible at /browse/seekers
router.get('/seekers', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    console.log("HIT: GET /browse/seekers - Query params:", req.query);
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

        console.log("Constructed filter query for /browse/seekers:", filterQuery);
        const seekers = await JobSeekerProfile.find(filterQuery)
            .populate('user_id', 'username email')
            .limit(50);

        console.log(`Found ${seekers.length} seekers after filtering for /browse/seekers.`);
        res.render('recruiter/browseSeekers', { // Path to EJS: views/recruiter/browseSeekers.ejs
            title: 'Browse Job Seekers',
            seekers: seekers.map(s => s.toObject()),
            currentFilters: req.query,
            // Pass lists needed for filters and displaying seeker card details
            skillsList, degreeLevelsList, fieldsOfStudyList,
            broaderCategoriesList, locationsList, jobTypeList 
        });
    } catch (err) {
        console.error("Error in GET /browse/seekers:", err);
        next(err);
    }
});

module.exports = router;