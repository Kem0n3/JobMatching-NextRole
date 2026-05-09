const masterVocabulary = require('./vocabularyService');

const WEIGHTS = {
    skillSimilarity: 0.4,
    experienceScore: 0.30,
    educationScore: 0.15,
    locationScore: 0.1,
    jobTypeScore: 0.05
};

const degreeOrder = {
    "none": 0, "highschool": 1, "vocational": 2, "associate": 3,
    "bachelors": 4, "masters": 5, "professional": 6, "doctorate": 7, "other": 0
};

const { fieldOfStudyCategories } = require('../config/selectData');

const fieldIdToSuperCategory = Object.entries(fieldOfStudyCategories || {}).reduce((acc, [category, fieldIds]) => {
    if (Array.isArray(fieldIds)) {
        fieldIds.forEach(fieldId => {
            acc[fieldId] = category;
        });
    }
    return acc;
}, {});

function findSuperCategory(fieldId) {
    if (!fieldId) return null;
    return fieldIdToSuperCategory[fieldId] || null;
}

function vectorizeSkills(skills, requiredWeight = 1.0, preferredWeight = 0.5) {
    const skillSlice = masterVocabulary.slices.skills;
    const vector = new Array(skillSlice.end - skillSlice.start).fill(0);

    if (skills.required) {
        skills.required.forEach(skillId => {
            const index = masterVocabulary.featureMap.get(skillId);
            if (index !== undefined && index >= skillSlice.start && index < skillSlice.end) {
                vector[index - skillSlice.start] = requiredWeight;
            }
        });
    }
    if (skills.preferred) {
        skills.preferred.forEach(skillId => {
            const index = masterVocabulary.featureMap.get(skillId);
            if (index !== undefined && index >= skillSlice.start && index < skillSlice.end) {
                if (vector[index - skillSlice.start] === 0) {
                    vector[index - skillSlice.start] = preferredWeight;
                }
            }
        });
    }
    return vector;
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;
    return dotProduct / magnitude;
}

function scoreExperience(seekerCategoryExp, jobExpRequirements) {
    if (!jobExpRequirements || jobExpRequirements.length === 0) return 1.0;
    if (!seekerCategoryExp) seekerCategoryExp = [];

    let totalScore = 0;
    let relevantRequirementsCount = 0;

    for (const req of jobExpRequirements) {
        if (!req.category_id || req.minYears === undefined) continue;
        relevantRequirementsCount++;
        const seekerExp = seekerCategoryExp.find(e => e.category_id === req.category_id);
        if (seekerExp) {
            if (seekerExp.years >= req.minYears) {
                totalScore += 1.0;
            } else {
                totalScore += seekerExp.years / req.minYears;
            }
        }
    }
    if (relevantRequirementsCount === 0) return 1.0;
    return totalScore / relevantRequirementsCount;
}

function scoreEducation(seekerDegree, seekerField, jobMinDegree, jobPreferredField) {
    let degreeScore = 0;
    const seekerOrdinal = degreeOrder[seekerDegree] || -1;
    const jobMinOrdinal = degreeOrder[jobMinDegree] || -1;

    if (jobMinOrdinal <= 0) {
        degreeScore = 1.0;
    } else if (seekerOrdinal >= jobMinOrdinal) {
        degreeScore = 1.0;
    } else if (seekerOrdinal === jobMinOrdinal - 1) {
        degreeScore = 0.5;
    }

    let fieldScore = 0.5;
    if (jobPreferredField && jobPreferredField !== "" && jobPreferredField !== "notapplicable") {
        if (seekerField === jobPreferredField) {
            fieldScore = 1.0;
        } else {
            const seekerSuperCategory = findSuperCategory(seekerField);
            const jobSuperCategory = findSuperCategory(jobPreferredField);
            if (seekerSuperCategory && jobSuperCategory && seekerSuperCategory === jobSuperCategory) {
                fieldScore = 0.8;
            } else {
                fieldScore = 0.1;
            }
        }
    } else {
        fieldScore = 1.0;
    }
    return (degreeScore * 0.7) + (fieldScore * 0.3);
}

function scoreLocation(seekerLocations, seekerWillingRemote, jobLocation, jobAllowsRemote) {
    if (!seekerLocations) seekerLocations = [];
    if (jobLocation === "remote") {
        return seekerWillingRemote || seekerLocations.includes("remote") ? 1.0 : 0.3;
    }
    if (jobAllowsRemote) {
        if (seekerLocations.includes(jobLocation)) return 1.0;
        if (seekerWillingRemote || seekerLocations.includes("remote")) return 0.8;
        if (seekerLocations.includes("anywhere")) return 0.7;
        return 0.2;
    }
    if (seekerLocations.includes(jobLocation)) return 1.0;
    if (seekerLocations.includes("anywhere")) return 0.5;
    return 0;
}

function scoreJobType(seekerDesiredTypes, jobType) {
    if (!seekerDesiredTypes || seekerDesiredTypes.length === 0 || !jobType) return 0.5;
    return seekerDesiredTypes.includes(jobType) ? 1.0 : 0.1;
}

function calculateOverallMatchScore(seekerProfile, jobPosting) {
    if (!seekerProfile || !jobPosting) return 0;

    const sSkills = seekerProfile.skills || [];
    const jReqSkills = jobPosting.requiredSkills || [];

    if (jReqSkills.length > 0 && sSkills.length > 0) {
        const seekerSkillSet = new Set(sSkills);
        const jobRequiredSkillSet = new Set(jReqSkills);
        const intersection = new Set([...seekerSkillSet].filter(skill => jobRequiredSkillSet.has(skill)));
        if (intersection.size === 0) {
            return 0;
        }
    } else if (jReqSkills.length > 0 && sSkills.length === 0) {
        return 0;
    }

    const seekerSkillVector = vectorizeSkills({ required: sSkills });
    const jobSkillVector = vectorizeSkills({ required: jReqSkills, preferred: jobPosting.preferredSkills });
    const skillSimilarity = cosineSimilarity(seekerSkillVector, jobSkillVector);

    const experienceScore = scoreExperience(seekerProfile.categoryExperience, jobPosting.experienceRequirements);
    const educationScore = scoreEducation(seekerProfile.degreeLevel, seekerProfile.fieldOfStudy, jobPosting.minimumDegreeLevel, jobPosting.preferredFieldOfStudy);
    const locationScore = scoreLocation(seekerProfile.preferredLocations, seekerProfile.isWillingToRemote, jobPosting.jobLocation, jobPosting.allowsRemote);
    const jobTypeScore = scoreJobType(seekerProfile.desiredJobTypes, jobPosting.jobType);

    const overallScore =
        (skillSimilarity * WEIGHTS.skillSimilarity) +
        (experienceScore * WEIGHTS.experienceScore) +
        (educationScore * WEIGHTS.educationScore) +
        (locationScore * WEIGHTS.locationScore) +
        (jobTypeScore * WEIGHTS.jobTypeScore);

    return parseFloat(overallScore.toFixed(4));
}

module.exports = { calculateOverallMatchScore };
