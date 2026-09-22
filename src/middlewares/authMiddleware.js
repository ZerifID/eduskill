// Authentication Middleware
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login');
}

// Admin Role Middleware
function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).render('auth/forbidden', {
    title: 'Akses Ditolak',
    user: req.session ? req.session.user : null
  });
}

// Inject User to All Views
function attachUserToViews(req, res, next) {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.flashSuccess = req.session ? req.session.flashSuccess : null;
  res.locals.flashError = req.session ? req.session.flashError : null;

  if (req.session) {
    delete req.session.flashSuccess;
    delete req.session.flashError;
  }
  next();
}

module.exports = {
  isAuthenticated,
  isAdmin,
  attachUserToViews
};
