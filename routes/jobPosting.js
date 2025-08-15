// routes/jobPosting.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const JobPosting = require('../models/JobPosting');
const Application = require('../models/Application');
const { ensureAuthenticated, ensureRecruiter } = require('../middleware/authMiddleware');
const {
    skillsList, degreeLevelsList, fieldsOfStudyList,
    locationsList, broaderCategoriesList, jobTypeList, careerLevelsList
} = require('../config/selectData');



// GET route to display the form for CREATING a new job posting
router.get('/new', ensureAuthenticated, ensureRecruiter, (req, res) => {
    console.log("GET /jobs/new - Rendering form for new job");
    const jobDataForTemplate = { experienceRequirements: [{}], allowsRemote: false, isActive: true };
    res.render('recruiter/jobForm', {
        title: 'Post a New Job',
        isEditMode: false,
        jobData: jobDataForTemplate,
        jobId: null,
        skillsList, degreeLevelsList, fieldsOfStudyList,
        locationsList, broaderCategoriesList, jobTypeList, careerLevelsList,
        errors: req.flash ? req.flash('error') : []
    });
});

// GET route to display all job postings by the current recruiter
router.get('/my', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    console.log("GET /jobs/my - Fetching jobs for recruiter:", req.user.id);
    try {
        const myJobs = await JobPosting.find({ recruiter_id: req.user.id }).sort({ postedDate: -1 });
        console.log(`Found ${myJobs.length} jobs. Rendering recruiter/myJobs.`);
        res.render('recruiter/myJobs', {
            title: 'My Job Postings',
            jobs: myJobs
        });
    } catch (err) {
        console.error("Error in GET /jobs/my:", err);
        if (req.flash) req.flash('error_msg', 'Could not load your job postings.');
        next(err);
    }
});

// GET route to display the form for EDITING an existing job posting
router.get('/:id/edit', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    const jobId = req.params.id;
    console.log(`GET /jobs/${jobId}/edit - Rendering form for editing job`);
    try {
        // Validate if jobId is a valid ObjectId before querying
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            console.log(`Invalid ObjectId format for jobId in edit: ${jobId}`);
            if (req.flash) req.flash('error_msg', 'Invalid job ID format.');
            return res.redirect('/jobs/my');
        }

        let jobData = await JobPosting.findById(jobId);
        if (!jobData || jobData.recruiter_id.toString() !== req.user.id.toString()) {
            if (req.flash) req.flash('error_msg', 'Job not found or not authorized.');
            return res.redirect('/jobs/my');
        }

        const jobDataForTemplate = jobData.toObject();
        if (!jobDataForTemplate.experienceRequirements || jobDataForTemplate.experienceRequirements.length === 0) {
            jobDataForTemplate.experienceRequirements = [{}];
        }
        if (typeof jobDataForTemplate.allowsRemote === 'undefined') {
            jobDataForTemplate.allowsRemote = false;
        }
        if (typeof jobDataForTemplate.isActive === 'undefined') {
            jobDataForTemplate.isActive = true;
        }

        res.render('recruiter/jobForm', {
            title: 'Edit Job Posting',
            isEditMode: true,
            jobData: jobDataForTemplate,
            jobId: jobId,
            skillsList, degreeLevelsList, fieldsOfStudyList,
            locationsList, broaderCategoriesList, jobTypeList, careerLevelsList,
            errors: req.flash ? req.flash('error') : []
        });
    } catch (err) {
        console.error(`Error loading job ${jobId} for edit:`, err);
        if (req.flash) req.flash('error_msg', 'Error loading job for editing.');
        next(err);
    }
});



// GET route for anyone to view a single job posting
router.get('/:id', async (req, res, next) => {
    const jobId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(404).render('error', { title: 'Not Found', message: 'Job posting ID is invalid.' });
    }

    try {
        const job = await JobPosting.findById(jobId).populate('recruiter_id', 'username');

        if (!job) {
            return res.status(404).render('error', { title: 'Not Found', message: 'Job posting not found.' });
        }

        const isOwner = req.isAuthenticated() && req.user && req.user.role === 'recruiter' && job.recruiter_id && job.recruiter_id._id.toString() === req.user.id.toString();

        if (!job.isActive && !isOwner) {
            return res.status(404).render('error', { title: 'Not Found', message: 'This job posting is no longer active.' });
        }

        let hasApplied = false;
        let applicationStatus = null;
        if (req.isAuthenticated() && req.user && req.user.role === 'seeker') {
            const existingApplication = await Application.findOne({ job_id: job._id, seeker_user_id: req.user.id });
            if (existingApplication) {
                hasApplied = true;
                applicationStatus = existingApplication.status;
            }
        }

        res.render('recruiter/viewJob', {
            title: job.jobTitle,
            activeNavItem: 'browseJobs', // Or another appropriate key for sidebar highlighting
            job: job.toObject(),
            hasApplied,
            applicationStatus,
            isOwner,
            // Pass all lists needed for displaying text values from IDs
            skillsList, degreeLevelsList, fieldsOfStudyList,
            locationsList, broaderCategoriesList, jobTypeList, careerLevelsList
        });
    } catch (err) {
        console.error(`Error fetching job ${jobId} for view:`, err);
        next(err);
    }
});


