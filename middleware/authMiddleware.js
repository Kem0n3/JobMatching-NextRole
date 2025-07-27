
module.exports = {
    // This is for the original EJS-based routes
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Please log in to view that resource');
        res.redirect('/auth/login');
    },

    // This new middleware is for our React frontend API
    ensureApiAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        // Instead of redirecting, send a 401 Unauthorized status with a JSON message
        res.status(401).json({ message: 'Authentication required. Please log in.' });
    },

    ensureGuest: function(req, res, next) {
        if(!req.isAuthenticated()){
            return next();
        }
        res.redirect('/dashboard');
    },
    ensureSeeker: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'seeker') {
            return next();
        }
        res.status(403).send('Access Denied: Seeker role required. <a href="/dashboard">Go to Dashboard</a>');
    },
    ensureRecruiter: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'recruiter') {
            return next();
        }
        res.status(403).send('Access Denied: Recruiter role required. <a href="/dashboard">Go to Dashboard</a>');
    }
};