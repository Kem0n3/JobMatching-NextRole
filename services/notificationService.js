const Notification = require('../models/Notification');

async function createNotification(userId, type, message, link = null) {
    try {
        await Notification.create({ user_id: userId, type, message, link });
    } catch (err) {
        // Notification failure must never crash the calling request
        console.error('Notification creation failed:', err.message);
    }
}

async function getUnreadCount(userId) {
    try {
        return await Notification.countDocuments({ user_id: userId, isRead: false });
    } catch (err) {
        console.error('Notification count failed:', err.message);
        return 0;
    }
}

async function getNotificationsForUser(userId, limit = 20) {
    try {
        return await Notification.find({ user_id: userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    } catch (err) {
        console.error('Notification fetch failed:', err.message);
        return [];
    }
}

async function markAllReadForUser(userId) {
    try {
        await Notification.updateMany(
            { user_id: userId, isRead: false },
            { $set: { isRead: true } }
        );
    } catch (err) {
        console.error('Notification mark-read failed:', err.message);
    }
}

module.exports = {
    createNotification,
    getUnreadCount,
    getNotificationsForUser,
    markAllReadForUser
};
