# Backend — Sistem Kasir & Manajemen Toko Kelontong Asri

Backend REST API (Node.js + Express + PostgreSQL) untuk aplikasi kasir frontend yang sudah ada.

## Arsitektur Kode: Router → Controller → Service

Setiap fitur mengikuti alur satu arah yang sama, dipisah ke 3 folder di `src/`:

```
Request  →  routes/*.routes.js      (hanya path + middleware guard, TIDAK ADA logika)
         →  controllers/*.js        (req/res, validasi input, mapping error → HTTP status)
         →  services/*.js           (query SQL + aturan bisnis; SATU-SATUNYA yang boleh
                                      menyentuh config/db.js)
```

Aturan sederhana saat menambah fitur baru: kalau Anda menulis `SELECT`/`INSERT`/`UPDATE`,
taruh di `services/`. Kalau Anda menulis `req.body`/`res.json`, taruh di `controllers/`.
Tidak ada file yang melebihi ~150 baris — mudah dibaca dan ditest terpisah.

## 1. Menjalankan Secara Lokal

```bash
cp .env.example .env      # isi DATABASE_URL, JWT_SECRET, dll
npm install
npm run dev                # nodemon, restart otomatis saat kode berubah
```

Atau pakai Docker (sudah termasuk Postgres lokal + auto-import schema.sql & seed.sql):

```bash
docker compose up --build
```

Backend akan berjalan di `http://localhost:4000`, cek `GET /health`.

## 2. Setup Database (Supabase)

1. Buat project baru di https://supabase.com (gratis untuk skala toko kecil-menengah).
2. Buka **SQL Editor** → jalankan isi `db/schema.sql`.
3. (Opsional, untuk data contoh) jalankan `db/seed.sql` — **ganti password default** setelahnya.
4. Buat user admin pertama secara aman (jangan pakai hash contoh di seed.sql untuk produksi):
   ```sql
   -- Generate hash bcrypt via: node -e "console.log(require('bcrypt').hashSync('PasswordAndaSendiri', 12))"
   INSERT INTO users (name, email, password_hash, role)
   VALUES ('Nama Anda', 'admin@gmail.com', '<hasil_bcrypt_hash>', 'admin');
   ```
5. Salin **Connection String** dari `Project Settings > Database > Connection string > URI` ke `DATABASE_URL` pada `.env`. Gunakan mode **Transaction Pooler** (port 6543) bila backend dideploy di platform serverless.

## 3. Deploy Backend (Dockerfile disediakan)

Dockerfile ini bisa dijalankan di platform mana pun yang mendukung container: **Railway**, **Render**, **Fly.io**, atau VPS sendiri.

Contoh cepat dengan **Railway**:
1. Push folder `asri-backend/` ini ke repo GitHub.
2. Railway → New Project → Deploy from GitHub Repo → pilih repo ini.
3. Railway otomatis mendeteksi `Dockerfile`. Set seluruh variabel dari `.env.example` di tab **Variables**.
4. Setelah deploy, catat URL publik (mis. `https://asri-backend.up.railway.app`) — ini yang dipakai frontend untuk `API_BASE_URL`.

Build & run manual (VPS/self-host):
```bash
docker build -t asri-backend .
docker run -d --env-file .env -p 4000:4000 --name asri-backend asri-backend
```

## 4. Deploy Frontend (Vercel)

1. Push kode frontend (file HTML statis, atau hasil build bila nanti dipecah jadi framework) ke GitHub.
2. Vercel → New Project → Import repo frontend.
3. Set environment variable / konfigurasi `API_BASE_URL` di kode frontend agar menunjuk ke URL backend hasil langkah 3 (mis. `https://asri-backend.up.railway.app/api`).
4. Setelah dapat domain Vercel (mis. `https://toko-kelontong-asri.vercel.app`), **tambahkan domain ini ke `FRONTEND_ORIGIN`** di environment variable backend, lalu redeploy backend — ini penting agar CORS mengizinkan frontend mengakses API.

## 5. Checklist Keamanan Sebelum Go-Live

- [ ] Ganti `JWT_SECRET` dengan string random panjang (`openssl rand -hex 32`).
- [ ] Ganti password admin default, jangan gunakan hash dari `seed.sql`.
- [ ] `FRONTEND_ORIGIN` hanya berisi domain resmi (hapus `localhost` di produksi).
- [ ] `DATABASE_SSL=true` untuk koneksi Supabase.
- [ ] Aktifkan backup otomatis di Supabase (Database > Backups).
- [ ] Pertimbangkan menambahkan 2FA/OTP untuk login admin jika toko punya banyak cabang.

## 6. Ringkasan Endpoint API

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/auth/login` | Publik | Login, mengembalikan JWT |
| POST | `/api/auth/forgot-password` | Publik | Kirim email reset password |
| POST | `/api/auth/reset-password` | Publik (butuh token) | Set password baru |
| GET | `/api/auth/me` | Login | Profil user aktif |
| GET | `/api/products` | Kasir, Admin | Katalog produk (`?search=&category=&lowStock=true`) |
| POST | `/api/products` | Admin | Tambah produk baru |
| PUT | `/api/products/:id` | Admin | Edit produk |
| PATCH | `/api/products/:id/restock` | Admin | Restock cepat (`{ qty }`) |
| DELETE | `/api/products/:id` | Admin | Nonaktifkan produk (soft delete) |
| POST | `/api/transactions` | Kasir, Admin | Checkout (atomic, kurangi stok) |
| GET | `/api/transactions` | Admin | Riwayat transaksi (`?startDate&endDate`) |
| GET | `/api/dashboard/stats` | Admin | Statistik real-time + tren 7 hari |
| GET | `/api/dashboard/report` | Admin | Laporan (`?format=json\|xlsx\|pdf`) |
| GET/PUT | `/api/settings/store` | Kasir(get) / Admin(put) | Identitas toko untuk struk |

Semua endpoint selain `auth/*` dan `GET /api/settings/store` wajib header:
`Authorization: Bearer <token>`
