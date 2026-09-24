/**
 * config.js — Konfigurasi global aplikasi (pengganti .env untuk browser).
 *
 * SKENARIO DEPLOY ANDA:
 *   - Backend  : jalan LOKAL di komputer Anda, diekspos ke internet via localtunnel
 *   - Frontend : dideploy ke Vercel
 *
 * Setelah menjalankan localtunnel (lihat README.md di root repo), Anda akan
 * mendapat URL seperti: https://asri-kasir-api.loca.lt
 * Tempel URL tersebut di bawah ini (WAJIB tambahkan "/api" di akhir),
 * lalu commit & push — Vercel akan auto-redeploy dengan URL backend terbaru.
 *
 * PENTING: localtunnel gratis TIDAK menjamin URL/subdomain permanen. Jika
 * Anda me-restart tunnel dan URL berubah, ulangi langkah ini (ganti nilai
 * di bawah, commit, push) agar frontend di Vercel tahu alamat backend yang baru.
 */
window.APP_CONFIG = {
  API_BASE_URL: 'https://hot-fly-54.loca.lt/api',
};
