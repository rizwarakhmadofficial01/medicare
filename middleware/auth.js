// middleware/auth.js
function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) return next();
  req.flash('error', 'Silakan login terlebih dahulu.');
  return res.redirect('/login');
}

function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') return next();
  req.flash('error', 'Akses ditolak. Halaman ini khusus Admin.');
  return res.redirect('/');
}

function isUser(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'user') return next();
  req.flash('error', 'Akses ditolak. Halaman ini khusus Pasien.');
  return res.redirect('/');
}

// Attach current user + flash messages to all views automatically
function attachLocals(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  res.locals.successMsg = req.flash('success');
  res.locals.errorMsg = req.flash('error');
  next();
}

module.exports = { isLoggedIn, isAdmin, isUser, attachLocals };
