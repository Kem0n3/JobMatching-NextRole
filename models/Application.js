// models/Application.js
const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
    job_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobPosting',
        required: true
    },
    seeker_user_id: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    applicationDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Applied', 'Viewed', 'Under Review', 'Interviewing', 'Offered', 'Hired', 'Rejected', 'Withdrawn'],
        default: 'Applied'
    }
}, { timestamps: true });

ApplicationSchema.index({ job_id: 1, seeker_user_id: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);