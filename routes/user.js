// routes/user.js
const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { isLoggedIn, isUser } = require('../middleware/auth');

router.use(isLoggedIn, isUser);

// ---------- DASHBOARD ----------
router.get('/dashboard', (req, res) => {
  const userId = req.session.user.id;
  const myAppointments = db.all(`
    SELECT a.*, d.name AS doctor_name, d.category, d.image_url
    FROM appointments a JOIN doctors d ON d.id = a.doctor_id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC LIMIT 5
  `, [userId]);
  const totalAppointments = db.get('SELECT COUNT(*) AS c FROM appointments WHERE user_id = ?', [userId]).c;
  const activeDoctorsCount = db.get('SELECT COUNT(*) AS c FROM doctors WHERE is_active = 1').c;

  res.render('user/dashboard', { title: 'Dashboard', myAppointments, totalAppointments, activeDoctorsCount });
});

// ---------- BROWSE DOKTER ----------
router.get('/doctors', (req, res) => {
  const category = req.query.category || '';
  let sql = 'SELECT * FROM doctors WHERE is_active = 1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY name ASC';
  const doctors = db.all(sql, params);
  const categories = db.all('SELECT DISTINCT category FROM doctors');
  res.render('user/doctors', { title: 'Daftar Dokter', doctors, categories, category });
});

// ---------- FORM JANJI TEMU ----------
router.get('/doctors/:id/book', (req, res) => {
  const doctor = db.get('SELECT * FROM doctors WHERE id = ? AND is_active = 1', [req.params.id]);
  if (!doctor) { req.flash('error', 'Dokter tidak ditemukan.'); return res.redirect('/user/doctors'); }
  res.render('user/booking_form', { title: 'Buat Janji Temu', doctor });
});

router.post('/doctors/:id/book', (req, res) => {
  const userId = req.session.user.id;
  const doctorId = req.params.id;
  const { booking_date, start_time, end_time, notes } = req.body;

  const doctor = db.get('SELECT * FROM doctors WHERE id = ?', [doctorId]);
  if (!doctor) { req.flash('error', 'Dokter tidak ditemukan.'); return res.redirect('/user/doctors'); }

  if (!booking_date || !start_time || !end_time) {
    req.flash('error', 'Tanggal dan jam janji temu wajib diisi.');
    return res.redirect(`/user/doctors/${doctorId}/book`);
  }
  if (start_time >= end_time) {
    req.flash('error', 'Jam selesai harus lebih besar dari jam mulai.');
    return res.redirect(`/user/doctors/${doctorId}/book`);
  }

  // Cegah janji temu untuk tanggal lampau
  const today = new Date().toISOString().slice(0, 10);
  if (booking_date < today) {
    req.flash('error', 'Tidak dapat membuat janji temu untuk tanggal yang sudah lewat.');
    return res.redirect(`/user/doctors/${doctorId}/book`);
  }

  // Cek konflik jadwal (overlap) pada dokter & tanggal yang sama, status aktif
  const conflict = db.get(`
    SELECT id FROM appointments
    WHERE doctor_id = ? AND booking_date = ? AND status IN ('pending','confirmed')
      AND NOT (end_time <= ? OR start_time >= ?)
  `, [doctorId, booking_date, start_time, end_time]);

  if (conflict) {
    req.flash('error', 'Jadwal bertabrakan dengan janji temu lain pada dokter ini. Silakan pilih jam lain.');
    return res.redirect(`/user/doctors/${doctorId}/book`);
  }

  // Hitung total biaya berdasarkan durasi jam
  const [sh, sm] = start_time.split(':').map(Number);
  const [eh, em] = end_time.split(':').map(Number);
  const durationHours = (eh + em / 60) - (sh + sm / 60);
  const totalPrice = Math.round(durationHours * doctor.price_per_hour);

  db.run(`
    INSERT INTO appointments (user_id, doctor_id, booking_date, start_time, end_time, total_price, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `, [userId, doctorId, booking_date, start_time, end_time, totalPrice, notes || '']);

  req.flash('success', 'Janji temu berhasil dibuat! Menunggu konfirmasi Admin.');
  res.redirect('/user/appointments');
});

// ---------- RIWAYAT JANJI TEMU ----------
router.get('/appointments', (req, res) => {
  const userId = req.session.user.id;
  const appointments = db.all(`
    SELECT a.*, d.name AS doctor_name, d.category
    FROM appointments a JOIN doctors d ON d.id = a.doctor_id
    WHERE a.user_id = ?
    ORDER BY a.created_at DESC
  `, [userId]);
  res.render('user/appointments', { title: 'Riwayat Janji Temu Saya', appointments });
});

// ---------- BATALKAN JANJI TEMU ----------
router.put('/appointments/:id/cancel', (req, res) => {
  const userId = req.session.user.id;
  const appointment = db.get('SELECT * FROM appointments WHERE id = ? AND user_id = ?', [req.params.id, userId]);
  if (!appointment) { req.flash('error', 'Janji temu tidak ditemukan.'); return res.redirect('/user/appointments'); }
  if (!['pending', 'confirmed'].includes(appointment.status)) {
    req.flash('error', 'Janji temu ini tidak dapat dibatalkan.');
    return res.redirect('/user/appointments');
  }
  db.run(`UPDATE appointments SET status = 'cancelled' WHERE id = ?`, [req.params.id]);
  req.flash('success', 'Janji temu berhasil dibatalkan.');
  res.redirect('/user/appointments');
});

module.exports = router;
