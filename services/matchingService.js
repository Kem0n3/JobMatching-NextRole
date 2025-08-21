const masterVocabulary = require('./vocabularyService');

const WEIGHTS = {
    hardRequirements: 1.0, // If this score is not 1, the final score is 0
    skillSimilarity: 0.50, // Cosine similarity on skills
    experienceScore: 0.30, // Rule-based score for experience
    locationScore: 0.15,   // Rule-based score for location
    jobTypeScore: 0.05     // Rule-based score for job type
};

const degreeOrder = {
    "none": 0, "highschool": 1, "vocational": 2, "associate": 3,
    "bachelors": 4, "masters": 5, "professional": 6, "doctorate": 7, "other": 0
};

// --- Vectorization for SKILLS ONLY ---
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

// Rule-Based Scoring Functions 

function scoreHardRequirements(seekerProfile, jobPosting) {
    // Degree Level Check
    const seekerOrdinal = degreeOrder[seekerProfile.degreeLevel] || -1;
    const jobMinOrdinal = degreeOrder[jobPosting.minimumDegreeLevel] || -1;
    if (jobMinOrdinal > 0 && seekerOrdinal < jobMinOrdinal) {
        return 0; 
    }

    // Experience Check
    if (jobPosting.experienceRequirements) {
        for (const req of jobPosting.experienceRequirements) {
            const seekerExp = seekerProfile.categoryExperience.find(e => e.category_id === req.category_id);
    
            if (!seekerExp && req.minYears > 0) {
                return 0; 
            }
        }
    }
    return 1;
}

function scoreExperience(seekerCategoryExp, jobExpRequirements) {
    if (!jobExpRequirements || jobExpRequirements.length === 0) return 1.0;
    if (!seekerCategoryExp) seekerCategoryExp = [];

    let totalScore = 0;
    for (const req of jobExpRequirements) {
        const seekerExp = seekerCategoryExp.find(e => e.category_id === req.category_id);
        if (seekerExp) {
            if (seekerExp.years >= req.minYears) {
                totalScore += 1.0; 
            } else {
                // Partial credit based on ratio
                totalScore += seekerExp.years / req.minYears;
            }
        } // If seekerExp not found, score for this requirement is 0
    }
    return totalScore / jobExpRequirements.length; // Average score across all requirements
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

// Main Matching Function 
function calculateOverallMatchScore(seekerProfile, jobPosting) {
    if (!seekerProfile || !jobPosting) return 0;

    // Hard Requirement Filtering 
    const hardReqScore = scoreHardRequirements(seekerProfile, jobPosting);
    if (hardReqScore === 0) {
        return 0; // Immediately disqualify if hard requirements not met
    }

    // Skill Similarity using Cosine Similarity
    const seekerSkillVector = vectorizeSkills({ required: seekerProfile.skills });
    const jobSkillVector = vectorizeSkills({ required: jobPosting.requiredSkills, preferred: jobPosting.preferredSkills });
    const skillSimilarity = cosineSimilarity(seekerSkillVector, jobSkillVector);

    //  Experience Score (Rule-based)
    const experienceScore = scoreExperience(seekerProfile.categoryExperience, jobPosting.experienceRequirements);

    //  Location Score (Rule-based)
    const locationScore = scoreLocation(seekerProfile.preferredLocations, seekerProfile.isWillingToRemote, jobPosting.jobLocation, jobPosting.allowsRemote);

    //  Job Type Score (Rule-based)
    const jobTypeScore = scoreJobType(seekerProfile.desiredJobTypes, jobPosting.jobType);

    //  Weighted Sum of Soft Scores 
    const overallScore =
        (skillSimilarity * WEIGHTS.skillSimilarity) +
        (experienceScore * WEIGHTS.experienceScore) +
        (locationScore * WEIGHTS.locationScore) +
        (jobTypeScore * WEIGHTS.jobTypeScore);

    return parseFloat(overallScore.toFixed(4));
}

module.exports = { calculateOverallMatchScore };