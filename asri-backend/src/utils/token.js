const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function signAuthToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

/**
 * Token reset password: bagian RAW dikirim via email ke user,
 * bagian HASH (sha256) disimpan di DB. Ini mencegah siapapun yang
 * bisa membaca database (mis. lewat backup bocor) memakai token
 * tersebut secara langsung, karena hash tidak reversible.
 */
function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // berlaku 30 menit
  return { rawToken, tokenHash, expiresAt };
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { signAuthToken, generateResetToken, hashToken };
