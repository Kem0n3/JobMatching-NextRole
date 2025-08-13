// models/JobPosting.js
const mongoose = require('mongoose');

const ExperienceRequirementSchema = new mongoose.Schema({
    category_id: { type: String, required: true }, // ID from broaderCategoriesList
    // category_text: { type: String }, 
    minYears: { type: Number, required: true, min: 0 }
});

const JobPostingSchema = new mongoose.Schema({
    recruiter_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    jobTitle: {
        type: String,
        required: [true, 'Job title is required.'],
        trim: true
    },
    companyName: {
        type: String,
        required: [true, 'Company name is required.'],
        trim: true
    },
    jobDescription: {
        type: String,
        required: [true, 'Job description is required.'],
        trim: true
    },
    requiredSkills: { 
        type: [{ type: String }],
        required: [true, 'At least one required skill is necessary.'],
        validate: [val => val && val.length > 0, 'At least one required skill is necessary.']
    },
    preferredSkills: { 
        type: [{ type: String }],
        default: []
    },
    experienceRequirements: [ExperienceRequirementSchema],
    minimumDegreeLevel: { 
        type: String,
        required: [true, 'Minimum degree level is required.']
    },
    preferredFieldOfStudy: { 
        type: String,
        trim: true
    },
    jobLocation: { 
        type: String,
        required: [true, 'Job location is required.']
    },
    
    allowsRemote: { 
        type: Boolean,
        default: false
    },

    jobType: {
        type: String,
        required: [true, 'Job type is required.'],
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship']
    },
    careerLevel: {
        type: String,
        required: [true, 'Career level is required.'],
        enum: ['Entry-Level', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Manager', 'Director', 'Executive']
    },
    salaryRange: {
        type: String,
        trim: true
    },
    postedDate: {
        type: Date,
        default: Date.now
    },
    isActive: { 
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('JobPosting', JobPostingSchema);