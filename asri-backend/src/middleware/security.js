const cors = require('cors');
const rateLimit = require('express-rate-limit');
const sanitizeHtml = require('sanitize-html');

/**
 * CORS: hanya menerima request dari domain frontend yang terdaftar
 * di FRONTEND_ORIGIN (.env), dipisah koma untuk multi-domain
 * (misal domain produksi + preview Vercel + localhost saat dev).
 */
const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin: (origin, callback) => {
    // origin undefined = request non-browser (curl/Postman/server-to-server), izinkan.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: domain "${origin}" tidak diizinkan.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  // 'Bypass-Tunnel-Reminder' dibutuhkan bila backend diekspos lewat localtunnel
  // (loca.lt) — tanpa header ini, localtunnel menyisipkan halaman peringatan
  // HTML di setiap response, yang akan merusak parsing JSON di frontend.
  allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder'],
});

/**
 * Rate limiter khusus endpoint auth (login/forgot-password) untuk
 * mencegah brute-force password admin.
 */
const authRateLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.' },
});

/**
 * Rate limiter umum untuk seluruh API (mencegah abuse/DoS ringan).
 */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Sanitasi input rekursif terhadap XSS. SQL Injection sudah dicegah
 * dengan parameterized query di layer database (lihat config/db.js),
 * middleware ini fokus membersihkan payload HTML/JS berbahaya yang
 * mungkin tersimpan di DB lalu dirender di frontend (stored XSS),
 * misal pada field nama produk atau nama toko.
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const clean = {};
    for (const key of Object.keys(value)) {
      clean[key] = sanitizeValue(value[key]);
    }
    return clean;
  }
  return value;
}

function sanitizeInput(req, res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
}

module.exports = {
  corsMiddleware,
  authRateLimiter,
  globalRateLimiter,
  sanitizeInput,
};
