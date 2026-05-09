const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const JobSeekerProfile = require('../models/JobSeekerProfile');
const User = require('../models/User');
const upload = require('../config/multerConfig');
const { parseResume } = require('../services/resumeParserService');
const { ensureAuthenticated, ensureSeeker, ensureRecruiter } = require('../middleware/authMiddleware');
const {
    skillsList, degreeLevelsList, fieldsOfStudyList,
    locationsList, broaderCategoriesList, jobTypeList
} = require('../config/selectData');

const VALID_SKILL_IDS = new Set(skillsList.map(skill => skill.id));
const VALID_DEGREE_IDS = new Set(degreeLevelsList.map(degree => degree.id));
const VALID_FIELD_IDS = new Set(fieldsOfStudyList.map(field => field.id));

function parseNonNegativeNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeStringArray(value) {
    if (Array.isArray(value)) {
        return value
            .map(item => String(item || '').trim())
            .filter(item => item !== '');
    }

    if (value === undefined || value === null) return [];

    const trimmed = String(value).trim();
    return trimmed ? [trimmed] : [];
}

function normalizeCategoryExperience(categoryExperience) {
    if (!categoryExperience) return [];

    if (Array.isArray(categoryExperience)) {
        return categoryExperience;
    }

    if (typeof categoryExperience === 'object') {
        return Object.keys(categoryExperience)
            .sort((a, b) => Number(a) - Number(b))
            .map(key => categoryExperience[key]);
    }

    return [];
}

function getSafeRedirectPath(value, fallback = '/profile/form') {
    const allowed = new Set(['/profile/form', '/profile/me', '/profile/resume/review']);
    return allowed.has(value) ? value : fallback;
}

function getResumeDraft(req) {
    return req.session && req.session.resumeDraft ? req.session.resumeDraft : null;
}

function clearResumeDraft(req) {
    if (req.session && req.session.resumeDraft) {
        delete req.session.resumeDraft;
    }
}

function createResumePayload(file, parsed) {
    return {
        resumeUrl: `/uploads/resumes/${file.filename}`,
        resumeOriginalName: file.originalname,
        resumeUploadedAt: new Date(),
        resumeParsedData: {
            skills: Array.isArray(parsed.skills) ? parsed.skills.filter(skill => VALID_SKILL_IDS.has(skill)) : [],
            degreeLevel: parsed.degreeLevel && VALID_DEGREE_IDS.has(parsed.degreeLevel) ? parsed.degreeLevel : null,
            fieldOfStudy: parsed.fieldOfStudy && VALID_FIELD_IDS.has(parsed.fieldOfStudy) ? parsed.fieldOfStudy : null,
            extractedText: parsed.extractedText || null
        }
    };
}

function applyResumeDraftToProfileData(profileData, resumeDraft) {
    if (!resumeDraft || !resumeDraft.resumeParsedData) {
        return profileData;
    }

    const parsed = resumeDraft.resumeParsedData;
    const nextData = { ...profileData };

    if ((!nextData.skills || nextData.skills.length === 0) && parsed.skills && parsed.skills.length > 0) {
        nextData.skills = parsed.skills;
    }

    if ((!nextData.degreeLevel || nextData.degreeLevel === '') && parsed.degreeLevel) {
        nextData.degreeLevel = parsed.degreeLevel;
    }

    if ((!nextData.fieldOfStudy || nextData.fieldOfStudy === '') && parsed.fieldOfStudy) {
        nextData.fieldOfStudy = parsed.fieldOfStudy;
    }

    return nextData;
}

async function renderProfileForm(req, res, options = {}) {
    const {
        statusCode = 200,
        errors = [],
        profileData = null,
        title = null,
        isEditMode = null
    } = options;

    const existingProfile = await JobSeekerProfile.findOne({ user_id: req.user.id });
    const resumeDraft = getResumeDraft(req);

    let resolvedProfileData = profileData
        ? { ...profileData }
        : (existingProfile ? existingProfile.toObject() : { categoryExperience: [{}] });

    if (!existingProfile) {
        resolvedProfileData = applyResumeDraftToProfileData(resolvedProfileData, resumeDraft);
    }

    if (!resolvedProfileData.categoryExperience || resolvedProfileData.categoryExperience.length === 0) {
        resolvedProfileData.categoryExperience = [{}];
    }

    return res.status(statusCode).render('seeker/profileForm', {
        title: title || (existingProfile ? 'Edit Profile' : 'Create Profile'),
        activeNavItem: 'profileSetup',
        isEditMode: isEditMode !== null ? isEditMode : !!existingProfile,
        profileData: resolvedProfileData,
        skillsList,
        degreeLevelsList,
        fieldsOfStudyList,
        locationsList,
        broaderCategoriesList,
        jobTypeList,
        errors,
        resumeDraft,
        resumePrefillMode: !existingProfile && !!resumeDraft
    });
}

