const { asyncHandler } = require('../middleware/errorHandler');
const authService = require('../services/authService');

/**
 * authController — HANYA menangani req/res dan validasi input dasar.
 * Seluruh query DB & aturan bisnis ada di services/authService.js.
 */

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const result = await authService.login(email, password);
  res.json(result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email wajib diisi.' });

  await authService.requestPasswordReset(email);
  // Pesan generik & selalu 200, agar endpoint ini tidak bisa dipakai
  // untuk mengecek email mana saja yang terdaftar (email enumeration).
  res.json({ message: 'Jika email terdaftar, tautan reset password telah dikirim.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token dan password baru wajib diisi.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password baru minimal 8 karakter.' });
  }

  await authService.resetPasswordWithToken(token, newPassword);
  res.json({ message: 'Password berhasil diperbarui. Silakan login kembali.' });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user.id);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  res.json(user);
});

module.exports = { login, forgotPassword, resetPassword, me };
