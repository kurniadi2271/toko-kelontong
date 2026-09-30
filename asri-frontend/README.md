# Frontend — Sistem Kasir & Manajemen Supermarket XYZ

Frontend statis (HTML/CSS/JS murni, tanpa build tool) yang berkomunikasi dengan
`asri-backend` lewat REST API.

## Struktur & Arsitektur

```
index.html            ← shell: placeholder kosong + urutan <script> yang benar
components/*.html      ← potongan markup per halaman, dimuat dinamis oleh js/loader.js
js/config.js            ← "pengganti .env" untuk browser (window.APP_CONFIG.API_BASE_URL)
js/api.js               ← SATU PINTU untuk semua fetch() ke backend
js/state.js             ← state in-memory (cart, user login, dll — bukan localStorage)
js/utils.js             ← helper murni (formatRp, formatDate, dst)
js/loader.js            ← loader dinamis component → index.html
js/pages/*.js           ← logika tiap halaman (satu file = satu halaman)
js/main.js              ← bootstrap aplikasi (urutan loading & inisialisasi)
```

**Alur render:** `main.js` memanggil `loadComponents()` untuk mengisi semua
placeholder `<div id="component-...">` di `index.html` dengan isi file di
`/components`, baru setelah itu setiap `pages/*.js` dijalankan untuk mengambil
data dari backend lewat `js/api.js` dan menggambar ulang bagian DOM-nya masing-masing.

**Satu-satunya data yang disimpan di browser** adalah token JWT hasil login
admin (`localStorage`, key `asri_token`) — semua data bisnis (produk, stok,
transaksi) SELALU diambil ulang dari backend, tidak pernah di-cache permanen.

## Menjalankan Secara Lokal

Karena `js/loader.js` memakai `fetch()` untuk memuat file `.html` dari
`/components`, folder ini **wajib diakses lewat web server**, bukan dibuka
langsung sebagai `file://` (browser akan memblokir fetch ke file lokal).

Pilih salah satu:
```bash
npx serve .              # lalu buka http://localhost:3000
# atau
python3 -m http.server 5500
# atau pakai ekstensi "Live Server" di VSCode
```

Pastikan `asri-backend` juga sudah berjalan (default `http://localhost:4000`,
lihat `asri-backend/README.md`), dan `js/config.js` menunjuk ke URL yang benar.

## Sebelum Deploy ke Vercel

1. Buka `js/config.js`, ganti `API_BASE_URL` ke URL backend produksi Anda:
   ```js
   window.APP_CONFIG = { API_BASE_URL: 'https://asri-backend.up.railway.app/api' };
   ```
2. Push folder ini ke GitHub, import sebagai project baru di Vercel (tidak perlu
   build command — set **Framework Preset: Other**, Output Directory: `.`).
3. Setelah dapat domain Vercel, tambahkan domain tersebut ke `FRONTEND_ORIGIN`
   pada environment variable backend (lihat `asri-backend/README.md`) agar CORS
   mengizinkan frontend ini mengakses API.
