const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Memverifikasi JWT dari header Authorization: Bearer <token>, lalu mencocokkan
 * dengan database agar:
 *  - akun yang DINONAKTIFKAN admin langsung ditolak (tanpa menunggu token kedaluwarsa),
 *  - perubahan role (mis. admin → kasir) langsung berlaku.
 * Role diambil dari DB, bukan dari isi token.
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token otentikasi tidak ditemukan.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
  }

  try {
    const { rows } = await query('SELECT id, name, role, is_active FROM users WHERE id = $1', [payload.sub]);
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Akun tidak aktif atau tidak ditemukan. Silakan hubungi admin.' });
    }
    req.user = { id: user.id, role: user.role, name: user.name };
    return next();
  } catch (err) {
    return next(err);
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
