// routes/applicationRoutes.js
const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const JobPosting = require('../models/JobPosting');
const JobSeekerProfile = require('../models/JobSeekerProfile'); 
const { ensureAuthenticated, ensureSeeker, ensureRecruiter } = require('../middleware/authMiddleware');
const { skillsList, degreeLevelsList, fieldsOfStudyList } = require('../config/selectData'); 

// --- Seeker: Apply for a Job ---
router.post('/apply/:jobId', ensureAuthenticated, ensureSeeker, async (req, res) => {
    const jobId = req.params.jobId;
    const seekerUserId = req.user.id;
    console.log(`POST /applications/apply/${jobId} by seeker ${seekerUserId}`);

    try {
        const job = await JobPosting.findById(jobId);
        if (!job) {
            console.log(`Apply failed: Job ${jobId} not found.`);
            if (req.flash) req.flash('error_msg', 'Job not found.');
            return res.redirect(req.headers.referer || '/');
        }
        if (!job.isActive) {
            console.log(`Apply failed: Job ${jobId} is not active.`);
            if (req.flash) req.flash('error_msg', 'This job is no longer active.');
            return res.redirect(`/jobs/${jobId}`);
        }

        const existingApplication = await Application.findOne({ job_id: jobId, seeker_user_id: seekerUserId });
        if (existingApplication) {
            console.log(`Apply info: Seeker ${seekerUserId} already applied to job ${jobId}.`);
            if (req.flash) req.flash('success_msg', 'You have already applied for this job.');
            return res.redirect(`/jobs/${jobId}`);
        }

        const newApplication = new Application({
            job_id: jobId,
            seeker_user_id: seekerUserId
        });
        await newApplication.save();

        console.log(`Application successful for job ${jobId} by seeker ${seekerUserId}. ID: ${newApplication._id}`);
        if (req.flash) req.flash('success_msg', 'Application submitted successfully!');
        res.redirect(`/jobs/${jobId}`);

    } catch (err) {
        console.error("Error submitting application:", err);
        if (err.code === 11000) {
             console.log(`Apply failed due to duplicate: Seeker ${seekerUserId} likely already applied to job ${jobId}.`);
             if (req.flash) req.flash('error_msg', 'You have already applied for this job.');
        } else {
             if (req.flash) req.flash('error_msg', 'There was an error submitting your application. Please try again.');
        }
        res.redirect(req.headers.referer || `/jobs/${jobId}` || '/dashboard');
    }
});

// --- Recruiter: View Applicants for a Job ---
router.get('/job/:jobId/applicants', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    const jobId = req.params.jobId;
    console.log(`GET /applications/job/${jobId}/applicants by recruiter ${req.user.id}`);
    try {
        const job = await JobPosting.findById(jobId);
        if (!job || job.recruiter_id.toString() !== req.user.id.toString()) {
            if (req.flash) req.flash('error_msg', 'Job not found or you are not authorized.');
            return res.redirect('/jobs/my');
        }

        // Fetch applications and populate seeker's user info
        const rawApplications = await Application.find({ job_id: jobId })
            .populate('seeker_user_id', 'username email') 
            .sort({ applicationDate: -1 });


        const applications = [];
        for (let app of rawApplications) {
            if (app.seeker_user_id && app.seeker_user_id._id) {
                const seekerProfile = await JobSeekerProfile.findOne({ user_id: app.seeker_user_id._id })
                                          .select('fullName skills degreeLevel fieldOfStudy categoryExperience'); // Select specific fields
                applications.push({
                    ...app.toObject(), 
                    seekerProfile: seekerProfile ? seekerProfile.toObject() : null
                });
            } else {
                applications.push(app.toObject()); 
            }
        }

        res.render('recruiter/viewApplicants', {
            title: `Applicants for "${job.jobTitle}"`,
            job: job.toObject(),
            applications,
            skillsList, 
            degreeLevelsList, 
            fieldsOfStudyList, 
            broaderCategoriesList: require('../config/selectData').broaderCategoriesList // For category exp
        });

    } catch (err) {
        console.error("Error fetching applicants:", err);
        if (req.flash) req.flash('error_msg', 'Could not load applicants.');
        // res.redirect(`/jobs/${jobId}`);
        next(err); 
    }
});

// --- Recruiter: Update Application Status ---
router.post('/status/:applicationId', ensureAuthenticated, ensureRecruiter, async (req, res) => {
    const { applicationId } = req.params;
    const { newStatus } = req.body; 

    console.log(`POST /applications/status/${applicationId} - Recruiter ${recruiterUserId} updating status to ${newStatus}`);

    try {
        const application = await Application.findById(applicationId).populate('job_id');

        if (!application) {
            if (req.flash) req.flash('error_msg', 'Application not found.');
            return res.redirect('back');
        }

        if (!application.job_id || application.job_id.recruiter_id.toString() !== recruiterUserId.toString()) {
            if (req.flash) req.flash('error_msg', 'You are not authorized to update this application.');
            return res.status(403).redirect('back');
        }

        // Validate newStatus against the enum in ApplicationSchema 
        const validStatuses = Application.schema.path('status').enumValues;
        if (!validStatuses.includes(newStatus)) {
            if (req.flash) req.flash('error_msg', 'Invalid application status.');
            return res.status(400).redirect('back');
        }

        application.status = newStatus;
        await application.save();

        if (req.flash) req.flash('success_msg', `Application status updated to ${newStatus}.`);
        console.log(`Application ${applicationId} status updated to ${newStatus} by recruiter ${recruiterUserId}`);
        res.redirect(`/applications/job/${application.job_id._id}/applicants`); // Redirect back to applicants list

    } catch (err) {
        console.error("Error updating application status:", err);
        if (req.flash) req.flash('error_msg', 'Error updating application status.');
        
        const redirectPath = req.headers.referer || '/jobs/my';
        res.status(500).redirect(redirectPath);
    }
});


// --- Seeker: View My Applications ---
router.get('/my', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    console.log(`GET /applications/my - Seeker ${req.user.id} viewing their applications`);
    try {
        const myApplications = await Application.find({ seeker_user_id: req.user.id })
            .populate({
                path: 'job_id',
                select: 'jobTitle companyName jobLocation', 
                populate: { 
                    path: 'recruiter_id',
                    select: 'username'
                }
            })
            .sort({ applicationDate: -1 });

        res.render('seeker/myApplications', { 
            title: 'My Applications',
            applications: myApplications.map(app => app.toObject()),
            // Pass selectData lists if needed for displaying jobLocation text, etc.
            locationsList: require('../config/selectData').locationsList
        });
    } catch (err) {
        console.error("Error fetching seeker's applications:", err);
        next(err);
    }
});

module.exports = router;