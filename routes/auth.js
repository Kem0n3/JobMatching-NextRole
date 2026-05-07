const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');

router.get('/register', (req, res) => res.render('auth/register'));

router.get('/login', (req, res) => res.render('auth/login'));

router.post('/register', async (req, res) => {
    const { username, email, password, password2, role } = req.body;
    let errors = [];

    if (!username || !email || !password || !password2 || !role) {
        errors.push({ msg: 'Please enter all fields' });
    }
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match' });
    }
    if (password && password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters' });
    }

    if (errors.length > 0) {
        res.render('auth/register', { errors, username, email, role });
    } else {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (user) {
                errors.push({ msg: 'Email already exists' });
                res.render('auth/register', { errors, username, email, role });
            } else {
                const newUser = new User({ username, email, password, role });
                await newUser.save();
                req.flash('success_msg', 'You are now registered and can log in');
                res.redirect('/auth/login');
            }
        } catch (err) {
            console.error(err);
            res.render('auth/register', { errors: [{ msg: 'Something went wrong.' }] });
        }
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/auth/login',
        failureFlash: true 
    })(req, res, next);
});

router.get('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        req.flash('success_msg', 'You are logged out');
        res.redirect('/auth/login');
    });
});

module.exports = router;