function handleResumeUpload(req, res, next) {
    upload.single('resume')(req, res, function uploadCallback(err) {
        if (!err) {
            return next();
        }

        const redirectTo = getSafeRedirectPath(req.body && req.body.redirectTo, '/profile/form');

        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            if (req.flash) req.flash('error_msg', 'Resume file must be 5MB or smaller.');
            return res.redirect(redirectTo);
        }

        if (req.flash) {
            req.flash('error_msg', err.message || 'Resume upload failed. Please try again.');
        }
        return res.redirect(redirectTo);
    });
}

// --- Routes for Seekers Managing Their Own Profile ---

router.get('/form', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    try {
        await renderProfileForm(req, res);
    } catch (err) {
        console.error('Error fetching profile for form:', err);
        next(err);
    }
});

router.post('/', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    const {
        fullName,
        skills,
        degreeLevel,
        fieldOfStudy,
        preferredLocations,
        isWillingToRemote,
        desiredJobTypes,
        summary,
        categoryExperience
    } = req.body;

    const normalizedSkills = normalizeStringArray(skills);
    const normalizedDesiredJobTypes = normalizeStringArray(desiredJobTypes);
    const normalizedPreferredLocations = normalizeStringArray(preferredLocations);
    const normalizedCategoryExperience = normalizeCategoryExperience(categoryExperience);

    const errors = [];

    if (!fullName || fullName.trim() === '') errors.push({ msg: 'Full name is required.' });
    if (normalizedSkills.length === 0) errors.push({ msg: 'At least one skill is required.' });
    if (!degreeLevel || degreeLevel === '') errors.push({ msg: 'Degree level is required.' });
    if (!fieldOfStudy || fieldOfStudy === '') errors.push({ msg: 'Field of study is required.' });
    if (normalizedDesiredJobTypes.length === 0) {
        errors.push({ msg: 'At least one desired job type is required.' });
    }

    normalizedCategoryExperience.forEach((exp, index) => {
        if (exp.category_id && parseNonNegativeNumber(exp.years) === null) {
            errors.push({ msg: `Valid years are required for experience category (entry #${index + 1}).` });
        }
        if (!exp.category_id && exp.years && exp.years !== '') {
            errors.push({ msg: `Category is required for experience entry #${index + 1} if years are specified.` });
        }
    });

    if (errors.length > 0) {
        const currentProfileData = {
            ...req.body,
            skills: normalizedSkills,
            desiredJobTypes: normalizedDesiredJobTypes,
            preferredLocations: normalizedPreferredLocations,
            categoryExperience: normalizedCategoryExperience.length > 0 ? normalizedCategoryExperience : [{}]
        };

        try {
            return await renderProfileForm(req, res, {
                statusCode: 400,
                title: 'Create/Edit Profile',
                isEditMode: await JobSeekerProfile.exists({ user_id: req.user.id }),
                profileData: currentProfileData,
                errors
            });
        } catch (renderError) {
            return next(renderError);
        }
    }

    const profileFields = {
        user_id: req.user.id,
        fullName: fullName.trim(),
        skills: normalizedSkills,
        degreeLevel,
        fieldOfStudy,
        preferredLocations: normalizedPreferredLocations,
        isWillingToRemote: isWillingToRemote === 'true',
        desiredJobTypes: normalizedDesiredJobTypes,
        summary: summary ? summary.trim() : '',
        categoryExperience: normalizedCategoryExperience
            .filter(exp => exp.category_id && exp.category_id !== '' && parseNonNegativeNumber(exp.years) !== null)
            .map(exp => ({
                category_id: exp.category_id,
                years: parseNonNegativeNumber(exp.years)
            }))
    };

    const resumeDraft = getResumeDraft(req);
    if (resumeDraft) {
        profileFields.resumeUrl = resumeDraft.resumeUrl || null;
        profileFields.resumeOriginalName = resumeDraft.resumeOriginalName || null;
        profileFields.resumeUploadedAt = resumeDraft.resumeUploadedAt || null;
        profileFields.resumeParsedData = {
            skills: (Array.isArray(resumeDraft.resumeParsedData && resumeDraft.resumeParsedData.skills)
                ? resumeDraft.resumeParsedData.skills
                : [])
                .filter(skill => VALID_SKILL_IDS.has(skill)),
            degreeLevel: (resumeDraft.resumeParsedData && VALID_DEGREE_IDS.has(resumeDraft.resumeParsedData.degreeLevel))
                ? resumeDraft.resumeParsedData.degreeLevel
                : null,
            fieldOfStudy: (resumeDraft.resumeParsedData && VALID_FIELD_IDS.has(resumeDraft.resumeParsedData.fieldOfStudy))
                ? resumeDraft.resumeParsedData.fieldOfStudy
                : null,
            extractedText: (resumeDraft.resumeParsedData && resumeDraft.resumeParsedData.extractedText)
                ? String(resumeDraft.resumeParsedData.extractedText)
                : null
        };
    }

    try {
        await JobSeekerProfile.findOneAndUpdate(
            { user_id: req.user.id },
            { $set: profileFields },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        clearResumeDraft(req);
        if (req.flash) req.flash('success_msg', 'Profile saved successfully!');
        res.redirect('/profile/me');
    } catch (err) {
        console.error('Error saving profile:', err);

        const mongooseErrors = [];
        if (err.errors) {
            Object.keys(err.errors).forEach(field => {
                mongooseErrors.push({ msg: err.errors[field].message });
            });
        } else {
            mongooseErrors.push({ msg: 'An unexpected error occurred while saving your profile.' });
        }

        const currentProfileData = {
            ...req.body,
            skills: normalizedSkills,
            desiredJobTypes: normalizedDesiredJobTypes,
            preferredLocations: normalizedPreferredLocations,
            categoryExperience: normalizedCategoryExperience.length > 0 ? normalizedCategoryExperience : [{}]
        };

        try {
            await renderProfileForm(req, res, {
                statusCode: 500,
                title: 'Create/Edit Profile',
                isEditMode: await JobSeekerProfile.exists({ user_id: req.user.id }),
                profileData: currentProfileData,
                errors: mongooseErrors
            });
        } catch (renderError) {
            next(renderError);
        }
    }
});

