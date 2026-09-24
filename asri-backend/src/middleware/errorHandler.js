/**
 * Error handler terpusat. Semua route memakai pola async yang melempar
 * error ke next(err), lalu ditangkap di sini agar respons konsisten
 * dan tidak membocorkan stack trace ke client di production.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[ERROR]', err.message);

  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  const status = err.status || 500;
  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Terjadi kesalahan pada server.'
    : err.message;

  res.status(status).json({ error: message });
}

/** Pembungkus async controller agar tidak perlu try/catch berulang. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { notFoundHandler, errorHandler, asyncHandler };
