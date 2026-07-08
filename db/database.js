// db/database.js
// Lightweight SQLite database (pure JS via sql.js/WASM - no native build tools needed)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'data', 'medicare.sqlite');

let SQL = null;
let db = null;

function persist() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function init() {
  SQL = await initSqlJs({});
  if (fs.existsSync(DB_PATH)) {
    const filebuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
    createSchema();
    seed();
    persist();
  }
  return db;
}

function createSchema() {
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'admin' (staf klinik) or 'user' (pasien)
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,          -- Spesialisasi: Umum, Gigi, Anak, dst
      price_per_hour INTEGER NOT NULL, -- Biaya konsultasi per sesi
      description TEXT,
      image_url TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      booking_date TEXT NOT NULL,   -- YYYY-MM-DD
      start_time TEXT NOT NULL,     -- HH:MM
      end_time TEXT NOT NULL,       -- HH:MM
      total_price INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, rejected, cancelled, completed
      notes TEXT,                   -- Keluhan / catatan pasien
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );
  `);
}

function seed() {
  const adminPass = bcrypt.hashSync('admin123', 10);
  const userPass = bcrypt.hashSync('user123', 10);

  db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ['Admin MediCare', 'admin@medicare.test', adminPass, 'admin']);
  db.run(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
    ['Rizwar (Demo Pasien)', 'user@medicare.test', userPass, 'user']);

  const doctors = [
    ['dr. Amelia Putri, Sp.PD', 'Penyakit Dalam', 150000, 'Spesialis penyakit dalam, pengalaman 10 tahun menangani pasien dewasa.', '/images/doctor.jpg'],
    ['dr. Bagas Wirawan', 'Umum', 75000, 'Dokter umum untuk pemeriksaan kesehatan harian dan keluhan ringan.', '/images/doctor.jpg'],
    ['drg. Citra Lestari', 'Gigi', 120000, 'Spesialis kesehatan gigi dan mulut, tindakan tambal & scaling.', '/images/doctor.jpg'],
    ['dr. Dewi Anggraini, Sp.A', 'Anak', 130000, 'Spesialis anak, konsultasi tumbuh kembang dan imunisasi.', '/images/doctor.jpg'],
    ['dr. Eko Prasetyo, Sp.KK', 'Kulit & Kelamin', 160000, 'Spesialis kulit, penanganan jerawat, alergi, dan perawatan kulit.', '/images/doctor.jpg'],
    ['dr. Fitriani, Sp.M', 'Mata', 140000, 'Spesialis mata, pemeriksaan refraksi dan kesehatan mata menyeluruh.', '/images/doctor.jpg'],
  ];
  doctors.forEach(d => {
    db.run(`INSERT INTO doctors (name, category, price_per_hour, description, image_url) VALUES (?, ?, ?, ?, ?)`, d);
  });
}

// Helper query functions (mimic better-sqlite3 style API for convenience)
function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Get last inserted row id
function lastInsertId() {
  const res = get('SELECT last_insert_rowid() AS id');
  return res ? res.id : null;
}

module.exports = { init, run, get, all, lastInsertId, persist };