router.post('/resume/upload', ensureAuthenticated, ensureSeeker, handleResumeUpload, async (req, res) => {
    const redirectTo = getSafeRedirectPath(req.body && req.body.redirectTo, '/profile/form');

    if (!req.file) {
        if (req.flash) req.flash('error_msg', 'No file uploaded or file type not accepted.');
        return res.redirect(redirectTo);
    }

    try {
        const parsed = await parseResume(req.file.path);
        const resumePayload = createResumePayload(req.file, parsed);
        const existingProfile = await JobSeekerProfile.findOne({ user_id: req.user.id });

        if (existingProfile) {
            await JobSeekerProfile.findOneAndUpdate(
                { user_id: req.user.id },
                {
                    $set: {
                        resumeUrl: resumePayload.resumeUrl,
                        resumeOriginalName: resumePayload.resumeOriginalName,
                        resumeUploadedAt: resumePayload.resumeUploadedAt,
                        resumeParsedData: resumePayload.resumeParsedData
                    }
                },
                { runValidators: true }
            );

            clearResumeDraft(req);

            if (req.flash) {
                if (parsed.success) {
                    req.flash('success_msg', `Resume uploaded. We detected ${resumePayload.resumeParsedData.skills.length} skill(s). Review suggestions before applying.`);
                } else {
                    req.flash('success_msg', 'Resume uploaded, but we could not extract text automatically. You can still replace or continue manually.');
                }
            }

            return res.redirect('/profile/resume/review');
        }

        req.session.resumeDraft = resumePayload;

        if (req.flash) {
            if (parsed.success) {
                req.flash('success_msg', 'Resume uploaded. We prefilled your profile form with detected suggestions. Please review and save your profile.');
            } else {
                req.flash('success_msg', 'Resume uploaded, but text extraction was limited. Please fill your profile details manually.');
            }
        }

        return res.redirect('/profile/form');
    } catch (err) {
        console.error('Resume upload error:', err);
        if (req.flash) req.flash('error_msg', 'An error occurred during upload. Please try again.');
        return res.redirect(redirectTo);
    }
});

