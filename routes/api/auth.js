// routes/api/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');

// @route   POST /api/auth/login
// @desc    Login user and return JSON response
// @access  Public
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json({ message: 'An error occurred during authentication.' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({ message: 'An error occurred during login.' });
            }
            const { password, ...userWithoutPassword } = user.toObject();
            return res.status(200).json({
                message: 'Login successful',
                user: userWithoutPassword
            });
        });
    })(req, res, next);
});

// @route   GET /api/auth/logout
// @desc    Logout user
// @access  Private
router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { 
            return res.status(500).json({ message: 'Logout failed.' });
        }
        res.status(200).json({ message: 'Logout successful' });
    });
});

module.exports = router;
