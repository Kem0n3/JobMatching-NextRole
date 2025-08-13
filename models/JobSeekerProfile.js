// models/JobSeekerProfile.js
const mongoose = require('mongoose');

const CategoryExperienceSchema = new mongoose.Schema({
    category_id: { type: String, required: true }, 
    // category_text: { type: String, required: true }, 
    years: { type: Number, required: true, min: 0 }
});

const JobSeekerProfileSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fullName: { type: String, required: [true, 'Full name is required.'], trim: true },
    skills: { 
        type: [{ type: String }],
        required: [true, 'At least one skill is required.'],
        validate: [val => val.length > 0, 'At least one skill is required.']
    },
    categoryExperience: [CategoryExperienceSchema], // Using the sub-schema
    degreeLevel: { type: String, required: [true, 'Degree level is required.'] },
    fieldOfStudy: { type: String, required: [true, 'Field of study is required.'] },
    preferredLocations: { type: [{ type: String }], default: [] },
    isWillingToRemote: { type: Boolean, default: false },
    desiredJobTypes: { // Array of job type strings
        type: [{ type: String }],
        required: [true, 'At least one desired job type is required.'],
        validate: [val => val.length > 0, 'At least one desired job type is required.'],
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship'] 
    },
    summary: { type: String, trim: true, maxlength: [1000, 'Summary cannot be more than 1000 characters.'] }
}, { timestamps: true });

module.exports = mongoose.model('JobSeekerProfile', JobSeekerProfileSchema);