router.get('/resume/review', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    try {
        const profile = await JobSeekerProfile.findOne({ user_id: req.user.id });

        if (!profile || !profile.resumeUrl) {
            if (req.flash) req.flash('error_msg', 'Upload a resume first to review suggestions.');
            return res.redirect('/profile/form');
        }

        const profileData = profile.toObject();
        const parsedData = profileData.resumeParsedData || {};
        const existingSkills = new Set(profileData.skills || []);
        const detectedSkills = normalizeStringArray(parsedData.skills)
            .filter(skillId => VALID_SKILL_IDS.has(skillId));
        const suggestedSkills = detectedSkills.filter(skillId => !existingSkills.has(skillId));

        return res.render('seeker/resumeReview', {
            title: 'Review Resume Suggestions',
            activeNavItem: 'profileSetup',
            profileData,
            parsedData,
            suggestedSkills,
            skillsList,
            degreeLevelsList,
            fieldsOfStudyList
        });
    } catch (err) {
        console.error('Error loading resume review page:', err);
        next(err);
    }
});

router.post('/resume/apply', ensureAuthenticated, ensureSeeker, async (req, res, next) => {
    try {
        const profile = await JobSeekerProfile.findOne({ user_id: req.user.id });
        if (!profile) {
            if (req.flash) req.flash('error_msg', 'Create your profile first.');
            return res.redirect('/profile/form');
        }

        const selectedSkills = normalizeStringArray(req.body.applySkills)
            .filter(skillId => VALID_SKILL_IDS.has(skillId));
        const selectedDegree = (req.body.applyDegree && VALID_DEGREE_IDS.has(req.body.applyDegree))
            ? req.body.applyDegree
            : null;
        const selectedField = (req.body.applyField && VALID_FIELD_IDS.has(req.body.applyField))
            ? req.body.applyField
            : null;

        const updateFields = {};

        if (selectedSkills.length > 0) {
            updateFields.skills = [...new Set([...(profile.skills || []), ...selectedSkills])];
        }

        if (selectedDegree) {
            updateFields.degreeLevel = selectedDegree;
        }

        if (selectedField) {
            updateFields.fieldOfStudy = selectedField;
        }

        if (Object.keys(updateFields).length === 0) {
            if (req.flash) req.flash('success_msg', 'No new suggestions were selected to apply.');
            return res.redirect('/profile/me');
        }

        await JobSeekerProfile.findOneAndUpdate(
            { user_id: req.user.id },
            { $set: updateFields },
            { runValidators: true }
        );

        if (req.flash) req.flash('success_msg', 'Profile updated with resume suggestions.');
        return res.redirect('/profile/me');
    } catch (err) {
        console.error('Error applying resume suggestions:', err);
        next(err);
    }
});

router.post('/resume/draft/clear', ensureAuthenticated, ensureSeeker, (req, res) => {
    clearResumeDraft(req);
    if (req.flash) req.flash('success_msg', 'Uploaded resume draft was cleared.');
    const redirectTo = getSafeRedirectPath(req.body && req.body.redirectTo, '/profile/form');
    return res.redirect(redirectTo);
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
            profileOwner: req.user.toObject(),
            isRecruiterView: false,
            skillsList,
            degreeLevelsList,
            fieldsOfStudyList,
            locationsList,
            broaderCategoriesList,
            jobTypeList
        });
    } catch (err) {
        console.error('Error fetching profile to view:', err);
        next(err);
    }
});

// --- Route for Recruiters to View a Seeker's Profile ---
router.get('/seeker/:userId', ensureAuthenticated, ensureRecruiter, async (req, res, next) => {
    const seekerUserId = req.params.userId;
    if (!mongoose.Types.ObjectId.isValid(seekerUserId)) {
        return res.status(404).render('error', { title: 'Not Found', message: 'Seeker ID is invalid.' });
    }

    try {
        const profile = await JobSeekerProfile.findOne({ user_id: seekerUserId });
        const seekerUser = await User.findById(seekerUserId).select('email');

        if (!profile || !seekerUser) {
            return res.status(404).render('error', { title: 'Not Found', message: 'Seeker profile not found.' });
        }

        res.render('seeker/viewProfile', {
            title: `${profile.fullName}'s Profile`,
            activeNavItem: 'browseSeekers',
            profileData: profile.toObject(),
            profileOwner: seekerUser.toObject(),
            isRecruiterView: true,
            skillsList,
            degreeLevelsList,
            fieldsOfStudyList,
            locationsList,
            broaderCategoriesList,
            jobTypeList
        });
    } catch (err) {
        console.error('Error fetching seeker profile for recruiter view:', err);
        next(err);
    }
});

module.exports = router;
