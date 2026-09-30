# Sistem Kasir & Manajemen Supermarket

Repo ini berisi dua proyek terpisah dalam satu repository:

```
toko-kelontong-asri/
├── asri-backend/     ← Node.js + Express + PostgreSQL (jalan LOKAL, diekspos via localtunnel)
└── asri-frontend/    ← HTML/JS statis (dideploy ke Vercel)
```

Skenario deploy yang dipakai di sini: **backend tetap jalan di komputer Anda**
(tidak di-hosting), lalu diekspos ke internet lewat **localtunnel**, sementara
**frontend di-deploy ke Vercel** dan menembak URL localtunnel tersebut.

> ⚠️ Cocok untuk demo/development. Untuk toko yang benar-benar beroperasi
> harian, lihat opsi hosting backend permanen (Railway/Render/VPS) di
> `asri-backend/README.md` — localtunnel akan mati saat komputer/terminal
> Anda dimatikan atau tidur.

---

## 1. Push Repo Ini ke GitHub (satu repo, dua folder)

```bash
# Dari folder toko-kelontong-asri/ (isi 2 zip yang Anda unduh sudah digabung di sini)
git init
git add .
git commit -m "Initial commit: asri-backend + asri-frontend"
git branch -M main
git remote add origin https://github.com/<username-anda>/toko-kelontong-asri.git
git push -u origin main
```

`.gitignore` di root sudah mengecualikan `node_modules/` dan `.env` asli —
jangan pernah commit file `.env` yang berisi password/secret sungguhan.

---

## 2. Jalankan Backend Lokal + Ekspos dengan localtunnel

**Terminal 1 — jalankan backend:**
```bash
cd asri-backend
cp .env.example .env
# Edit .env: isi DATABASE_URL (Supabase), JWT_SECRET, dst.
# FRONTEND_ORIGIN diisi belakangan setelah dapat URL Vercel (lihat langkah 4).
npm install
npm run dev
```
Backend berjalan di `http://localhost:4000`.

**Terminal 2 — ekspos ke internet dengan localtunnel:**
```bash
npx localtunnel --port 4000 --subdomain asri-kasir-api
```
Anda akan mendapat URL publik, misalnya:
```
https://asri-kasir-api.loca.lt
```
Buka URL itu + `/health` di browser sekali (mis. `https://asri-kasir-api.loca.lt/health`)
dan klik **"Click to Continue"** — ini konfirmasi satu kali dari localtunnel
per browser/sesi. Setelah itu API bisa diakses normal.

> **Catatan penting soal localtunnel:**
> - `--subdomain` membantu URL tetap sama tiap kali Anda restart tunnel, TAPI
>   tidak dijamin — kalau ada orang lain memakai nama yang sama, Anda akan
>   diberi subdomain acak. Kalau itu terjadi, ulangi Langkah 3 di bawah dengan
>   URL baru.
> - Jangan tutup Terminal 1 & 2 selama toko beroperasi — begitu salah satu
>   berhenti, frontend di Vercel tidak bisa lagi menghubungi backend.
> - Header `Bypass-Tunnel-Reminder` sudah otomatis ditambahkan di
>   `asri-frontend/js/api.js`, jadi permintaan `fetch()` dari frontend tidak
>   akan terjebak halaman peringatan HTML localtunnel.

---

## 3. Arahkan Frontend ke URL localtunnel

Edit `asri-frontend/js/config.js`:
```js
window.APP_CONFIG = {
  API_BASE_URL: 'https://asri-kasir-api.loca.lt/api',
};
```
Commit & push perubahan ini — setiap kali URL localtunnel berubah, ulangi langkah ini.

---

## 4. Deploy Frontend ke Vercel

1. Buka [vercel.com](https://vercel.com) → **New Project** → Import repo GitHub `toko-kelontong-asri` ini.
2. Pada **Root Directory**, klik "Edit" dan pilih folder **`asri-frontend`** (penting — repo ini punya 2 folder, Vercel harus tahu mana yang di-deploy).
3. **Framework Preset**: pilih `Other` (frontend ini statis, tanpa build step).
4. **Build Command**: kosongkan. **Output Directory**: `./` (default).
5. Klik **Deploy**. Setelah selesai, Anda dapat domain seperti `https://toko-kelontong-asri.vercel.app`.

---

## 5. Hubungkan Balik: Izinkan Domain Vercel di CORS Backend

Edit `asri-backend/.env`:
```
FRONTEND_ORIGIN=https://toko-kelontong-asri.vercel.app
```
Restart backend (`Ctrl+C` lalu `npm run dev` lagi di Terminal 1) agar perubahan `.env` terbaca.

> Vercel juga membuat URL *preview* acak untuk tiap push ke branch selain
> `main` (mis. `toko-kelontong-asri-git-fix-xyz.vercel.app`). Jika Anda ingin
> preview itu juga bisa akses API, tambahkan URL-nya juga ke
> `FRONTEND_ORIGIN`, dipisah koma. CORS di backend ini mencocokkan domain
> secara persis (bukan wildcard), jadi setiap domain baru harus didaftarkan manual.

---

## Checklist Urutan yang Benar

1. ✅ Backend jalan lokal (`npm run dev`) — Terminal 1
2. ✅ localtunnel jalan (`npx localtunnel --port 4000 ...`) — Terminal 2
3. ✅ `asri-frontend/js/config.js` sudah diisi URL localtunnel terbaru
4. ✅ Frontend sudah di-deploy ke Vercel dengan Root Directory `asri-frontend`
5. ✅ `FRONTEND_ORIGIN` di `.env` backend berisi domain Vercel
6. ✅ Buka `https://<url-localtunnel>/health` sekali di browser untuk klik "Continue"
7. ✅ Buka domain Vercel Anda — aplikasi kasir siap dipakai

Setiap kali komputer restart / terminal ditutup, ulangi dari langkah 1–3
(URL localtunnel biasanya berubah tiap sesi baru kecuali subdomain berhasil dipakai lagi).
