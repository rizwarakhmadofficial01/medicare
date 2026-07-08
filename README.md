# MediCare - Sistem Janji Temu Dokter (Klinik)

Aplikasi web untuk membuat janji temu dengan dokter di sebuah klinik (Umum, Gigi, Anak, Kandungan, THT, Mata, Kulit, Jantung, dll) dengan dua role: **Admin** (staf klinik) dan **User** (pasien).

## Fitur Utama
- Autentikasi (Register, Login, Logout) dengan password terenkripsi (bcrypt)
- Role-based access control (Admin vs Pasien)
- CRUD Dokter (Admin)
- Buat janji temu dengan validasi konflik jadwal (Pasien)
- Kelola status janji temu: pending → confirmed/rejected → completed/cancelled (Admin)
- Riwayat & pembatalan janji temu (Pasien)
- Dashboard statistik untuk Admin dan Pasien

## Tech Stack
- **Backend:** Node.js, Express.js
- **View Engine:** EJS (Server-Side Rendering)
- **Database:** SQLite (via sql.js - embedded, tanpa perlu instalasi server DB terpisah)
- **Auth:** express-session + bcryptjs
- **Lainnya:** method-override (REST-style form), connect-flash (notifikasi)

## Cara Menjalankan

```bash
npm install
npm start
```

Aplikasi berjalan di `http://localhost:3000`

## Akun Demo

| Role   | Email                 | Password  |
|--------|------------------------|-----------|
| Admin  | admin@medicare.test    | admin123  |
| Pasien | user@medicare.test     | user123   |

Database SQLite otomatis dibuat & di-seed saat pertama kali dijalankan (`data/medicare.sqlite`).

## Struktur Folder

```
medicare/
├── server.js               # Entry point aplikasi
├── db/database.js          # Setup & helper query SQLite
├── middleware/auth.js       # Middleware autentikasi & otorisasi
├── routes/
│   ├── auth.js             # Register, login, logout
│   ├── admin.js             # CRUD dokter, kelola janji temu (khusus admin)
│   └── user.js               # Browse dokter, buat janji temu, riwayat (khusus pasien)
├── views/                   # Template EJS
└── public/                  # CSS statis
```

## Skema Database

**users**: id, name, email, password (hashed), role (admin/user), created_at
**doctors**: id, name, category (spesialisasi), price_per_hour (biaya konsultasi), description, image_url, is_active
**appointments**: id, user_id (FK pasien), doctor_id (FK dokter), booking_date, start_time, end_time, total_price, status, notes (keluhan)

## Catatan Keamanan
- Password di-hash menggunakan bcrypt (salt rounds 10)
- Validasi input di sisi server untuk semua form
- Session-based auth dengan cookie httpOnly bawaan express-session
- Role-based middleware mencegah akses lintas peran