// --- POST ROUTES ---

// POST route to handle CREATION of a new job posting
router.post('/', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    console.log("POST /jobs - Attempting to create new job. Body:", JSON.stringify(req.body, null, 2));
    const {
        jobTitle, companyName, jobDescription, requiredSkills, preferredSkills,
        minimumDegreeLevel, preferredFieldOfStudy, jobLocation, allowsRemote,
        jobType, careerLevel, salaryRange, experienceRequirements
    } = req.body;

    const errors = [];
    if (!jobTitle || jobTitle.trim() === '') errors.push({ msg: 'Job title is required.' });
    if (!companyName || companyName.trim() === '') errors.push({ msg: 'Company name is required.' });
    if (!jobDescription || jobDescription.trim() === '') errors.push({ msg: 'Job description is required.' });
    if (!requiredSkills || (Array.isArray(requiredSkills) && requiredSkills.length === 0) || (typeof requiredSkills === 'string' && !requiredSkills)) {
        errors.push({ msg: 'At least one required skill is required.' });
    }
    if (!minimumDegreeLevel) errors.push({ msg: 'Minimum degree level is required.' });
    if (!jobLocation) errors.push({ msg: 'Job location is required.' });
    if (!jobType) errors.push({ msg: 'Job type is required.' });
    if (!careerLevel) errors.push({ msg: 'Career level is required.' });

    if (experienceRequirements && Array.isArray(experienceRequirements)) {
        experienceRequirements.forEach((exp, index) => {
            if (exp.category_id && (exp.minYears === undefined || exp.minYears === '' || parseInt(exp.minYears) < 0)) {
                errors.push({ msg: `Valid minimum years are required for experience category (entry #${index + 1}).` });
            }
            if (!exp.category_id && exp.minYears && exp.minYears !== '') {
                 errors.push({ msg: `Category is required for experience requirement #${index + 1} if years are specified.` });
            }
        });
    }

    if (errors.length > 0) {
        console.log("Validation errors found during job creation:", errors);
        const jobDataForForm = { ...req.body };
        if (!jobDataForForm.experienceRequirements || jobDataForForm.experienceRequirements.length === 0) {
           jobDataForForm.experienceRequirements = [{}];
        }
        return res.status(400).render('recruiter/jobForm', {
            title: 'Post a New Job', isEditMode: false, jobData: jobDataForForm, jobId: null,
            skillsList, degreeLevelsList, fieldsOfStudyList, locationsList,
            broaderCategoriesList, jobTypeList, careerLevelsList, errors
        });
    }

    const jobFields = {
        recruiter_id: req.user.id,
        jobTitle: jobTitle.trim(), companyName: companyName.trim(), jobDescription: jobDescription.trim(),
        requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : (requiredSkills ? [requiredSkills] : []),
        preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : (preferredSkills ? [preferredSkills] : []),
        minimumDegreeLevel, preferredFieldOfStudy: preferredFieldOfStudy || undefined,
        jobLocation,
        allowsRemote: allowsRemote === 'true',
        jobType, careerLevel,
        salaryRange: salaryRange ? salaryRange.trim() : undefined,
        isActive: true, experienceRequirements: []
    };

    if (experienceRequirements && Array.isArray(experienceRequirements)) {
        jobFields.experienceRequirements = experienceRequirements
            .filter(exp => exp.category_id && exp.category_id !== '' && exp.minYears !== undefined && exp.minYears !== '' && parseInt(exp.minYears) >= 0)
            .map(exp => ({ category_id: exp.category_id, minYears: parseInt(exp.minYears) }));
    }

    try {
        console.log("Attempting to save new job with fields:", JSON.stringify(jobFields, null, 2));
        const newJob = new JobPosting(jobFields);
        await newJob.save();
        console.log("New job SAVED successfully. ID:", newJob._id);
        if (req.flash) req.flash('success_msg', 'Job posting created successfully!');
        console.log("Redirecting to /jobs/my");
        return res.redirect('/jobs/my');
    } catch (err) {
        console.error(`Error creating job posting (in catch block):`, err);
        const mongooseErrors = [];
        if (err.errors) { for (let field in err.errors) { mongooseErrors.push({ msg: err.errors[field].message }); } }
        else { mongooseErrors.push({ msg: 'An unexpected error occurred while creating the job.'}); }

        const jobDataForForm = { ...req.body };
        if (!jobDataForForm.experienceRequirements || jobDataForForm.experienceRequirements.length === 0) {
           jobDataForForm.experienceRequirements = [{}];
        }
        return res.status(500).render('recruiter/jobForm', {
            title: 'Post a New Job', isEditMode: false, jobData: jobDataForForm, jobId: null,
            skillsList, degreeLevelsList, fieldsOfStudyList, locationsList,
            broaderCategoriesList, jobTypeList, careerLevelsList,
            errors: mongooseErrors
        });
    }
});

