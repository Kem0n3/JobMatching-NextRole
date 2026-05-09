const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const {
    getUnreadCount,
    getNotificationsForUser,
    markAllReadForUser
} = require('../services/notificationService');

// GET /notifications - render notification page
router.get('/', ensureAuthenticated, async (req, res, next) => {
    try {
        const notifications = await getNotificationsForUser(req.user.id, 30);
        await markAllReadForUser(req.user.id);
        res.render('notifications/index', {
            title: 'Notifications',
            activeNavItem: 'notifications',
            notifications
        });
    } catch (err) {
        next(err);
    }
});

// GET /notifications/unread-count - JSON endpoint for polling
router.get('/unread-count', ensureAuthenticated, async (req, res) => {
    const count = await getUnreadCount(req.user.id);
    res.json({ count });
});

// POST /notifications/mark-all-read
router.post('/mark-all-read', ensureAuthenticated, async (req, res) => {
    await markAllReadForUser(req.user.id);
    res.redirect('/notifications');
});

module.exports = router;
