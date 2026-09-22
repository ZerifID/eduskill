const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Helper to sanitize user object
function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...rest } = user;
  return rest;
}

const authController = {
  // Render Login Page
  getLogin: (req, res) => {
    if (req.session && req.session.user) {
      return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/');
    }
    res.render('auth/login', { title: 'Masuk Akun' });
  },

  // Process Login
  postLogin: (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      req.session.flashError = 'Email dan password wajib diisi!';
      return res.redirect('/auth/login');
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      req.session.flashError = 'Email atau password salah!';
      return res.redirect('/auth/login');
    }

    req.session.user = sanitizeUser(user);
    req.session.flashSuccess = `Selamat datang kembali, ${user.name}!`;

    const redirectTo = req.session.returnTo || (user.role === 'admin' ? '/admin/dashboard' : '/my-courses');
    delete req.session.returnTo;
    return res.redirect(redirectTo);
  },

  // Render Register Page
  getRegister: (req, res) => {
    if (req.session && req.session.user) {
      return res.redirect('/');
    }
    res.render('auth/register', { title: 'Daftar Akun Baru' });
  },

  // Process Register
  postRegister: (req, res) => {
    const { name, email, password, confirm_password } = req.body;

    if (!name || !email || !password) {
      req.session.flashError = 'Semua field wajib diisi!';
      return res.redirect('/auth/register');
    }

    if (password !== confirm_password) {
      req.session.flashError = 'Konfirmasi password tidak cocok!';
      return res.redirect('/auth/register');
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      req.session.flashError = 'Email sudah terdaftar. Silakan login!';
      return res.redirect('/auth/register');
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (?, ?, ?, 'student')
    `).run(name.trim(), email.trim().toLowerCase(), passwordHash);

    const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(insert.lastInsertRowid);
    req.session.user = sanitizeUser(newUser);
    req.session.flashSuccess = 'Pendaftaran berhasil! Selamat belajar.';
    return res.redirect('/');
  },

  // Logout
  getLogout: (req, res) => {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  }
};

module.exports = authController;
