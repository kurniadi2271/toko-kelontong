const jwt = require('jsonwebtoken');

/**
 * Memverifikasi JWT dari header Authorization: Bearer <token>.
 * Menolak request tanpa/invalid token dengan 401.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token otentikasi tidak ditemukan.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
}

/**
 * Membatasi akses endpoint hanya untuk role tertentu.
 * Contoh: authorize('admin') atau authorize('admin', 'kasir')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke resource ini.' });
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
