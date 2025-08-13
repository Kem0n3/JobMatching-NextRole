
module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        // req.flash('error_msg', 'Please log in to view that resource');
        res.redirect('/auth/login');
    },
    ensureGuest: function(req, res, next) { 
        if(!req.isAuthenticated()){
            return next();
        }
        res.redirect('/dashboard'); // Or appropriate dashboard based on role
    },
    ensureSeeker: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'seeker') {
            return next();
        }
        // req.flash('error_msg', 'Access denied. Seeker role required.');
        res.status(403).send('Access Denied: Seeker role required. <a href="/dashboard">Go to Dashboard</a>'); 
    },
    ensureRecruiter: function(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'recruiter') {
            return next();
        }
        // req.flash('error_msg', 'Access denied. Recruiter role required.');
        res.status(403).send('Access Denied: Recruiter role required. <a href="/dashboard">Go to Dashboard</a>'); // Or redirect
    }
};