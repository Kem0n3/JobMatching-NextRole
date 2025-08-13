// middleware/profileDataMiddleware.js
const JobSeekerProfile = require('../models/JobSeekerProfile'); // Adjust path if necessary

function calculateProfileCompletionPercentage(profile) {
    if (!profile) return 0;
    let completedFields = 0;
    const totalConsideredFields = 6; // fullName, skills, categoryExperience, degreeLevel, fieldOfStudy, desiredJobTypes

    if (profile.fullName && profile.fullName.trim() !== '') completedFields++;
    if (profile.skills && profile.skills.length > 0) completedFields++;
    if (profile.categoryExperience && profile.categoryExperience.length > 0 &&
        profile.categoryExperience.some(exp => exp.category_id && typeof exp.years === 'number' && exp.years >= 0)) {
        completedFields++;
    }
    if (profile.degreeLevel && profile.degreeLevel !== '') completedFields++;
    if (profile.fieldOfStudy && profile.fieldOfStudy !== '') completedFields++;
    if (profile.desiredJobTypes && profile.desiredJobTypes.length > 0) completedFields++;

    if (totalConsideredFields === 0) return 100;
    return Math.min(100, Math.round((completedFields / totalConsideredFields) * 100));
}

async function addSeekerProfileData(req, res, next) {
    res.locals.profileCompletion = 0; 
    res.locals.displayNameForNav = req.isAuthenticated() ? req.user.username : "Guest"; // Default to username

    if (req.isAuthenticated() && req.user) {
        if (req.user.role === 'seeker') {
            try {
                const seekerProfile = await JobSeekerProfile.findOne({ user_id: req.user.id }).select('fullName'); // Only select fullName
                if (seekerProfile && seekerProfile.fullName) {
                    res.locals.displayNameForNav = seekerProfile.fullName;
                    // Calculate completion if profile exists
                    const fullProfileForCompletion = await JobSeekerProfile.findById(seekerProfile._id); // Fetch full for calc
                    res.locals.profileCompletion = calculateProfileCompletionPercentage(fullProfileForCompletion);
                } else {
                    res.locals.displayNameForNav = req.user.username; // Fallback if no profile/fullName
                }
            } catch (error) {
                console.error("Error fetching seeker profile for middleware:", error);
                res.locals.displayNameForNav = req.user.username; // Fallback on error
            }
        } else {
            res.locals.displayNameForNav = req.user.username;
        }
    }
    next();
}

module.exports = { addSeekerProfileData, calculateProfileCompletionPercentage };