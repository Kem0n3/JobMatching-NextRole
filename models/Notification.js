const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['status_change', 'new_application', 'job_inactive'],
        required: true
    },
    message: {
        type: String,
        required: true,
        maxlength: 300
    },
    link: {
        type: String,
        default: null
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true
    }
}, { timestamps: true });

NotificationSchema.index({ user_id: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
