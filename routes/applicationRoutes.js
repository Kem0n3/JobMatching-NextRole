const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const JobPosting = require('../models/JobPosting');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const { ensureAuthenticated, ensureSeeker, ensureRecruiter } = require('../middleware/authMiddleware');
const { skillsList, degreeLevelsList, fieldsOfStudyList, locationsList, broaderCategoriesList } = require('../config/selectData');

router.post('/apply/:jobId', ensureAuthenticated, ensureSeeker, async (req, res) => {
    const jobId = req.params.jobId;
    const seekerUserId = req.user.id;

    try {
        const job = await JobPosting.findById(jobId);
        if (!job || !job.isActive) {
            if (req.flash) req.flash('error_msg', 'Job not found or is no longer active.');
            return res.redirect('back');
        }

        const existingApplication = await Application.findOne({ job_id: jobId, seeker_user_id: seekerUserId });
        if (existingApplication) {
            if (req.flash) req.flash('success_msg', 'You have already applied for this job.');
            return res.redirect(`/jobs/${jobId}`);
        }

        const newApplication = new Application({
            job_id: jobId,
            seeker_user_id: seekerUserId
        });
        await newApplication.save();

        if (req.flash) req.flash('success_msg', 'Application submitted successfully!');
        res.redirect(`/jobs/${jobId}`);

    } catch (err) {
        console.error("Error submitting application:", err);
        if (err.code === 11000) {
             if (req.flash) req.flash('error_msg', 'You have already applied for this job.');
        } else {
             if (req.flash) req.flash('error_msg', 'There was an error submitting your application.');
        }
        res.redirect(`/jobs/${jobId}`);
    }
});

router.get('/job/:jobId/applicants', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    const jobId = req.params.jobId;
    try {
        const job = await JobPosting.findById(jobId);
        if (!job || job.recruiter_id.toString() !== req.user.id.toString()) {
            if (req.flash) req.flash('error_msg', 'Job not found or you are not authorized.');
            return res.redirect('/jobs/my');
        }

        const rawApplications = await Application.find({ job_id: jobId })
            .populate('seeker_user_id', 'username email')
            .sort({ applicationDate: -1 });

        const applications = [];
        for (let app of rawApplications) {
            if (app.seeker_user_id && app.seeker_user_id._id) {
                const seekerProfile = await JobSeekerProfile.findOne({ user_id: app.seeker_user_id._id })
                                          .select('fullName');
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
            activeNavItem: 'myJobs',
            job: job.toObject(),
            applications
        });

    } catch (err) {
        console.error("Error fetching applicants:", err);
        next(err);
    }
});

router.post('/status/:applicationId', ensureAuthenticated, ensureRecruiter, async (req, res) => {
    const { applicationId } = req.params;
    const { newStatus } = req.body;
    const recruiterUserId = req.user.id;

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

        const validStatuses = Application.schema.path('status').enumValues;
        if (!validStatuses.includes(newStatus)) {
            if (req.flash) req.flash('error_msg', 'Invalid application status.');
            return res.status(400).redirect('back');
        }

        application.status = newStatus;
        await application.save();

        if (req.flash) req.flash('success_msg', `Application status updated to ${newStatus}.`);
        res.redirect(`/applications/job/${application.job_id._id}/applicants`);

    } catch (err) {
        console.error("Error updating application status:", err);
        if (req.flash) req.flash('error_msg', 'Error updating application status.');
        const redirectPath = req.headers.referer || '/jobs/my';
        res.status(500).redirect(redirectPath);
    }
});

router.get('/my', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    try {
        const myApplications = await Application.find({ seeker_user_id: req.user.id })
            .populate({
                path: 'job_id',
                select: 'jobTitle companyName jobLocation'
            })
            .sort({ applicationDate: -1 });

        res.render('seeker/myApplications', {
            title: 'My Applications',
            activeNavItem: 'myApplications',
            applications: myApplications.map(app => app.toObject()),
            locationsList
        });
    } catch (err) {
        console.error("Error fetching seeker's applications:", err);
        next(err);
    }
});

module.exports = router;