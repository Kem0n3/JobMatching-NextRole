const crypto = require('crypto');

function ensureCsrfToken(req) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    return req.session.csrfToken;
}

function csrfProtection(req, res, next) {
    const token = ensureCsrfToken(req);
    res.locals.csrfToken = token;

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        return next();
    }

    const submittedToken = req.body._csrf || req.get('x-csrf-token');
    if (submittedToken && submittedToken === token) {
        return next();
    }

    const error = new Error('Invalid or missing CSRF token.');
    error.status = 403;
    next(error);
}

module.exports = csrfProtection;
