/**
 * Error handler terpusat. Semua route memakai pola async yang melempar
 * error ke next(err), lalu ditangkap di sini agar respons konsisten
 * dan tidak membocorkan stack trace ke CLIENT di production.
 *
 * PENTING: stack trace TETAP dicatat ke terminal server (console.error)
 * di SEMUA environment, termasuk production — karena log terminal bersifat
 * privat (hanya Anda yang lihat), sementara respons ke browser tetap
 * digeneralisasi demi keamanan. Sebelumnya stack trace hanya tercatat saat
 * NODE_ENV !== 'production', sehingga error 500 di server produksi/lokal
 * (NODE_ENV=production sesuai .env.example) tidak bisa dilacak sama sekali.
 *
 * Jika Anda melihat "Terjadi kesalahan pada server." di frontend, PENYEBAB
 * ASLINYA selalu ada di terminal tempat `npm run dev` berjalan — cari baris
 * "[ERROR STACK]" di sana.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Kode error PostgreSQL 22P02 = format UUID/angka tidak valid pada parameter → salah input, bukan bug server.
  if (err.code === '22P02') {
    err.status = 400;
    err.message = 'Parameter tidak valid.';
  }

  const status = err.status || 500;

  if (status >= 500) {
    // Error server sungguhan: catat lengkap dengan stack trace.
    console.error(`[ERROR] ${req.method} ${req.originalUrl} →`, err.message);
    console.error('[ERROR STACK]', err.stack);
  } else {
    // Error "wajar" (validasi, password salah, 403, dst): cukup satu baris.
    console.warn(`[WARN] ${req.method} ${req.originalUrl} → ${status} ${err.message}`);
  }

  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Terjadi kesalahan pada server. (Cek terminal backend untuk detail lengkap.)'
    : err.message;

  res.status(status).json({ error: message });
}

/** Pembungkus async controller agar tidak perlu try/catch berulang. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { notFoundHandler, errorHandler, asyncHandler };
