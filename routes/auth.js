// routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');

// ---------- REGISTER ----------
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Daftar Akun' });
});

router.post('/register', (req, res) => {
  const { name, email, password, confirm_password } = req.body;

  if (!name || !email || !password || !confirm_password) {
    req.flash('error', 'Semua field wajib diisi.');
    return res.redirect('/register');
  }
  if (password.length < 6) {
    req.flash('error', 'Password minimal 6 karakter.');
    return res.redirect('/register');
  }
  if (password !== confirm_password) {
    req.flash('error', 'Konfirmasi password tidak cocok.');
    return res.redirect('/register');
  }

  const existing = db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    req.flash('error', 'Email sudah terdaftar. Silakan login.');
    return res.redirect('/register');
  }

  const hashed = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashed, 'user']);

  req.flash('success', 'Registrasi berhasil! Silakan login.');
  res.redirect('/login');
});

// ---------- LOGIN ----------
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.get('SELECT * FROM users WHERE email = ?', [email]);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    req.flash('error', 'Email atau password salah.');
    return res.redirect('/login');
  }

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  req.flash('success', `Selamat datang kembali, ${user.name}!`);

  if (user.role === 'admin') return res.redirect('/admin/dashboard');
  return res.redirect('/user/dashboard');
});

// ---------- LOGOUT ----------
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
