// routes/seekerProfile.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const { ensureAuthenticated, ensureSeeker } = require('../middleware/authMiddleware');
const {
    skillsList, degreeLevelsList, fieldsOfStudyList,
    locationsList, broaderCategoriesList, jobTypeList
} = require('../config/selectData');

// GET route to display the profile form (for create or edit)
router.get('/form', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    try {
        const profile = await JobSeekerProfile.findOne({ user_id: req.user.id });
        const profileData = profile ? profile.toObject() : { categoryExperience: [{}] };
        if (profile && (!profile.categoryExperience || profile.categoryExperience.length === 0)) {
             profileData.categoryExperience = [{}];
        }

        res.render('seeker/profileForm', {
            title: profile ? 'Edit Profile' : 'Create Profile',
            activeNavItem: 'profileSetup', // This page is 'profileSetup'
            isEditMode: !!profile,
            profileData: profileData,
            skillsList, degreeLevelsList, fieldsOfStudyList,
            locationsList, broaderCategoriesList, jobTypeList,
            errors: []
        });
    } catch (err) {
        console.error("Error fetching profile for form:", err);
        next(err);
    }
});


// POST route to handle profile creation or update
router.post('/', ensureAuthenticated, ensureSeeker, async (req, res) => {
    const {
        fullName, skills, degreeLevel, fieldOfStudy,
        preferredLocations, isWillingToRemote, desiredJobTypes, summary,
        categoryExperience // This will be an array of objects
    } = req.body;

    // --- Start Validation ---
    const errors = [];
    if (!fullName || fullName.trim() === '') errors.push({ msg: 'Full name is required.' });
    if (!skills || (Array.isArray(skills) && skills.length === 0) || (typeof skills === 'string' && !skills)) {
        errors.push({ msg: 'At least one skill is required.' });
    }
    if (!degreeLevel || degreeLevel === '') errors.push({ msg: 'Degree level is required.' });
    if (!fieldOfStudy || fieldOfStudy === '') errors.push({ msg: 'Field of study is required.' });
    if (!desiredJobTypes || (Array.isArray(desiredJobTypes) && desiredJobTypes.length === 0) || (typeof desiredJobTypes === 'string' && !desiredJobTypes)) {
        errors.push({ msg: 'At least one desired job type is required.' });
    }
    // Validate categoryExperience entries
    let totalYearsInCategoryExp = 0;
    if (categoryExperience && Array.isArray(categoryExperience)) {
        categoryExperience.forEach((exp, index) => {
            if (!exp.category_id || exp.category_id === '') {
                // Allow empty category if years is also empty (user might have added an empty row)
                if (exp.years && exp.years !== '') {
                     errors.push({ msg: `Category is required for experience entry #${index + 1} if years are specified.` });
                }
            }
            if (exp.category_id && (exp.years === undefined || exp.years === '' || parseInt(exp.years) < 0)) {
                errors.push({ msg: `Valid years are required for experience category "${exp.category_id}" (entry #${index + 1}).` });
            }
            if (exp.years && exp.years !== '') totalYearsInCategoryExp += parseInt(exp.years);
        });
    }
    if (totalYearsInCategoryExp === 0 && (!categoryExperience || categoryExperience.filter(e => e.category_id && e.years).length === 0)) {
        
    }


    if (errors.length > 0) {
        const currentProfileData = { ...req.body };
        if (!currentProfileData.categoryExperience || currentProfileData.categoryExperience.length === 0) {
            currentProfileData.categoryExperience = [{}]; 
        }
        return res.status(400).render('seeker/profileForm', {
            title: 'Create/Edit Profile',
            isEditMode: await JobSeekerProfile.exists({ user_id: req.user.id }),
            profileData: currentProfileData,
            skillsList, degreeLevelsList, fieldsOfStudyList,
            locationsList, broaderCategoriesList, jobTypeList,
            errors
        });
    }

    const profileFields = {
        user_id: req.user.id,
        fullName: fullName.trim(),
        skills: Array.isArray(skills) ? skills : (skills ? [skills.trim()] : []),
        degreeLevel,
        fieldOfStudy,
        preferredLocations: Array.isArray(preferredLocations) ? preferredLocations : (preferredLocations ? [preferredLocations.trim()] : []),
        isWillingToRemote: isWillingToRemote === 'true',
        desiredJobTypes: Array.isArray(desiredJobTypes) ? desiredJobTypes : (desiredJobTypes ? [desiredJobTypes.trim()] : []),
        summary: summary ? summary.trim() : '',
        categoryExperience: []
    };

    if (categoryExperience && Array.isArray(categoryExperience)) {
        profileFields.categoryExperience = categoryExperience
            .filter(exp => exp.category_id && exp.category_id !== '' && exp.years !== undefined && exp.years !== '' && parseInt(exp.years) >= 0)
            .map(exp => ({
                category_id: exp.category_id,
                years: parseInt(exp.years)
            }));
    }

    try {
        const updatedProfile = await JobSeekerProfile.findOneAndUpdate(
            { user_id: req.user.id },
            { $set: profileFields },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        res.redirect('/profile/me');
    } catch (err) {
        console.error("Error saving profile:", err);
        const mongooseErrors = [];
        if (err.errors) {
            for (let field in err.errors) { mongooseErrors.push({ msg: err.errors[field].message }); }
        }
        const currentProfileData = { ...req.body };
         if (!currentProfileData.categoryExperience || currentProfileData.categoryExperience.length === 0) {
            currentProfileData.categoryExperience = [{}];
        }
        res.status(500).render('seeker/profileForm', {
            title: 'Create/Edit Profile',
            isEditMode: await JobSeekerProfile.exists({ user_id: req.user.id }),
            profileData: currentProfileData,
            skillsList, degreeLevelsList, fieldsOfStudyList,
            locationsList, broaderCategoriesList, jobTypeList,
            errors: mongooseErrors.length > 0 ? mongooseErrors : [{ msg: 'Error saving profile.' }]
        });
    }
});

// GET route to view own profile
router.get('/me', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    try {
        const profile = await JobSeekerProfile.findOne({ user_id: req.user.id });
        if (!profile) {
            return res.redirect('/profile/form');
        }
        res.render('seeker/viewProfile', {
            title: 'My Profile',
            activeNavItem: 'viewProfile',
            profileData: profile.toObject(),
            skillsList, degreeLevelsList, fieldsOfStudyList,
            locationsList, broaderCategoriesList, jobTypeList
        });
    } catch (err) {
        console.error("Error fetching profile to view:", err);
        next(err);
    }
});


module.exports = router;