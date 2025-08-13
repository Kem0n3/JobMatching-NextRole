// routes/matches.js
 const express = require('express');
 const router = express.Router();
 const JobSeekerProfile = require('../models/JobSeekerProfile');
 const JobPosting = require('../models/JobPosting');
 const { ensureAuthenticated, ensureSeeker, ensureRecruiter } = require('../middleware/authMiddleware');
 const { calculateOverallMatchScore } = require('../services/matchingService'); 
 const { skillsList, degreeLevelsList, fieldsOfStudyList, locationsList, broaderCategoriesList, jobTypeList, careerLevelsList } = require('../config/selectData');


 // --- For Job Seekers: View Matched Jobs ---
 router.get('/jobs', ensureAuthenticated, ensureSeeker, async (req, res) => {
     console.log("GET /matches/jobs - Seeker viewing matched jobs");
     try {
         const seekerProfile = await JobSeekerProfile.findOne({ user_id: req.user.id });
         if (!seekerProfile) {
             if(req.flash) req.flash('error_msg', 'Please complete your profile to view matched jobs.');
             return res.redirect('/profile/form');
         }

         const allActiveJobs = await JobPosting.find({ isActive: true }).populate('recruiter_id', 'companyName'); // Populate company name if it's on User model for recruiter
         const matchedJobs = [];

         console.log(`Calculating matches for seeker ${seekerProfile.fullName} against ${allActiveJobs.length} jobs.`);

         for (const job of allActiveJobs) {
             const score = calculateOverallMatchScore(seekerProfile, job);
             // console.log(`Job: ${job.jobTitle}, Score: ${score}`); 
             if (score > 0.5) { // Threshold score
                 matchedJobs.push({ ...job.toObject(), matchScore: score });
             }
         }

         matchedJobs.sort((a, b) => b.matchScore - a.matchScore); 

         console.log(`Found ${matchedJobs.length} matched jobs above threshold.`);

         res.render('seeker/matchedJobs', {
             title: 'Matched Job Postings',
             jobs: matchedJobs,
             skillsList, locationsList, jobTypeList, careerLevelsList, degreeLevelsList, fieldsOfStudyList, broaderCategoriesList
         });

     } catch (err) {
         console.error("Error in GET /matches/jobs:", err);
         if(req.flash) req.flash('error_msg', 'Could not load matched jobs.');
         res.redirect('/dashboard');
     }
 });


 // --- For Recruiters: View Matched Seekers for a Specific Job ---
 router.get('/seekers/:jobId', ensureAuthenticated, ensureRecruiter, async (req, res) => {
     const jobId = req.params.jobId;
     console.log(`GET /matches/seekers/${jobId} - Recruiter viewing matched seekers`);
     try {
         const jobPosting = await JobPosting.findById(jobId);
         if (!jobPosting || jobPosting.recruiter_id.toString() !== req.user.id.toString()) {
             if(req.flash) req.flash('error_msg', 'Job posting not found or you are not authorized.');
             return res.redirect('/jobs/my');
         }

         const allSeekerProfiles = await JobSeekerProfile.find({}).populate('user_id', 'username email'); 
         const matchedSeekers = [];

         console.log(`Calculating matches for job "${jobPosting.jobTitle}" against ${allSeekerProfiles.length} seekers.`);

         for (const seekerProfile of allSeekerProfiles) {
             const score = calculateOverallMatchScore(seekerProfile, jobPosting);
             // console.log(`Seeker: ${seekerProfile.fullName}, Score: ${score}`); 
             if (score > 0.3) { // Threshold
                 matchedSeekers.push({ ...seekerProfile.toObject(), user: seekerProfile.user_id, matchScore: score }); 
             }
         }

         matchedSeekers.sort((a, b) => b.matchScore - a.matchScore);

         console.log(`Found ${matchedSeekers.length} matched seekers above threshold for job ${jobPosting.jobTitle}.`);

         res.render('recruiter/matchedSeekers', {
             title: `Matched Seekers for "${jobPosting.jobTitle}"`,
             job: jobPosting,
             seekers: matchedSeekers,
             // Pass lists for potential display needs in seeker snippets
             skillsList, locationsList, jobTypeList, broaderCategoriesList, degreeLevelsList, fieldsOfStudyList
         });

     } catch (err) {
         console.error(`Error in GET /matches/seekers/${jobId}:`, err);
         if (err.kind === 'ObjectId') {
            return res.status(404).render('error', { title: 'Not Found', message: 'Job posting ID is invalid.' });
         }
         if(req.flash) req.flash('error_msg', 'Could not load matched seekers.');
         res.redirect('/jobs/my');
     }
 });

 module.exports = router;