// POST route to handle UPDATING an existing job posting
router.post('/:id', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    const jobId = req.params.id;

    // Validate if jobId is a valid ObjectId before proceeding
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        console.log(`Invalid ObjectId format for jobId in update: ${jobId}`);
        if (req.flash) req.flash('error_msg', 'Invalid job ID format.');
        return res.redirect('/jobs/my'); // Or a 404 page
    }

    console.log(`POST /jobs/${jobId} - Attempting to update job. Body:`, JSON.stringify(req.body, null, 2));
    const {
        jobTitle, companyName, jobDescription, requiredSkills, preferredSkills,
        minimumDegreeLevel, preferredFieldOfStudy, jobLocation, allowsRemote,
        jobType, careerLevel, salaryRange, isActive, experienceRequirements
    } = req.body;

    const errors = [];
    // Add full validation logic here, similar to the create route
    if (!jobTitle || jobTitle.trim() === '') errors.push({ msg: 'Job title is required.' });
    if (!companyName || companyName.trim() === '') errors.push({ msg: 'Company name is required.' });
    

    if (errors.length > 0) {
        console.log("Validation errors found during job update:", errors);
        const jobDataForForm = { ...req.body, _id: jobId };
         if (!jobDataForForm.experienceRequirements || jobDataForForm.experienceRequirements.length === 0) {
           jobDataForForm.experienceRequirements = [{}];
        }
        return res.status(400).render('recruiter/jobForm', {
            title: 'Edit Job Posting', isEditMode: true, jobData: jobDataForForm, jobId,
            skillsList, degreeLevelsList, fieldsOfStudyList, locationsList,
            broaderCategoriesList, jobTypeList, careerLevelsList, errors
        });
    }

    try {
        const job = await JobPosting.findById(jobId);
        if (!job || job.recruiter_id.toString() !== req.user.id.toString()) {
            if (req.flash) req.flash('error_msg', 'Job not found or not authorized.');
            return res.redirect('/jobs/my');
        }

        job.jobTitle = jobTitle.trim();
        job.companyName = companyName.trim();
        job.jobDescription = jobDescription.trim();
        job.requiredSkills = Array.isArray(requiredSkills) ? requiredSkills : (requiredSkills ? [requiredSkills] : []);
        job.preferredSkills = Array.isArray(preferredSkills) ? preferredSkills : (preferredSkills ? [preferredSkills] : []);
        job.minimumDegreeLevel = minimumDegreeLevel;
        job.preferredFieldOfStudy = preferredFieldOfStudy || undefined;
        job.jobLocation = jobLocation;
        job.allowsRemote = allowsRemote === 'true';
        job.jobType = jobType;
        job.careerLevel = careerLevel;
        job.salaryRange = salaryRange ? salaryRange.trim() : undefined;
        job.isActive = isActive === 'true';

        job.experienceRequirements = []; // Clear and re-populate
        if (experienceRequirements && Array.isArray(experienceRequirements)) {
            job.experienceRequirements = experienceRequirements
                .filter(exp => exp.category_id && exp.category_id !== '' && exp.minYears !== undefined && exp.minYears !== '' && parseInt(exp.minYears) >= 0)
                .map(exp => ({ category_id: exp.category_id, minYears: parseInt(exp.minYears) }));
        }
        console.log("Attempting to save updated job with fields:", JSON.stringify(job.toObject(), null, 2));
        await job.save();
        console.log("Job UPDATED successfully. ID:", job._id);
        if (req.flash) req.flash('success_msg', 'Job posting updated successfully!');
        console.log("Redirecting to /jobs/my");
        return res.redirect('/jobs/my');
    } catch (err) {
        console.error(`Error updating job posting (in catch block):`, err);
        const mongooseErrors = [];
        if (err.errors) { for (let field in err.errors) { mongooseErrors.push({ msg: err.errors[field].message }); } }
        else { mongooseErrors.push({ msg: 'An unexpected error occurred while updating the job.'}); }

        const jobDataForForm = { ...req.body, _id: jobId };
        if (!jobDataForForm.experienceRequirements || jobDataForForm.experienceRequirements.length === 0) {
           jobDataForForm.experienceRequirements = [{}];
        }
        // Pass to global error handler or render form with error
        // For now, re-rendering form:
        return res.status(500).render('recruiter/jobForm', {
            title: 'Edit Job Posting', isEditMode: true, jobData: jobDataForForm, jobId,
            skillsList, degreeLevelsList, fieldsOfStudyList, locationsList,
            broaderCategoriesList, jobTypeList, careerLevelsList,
            errors: mongooseErrors
        });
    }
});

module.exports = router;