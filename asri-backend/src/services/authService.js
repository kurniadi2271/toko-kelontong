const bcrypt = require('bcrypt');
const { query } = require('../config/db');
const { signAuthToken, generateResetToken, hashToken } = require('../utils/token');
const { sendPasswordResetEmail } = require('../utils/mailer');

const SALT_ROUNDS = 12;

/**
 * authService — satu-satunya tempat yang boleh menyentuh tabel `users`.
 * Berisi query SQL SEKALIGUS aturan bisnis (hashing, token, dsb) terkait
 * autentikasi, agar controller cukup memanggil satu fungsi saja.
 */

async function login(email, password) {
  const { rows } = await query(
    `SELECT id, name, email, password_hash, role, is_active
       FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  const user = rows[0];

  // Pesan error digeneralisasi agar tidak membocorkan info ke penyerang (user enumeration).
  const genericError = Object.assign(new Error('Email atau password salah.'), { status: 401 });
  if (!user || !user.is_active) throw genericError;

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) throw genericError;

  const token = signAuthToken(user);
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

async function requestPasswordReset(email) {
  const { rows } = await query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user) return; // diam-diam, jangan bocorkan apakah email terdaftar

  const { rawToken, tokenHash, expiresAt } = generateResetToken();
  await query(
    `UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3`,
    [tokenHash, expiresAt, user.id]
  );

  try {
    await sendPasswordResetEmail(user.email, rawToken);
  } catch (err) {
    console.error('[MAIL] Gagal mengirim email reset password:', err.message);
  }
}

async function resetPasswordWithToken(rawToken, newPassword) {
  const tokenHash = hashToken(rawToken);
  const { rows } = await query(
    `SELECT id FROM users WHERE reset_token_hash = $1 AND reset_token_expires > now()`,
    [tokenHash]
  );
  const user = rows[0];
  if (!user) throw Object.assign(new Error('Token tidak valid atau sudah kedaluwarsa.'), { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query(
    `UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2`,
    [passwordHash, user.id]
  );
}

async function getUserProfile(userId) {
  const { rows } = await query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
  return rows[0] || null;
}

/** Dipakai halaman Pengaturan: cek password admin saat ini sebelum izinkan perubahan apa pun. */
async function verifyPassword(userId, plainPassword) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!rows[0]) return false;
  return bcrypt.compare(plainPassword, rows[0].password_hash);
}

async function changePassword(userId, newPlainPassword) {
  const passwordHash = await bcrypt.hash(newPlainPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
}

module.exports = {
  login,
  requestPasswordReset,
  resetPasswordWithToken,
  getUserProfile,
  verifyPassword,
  changePassword,
};
