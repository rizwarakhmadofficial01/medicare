// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

router.use(isLoggedIn, isAdmin);

// ---------- DASHBOARD ----------
router.get('/dashboard', (req, res) => {
  const totalDoctors = db.get('SELECT COUNT(*) AS c FROM doctors').c;
  const totalPatients = db.get(`SELECT COUNT(*) AS c FROM users WHERE role = 'user'`).c;
  const pendingAppointments = db.get(`SELECT COUNT(*) AS c FROM appointments WHERE status = 'pending'`).c;
  const totalRevenue = db.get(`SELECT COALESCE(SUM(total_price),0) AS s FROM appointments WHERE status IN ('confirmed','completed')`).s;

  const recentAppointments = db.all(`
    SELECT a.*, u.name AS user_name, d.name AS doctor_name
    FROM appointments a
    JOIN users u ON u.id = a.user_id
    JOIN doctors d ON d.id = a.doctor_id
    ORDER BY a.created_at DESC LIMIT 5
  `);

  res.render('admin/dashboard', {
    title: 'Dashboard Admin',
    totalDoctors, totalPatients, pendingAppointments, totalRevenue, recentAppointments
  });
});

// ---------- CRUD DOKTER ----------
router.get('/doctors', (req, res) => {
  const doctors = db.all('SELECT * FROM doctors ORDER BY id DESC');
  res.render('admin/doctors', { title: 'Kelola Dokter', doctors });
});

router.get('/doctors/new', (req, res) => {
  res.render('admin/doctor_form', { title: 'Tambah Dokter', doctor: null });
});

router.post('/doctors', (req, res) => {
  const { name, category, price_per_hour, description, image_url } = req.body;
  if (!name || !category || !price_per_hour) {
    req.flash('error', 'Nama, spesialisasi, dan biaya konsultasi wajib diisi.');
    return res.redirect('/admin/doctors/new');
  }
  db.run(`INSERT INTO doctors (name, category, price_per_hour, description, image_url) VALUES (?, ?, ?, ?, ?)`,
    [name, category, parseInt(price_per_hour), description || '', image_url || '/images/doctor.jpg']);
  req.flash('success', 'Dokter berhasil ditambahkan.');
  res.redirect('/admin/doctors');
});

router.get('/doctors/:id/edit', (req, res) => {
  const doctor = db.get('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
  if (!doctor) { req.flash('error', 'Dokter tidak ditemukan.'); return res.redirect('/admin/doctors'); }
  res.render('admin/doctor_form', { title: 'Edit Dokter', doctor });
});

router.put('/doctors/:id', (req, res) => {
  const { name, category, price_per_hour, description, image_url, is_active } = req.body;
  db.run(`UPDATE doctors SET name=?, category=?, price_per_hour=?, description=?, image_url=?, is_active=? WHERE id=?`,
    [name, category, parseInt(price_per_hour), description || '', image_url || '/images/doctor.jpg', is_active ? 1 : 0, req.params.id]);
  req.flash('success', 'Data dokter berhasil diperbarui.');
  res.redirect('/admin/doctors');
});

router.delete('/doctors/:id', (req, res) => {
  const activeAppointment = db.get(`SELECT id FROM appointments WHERE doctor_id = ? AND status IN ('pending','confirmed')`, [req.params.id]);
  if (activeAppointment) {
    req.flash('error', 'Tidak dapat menghapus: masih ada janji temu aktif untuk dokter ini.');
    return res.redirect('/admin/doctors');
  }
  db.run('DELETE FROM doctors WHERE id = ?', [req.params.id]);
  req.flash('success', 'Dokter berhasil dihapus.');
  res.redirect('/admin/doctors');
});

// ---------- KELOLA JANJI TEMU ----------
router.get('/appointments', (req, res) => {
  const statusFilter = req.query.status;
  let sql = `
    SELECT a.*, u.name AS user_name, u.email AS user_email, d.name AS doctor_name, d.category
    FROM appointments a
    JOIN users u ON u.id = a.user_id
    JOIN doctors d ON d.id = a.doctor_id
  `;
  const params = [];
  if (statusFilter) {
    sql += ' WHERE a.status = ?';
    params.push(statusFilter);
  }
  sql += ' ORDER BY a.booking_date DESC, a.start_time DESC';
  const appointments = db.all(sql, params);
  res.render('admin/appointments', { title: 'Kelola Janji Temu', appointments, statusFilter: statusFilter || '' });
});

router.put('/appointments/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'];
  if (!allowed.includes(status)) {
    req.flash('error', 'Status tidak valid.');
    return res.redirect('/admin/appointments');
  }
  db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
  req.flash('success', `Status janji temu berhasil diubah menjadi "${status}".`);
  res.redirect('/admin/appointments');
});

// ---------- KELOLA PASIEN (view only, bonus) ----------
router.get('/users', (req, res) => {
  const users = db.all(`SELECT id, name, email, role, created_at FROM users ORDER BY id DESC`);
  res.render('admin/users', { title: 'Daftar Pasien' , users });
});

module.exports = router;
