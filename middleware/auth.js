// middleware/auth.js
function ensureAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        return res.redirect('/login');
    }
}

module.exports = { ensureAuth };
