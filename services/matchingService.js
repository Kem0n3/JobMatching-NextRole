
// --- Configuration for Weights ---
const WEIGHTS = {
    skills: 0.40,
    categoryExperience: 0.30,
    education: 0.15,
    location: 0.10,
    jobType: 0.05
};

// Jaccard Index 
function calculateJaccardIndex(setA, setB) {
    if (!Array.isArray(setA) || !Array.isArray(setB)) return 0;
    const uniqueSetA = new Set(setA.map(s => String(s).toLowerCase().trim())); 
    const uniqueSetB = new Set(setB.map(s => String(s).toLowerCase().trim())); 

    const intersection = new Set([...uniqueSetA].filter(item => uniqueSetB.has(item)));
    const union = new Set([...uniqueSetA, ...uniqueSetB]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
}

// Component 1: Skill Match 
function calculateSkillMatch(seekerSkills, jobRequiredSkills, jobPreferredSkills) {
    if (!seekerSkills) seekerSkills = [];
    if (!jobRequiredSkills) jobRequiredSkills = [];
    if (!jobPreferredSkills) jobPreferredSkills = [];

    const requiredMatchScore = calculateJaccardIndex(seekerSkills, jobRequiredSkills);

    let preferredBonus = 0;
    if (jobPreferredSkills.length > 0) {
        const preferredJaccardScore = calculateJaccardIndex(seekerSkills, jobPreferredSkills);
        preferredBonus = preferredJaccardScore * 0.25; // Max bonus of 0.25 for preferred skills
                                                    
    }

    let finalSkillScore;
    if (jobRequiredSkills.length === 0 && jobPreferredSkills.length > 0) {
        // If no required skills, score is based entirely on preferred skills (Jaccard directly)
        finalSkillScore = calculateJaccardIndex(seekerSkills, jobPreferredSkills);
    } else {
        finalSkillScore = requiredMatchScore + preferredBonus;
    }

    return Math.min(1, finalSkillScore); // Cap at 1
}

// --- Component 2: Category Experience Match (Refined with Partial Credit) ---
function calculateExperienceMatch(seekerCategoryExp, jobExpRequirements) {
    if (!seekerCategoryExp) seekerCategoryExp = [];
    if (!jobExpRequirements || jobExpRequirements.length === 0) {
        return 1; 
    }

    let totalScoreForMetRequirements = 0;
    let relevantRequirementsCount = 0;

    for (const req of jobExpRequirements) {
        if (!req.category_id || req.minYears === undefined) continue; 
        relevantRequirementsCount++;

        const seekerExpForCategory = seekerCategoryExp.find(exp => exp.category_id === req.category_id);

        if (seekerExpForCategory) {
            const seekerYears = parseFloat(seekerExpForCategory.years); 
            const requiredYears = parseFloat(req.minYears);       
            if (isNaN(seekerYears) || isNaN(requiredYears)) continue; 

            if (requiredYears <= 0) {
                totalScoreForMetRequirements += 1.0; // Full credit if job requires 0 years and seeker has the category
            } else if (seekerYears >= requiredYears) {
                totalScoreForMetRequirements += 1.0; // Full credit
            } else if (seekerYears >= requiredYears * 0.75) { // At least 75%
                totalScoreForMetRequirements += 0.65; // Partial credit
            } else if (seekerYears >= requiredYears * 0.50) { // At least 50%
                totalScoreForMetRequirements += 0.35; // Smaller partial credit
            }
           
        }
    }

    if (relevantRequirementsCount === 0) return 1; 
    return totalScoreForMetRequirements / relevantRequirementsCount; // Average score
}

// --- Component 3: Education Match 
const degreeOrder = {
    "none": 0, "highschool": 1, "vocational": 2, "associate": 3,
    "bachelors": 4, "masters": 5, "professional": 6, "doctorate": 7, "other": 0
};
function calculateEducationMatch(seekerDegree, seekerField, jobMinDegree, jobPreferredField) {
    let degreeScore = 0;
    const seekerOrdinal = degreeOrder[seekerDegree] !== undefined ? degreeOrder[seekerDegree] : -1;
    const jobOrdinal = degreeOrder[jobMinDegree] !== undefined ? degreeOrder[jobMinDegree] : -1;

    if (seekerOrdinal >= jobOrdinal && jobOrdinal !== -1) { // Ensure job has a valid degree requirement
        degreeScore = 1.0;
    } else if (jobOrdinal > 0 && seekerOrdinal === jobOrdinal - 1) {
        degreeScore = 0.5;
    } else if (jobOrdinal === -1) { // Job doesn't specify a minimum degree
        degreeScore = 0.7; 
    }

    let fieldScore = 0.5;
    if (jobPreferredField && jobPreferredField !== "" && jobPreferredField !== "notapplicable") {
        if (seekerField === jobPreferredField) fieldScore = 1.0;
        else fieldScore = 0.2;
    } else {
        fieldScore = 0.8;
    }
    if (!seekerField || seekerField === "" || seekerField === "notapplicable") {
        if (jobPreferredField && jobPreferredField !== "" && jobPreferredField !== "notapplicable") fieldScore = 0.3;
        else fieldScore = 0.7;
    }
    return (degreeScore * 0.7) + (fieldScore * 0.3);
}

// --- Component 4: Location Match (Using previous refined logic) ---
function calculateLocationMatch(seekerLocations, seekerWillingRemote, jobLocation, jobAllowsRemote) {
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
    if (seekerLocations.includes("anywhere") && !seekerWillingRemote) return 0.5;
    return 0;
}

//  Job Type Match 
function calculateJobTypeMatch(seekerDesiredTypes, jobType) {
    if (!seekerDesiredTypes || seekerDesiredTypes.length === 0 || !jobType) return 0.5;
    return seekerDesiredTypes.includes(jobType) ? 1.0 : 0.1;
}

// --- Main Matching Function ---
function calculateOverallMatchScore(seekerProfile, jobPosting) {
    
    if (!seekerProfile || !jobPosting) {
        console.warn("Missing seekerProfile or jobPosting for matching.");
        return 0;
    }

    const sSkills = seekerProfile.skills || [];
    const sCatExp = seekerProfile.categoryExperience || [];
    const sDegree = seekerProfile.degreeLevel;
    const sField = seekerProfile.fieldOfStudy;
    const sLocs = seekerProfile.preferredLocations || [];
    const sRemote = seekerProfile.isWillingToRemote || false;
    const sJobTypes = seekerProfile.desiredJobTypes || [];

    const jReqSkills = jobPosting.requiredSkills || [];
    const jPrefSkills = jobPosting.preferredSkills || [];
    const jExpReqs = jobPosting.experienceRequirements || [];
    const jMinDegree = jobPosting.minimumDegreeLevel;
    const jPrefField = jobPosting.preferredFieldOfStudy;
    const jLoc = jobPosting.jobLocation;
    const jAllowsRemote = jobPosting.allowsRemote || false;
    const jType = jobPosting.jobType;

    const skillScore = calculateSkillMatch(sSkills, jReqSkills, jPrefSkills);
    const expScore = calculateExperienceMatch(sCatExp, jExpReqs);
    const eduScore = calculateEducationMatch(sDegree, sField, jMinDegree, jPrefField);
    const locScore = calculateLocationMatch(sLocs, sRemote, jLoc, jAllowsRemote);
    const typeScore = calculateJobTypeMatch(sJobTypes, jType);

    const overallScore =
        (skillScore * WEIGHTS.skills) +
        (expScore * WEIGHTS.categoryExperience) +
        (eduScore * WEIGHTS.education) +
        (locScore * WEIGHTS.location) +
        (typeScore * WEIGHTS.jobType);

    // console.log(`Scores for Job ${jobPosting.jobTitle || 'N/A'} & Seeker ${seekerProfile.fullName || 'N/A'}: Skills=${skillScore.toFixed(2)}, Exp=${expScore.toFixed(2)}, Edu=${eduScore.toFixed(2)}, Loc=${locScore.toFixed(2)}, Type=${typeScore.toFixed(2)} => Overall=${overallScore.toFixed(2)}`);

    return parseFloat(overallScore.toFixed(4));
}

module.exports = { calculateOverallMatchScore, WEIGHTS };