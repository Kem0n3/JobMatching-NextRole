const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const { ensureAuthenticated, ensureSeeker } = require('../middleware/authMiddleware');
const {
    skillsList, degreeLevelsList, fieldsOfStudyList,
    locationsList, broaderCategoriesList, jobTypeList
} = require('../config/selectData');

router.get('/form', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    try {
        const profile = await JobSeekerProfile.findOne({ user_id: req.user.id });
        const profileData = profile ? profile.toObject() : { categoryExperience: [{}] };
        if (profile && (!profile.categoryExperience || profile.categoryExperience.length === 0)) {
             profileData.categoryExperience = [{}];
        }

        res.render('seeker/profileForm', {
            title: profile ? 'Edit Profile' : 'Create Profile',
            activeNavItem: 'profileSetup',
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

router.post('/', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    const {
        fullName, skills, degreeLevel, fieldOfStudy,
        preferredLocations, isWillingToRemote, desiredJobTypes, summary,
        categoryExperience
    } = req.body;

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

    if (categoryExperience && Array.isArray(categoryExperience)) {
        categoryExperience.forEach((exp, index) => {
            if (exp.category_id && (exp.years === undefined || exp.years === '' || parseInt(exp.years) < 0)) {
                errors.push({ msg: `Valid years are required for experience category (entry #${index + 1}).` });
            }
            if (!exp.category_id && exp.years && exp.years !== '') {
                errors.push({ msg: `Category is required for experience entry #${index + 1} if years are specified.` });
            }
        });
    }

    if (errors.length > 0) {
        const currentProfileData = { ...req.body };
        if (!currentProfileData.categoryExperience || currentProfileData.categoryExperience.length === 0) {
            currentProfileData.categoryExperience = [{}];
        }
        return res.status(400).render('seeker/profileForm', {
            title: 'Create/Edit Profile',
            activeNavItem: 'profileSetup',
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
        await JobSeekerProfile.findOneAndUpdate(
            { user_id: req.user.id },
            { $set: profileFields },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        if (req.flash) req.flash('success_msg', 'Profile saved successfully!');
        res.redirect('/profile/me');
    } catch (err) {
        console.error("Error saving profile:", err);
        const mongooseErrors = [];
        if (err.errors) {
            for (let field in err.errors) {
                mongooseErrors.push({ msg: err.errors[field].message });
            }
        } else {
            mongooseErrors.push({ msg: 'An unexpected error occurred while saving your profile.' });
        }
        const currentProfileData = { ...req.body };
        if (!currentProfileData.categoryExperience || currentProfileData.categoryExperience.length === 0) {
           currentProfileData.categoryExperience = [{}];
        }
        res.status(500).render('seeker/profileForm', {
            title: 'Create/Edit Profile',
            activeNavItem: 'profileSetup',
            isEditMode: await JobSeekerProfile.exists({ user_id: req.user.id }),
            profileData: currentProfileData,
            skillsList, degreeLevelsList, fieldsOfStudyList,
            locationsList, broaderCategoriesList, jobTypeList,
            errors: mongooseErrors
        });
    }
});

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
            skillsList,
            degreeLevelsList,
            fieldsOfStudyList,
            locationsList,
            broaderCategoriesList,
            jobTypeList
        });
    } catch (err) {
        console.error("Error fetching profile to view:", err);
        next(err);
    }
});

module.exports = router;