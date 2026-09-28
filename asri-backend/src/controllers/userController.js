const { asyncHandler } = require('../middleware/errorHandler');
const userService = require('../services/userService');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

const getUsers = asyncHandler(async (req, res) => {
  res.json(await userService.listKasir());
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) throw fail(400, 'Nama, email, dan password wajib diisi.');
  if (!EMAIL_RE.test(email)) throw fail(400, 'Format email tidak valid.');
  if (password.length < 8) throw fail(400, 'Password minimal 8 karakter.');

  try {
    // Role SELALU 'kasir' — field role dari client diabaikan.
    res.status(201).json(await userService.createKasir({ name, email, password }));
  } catch (err) {
    if (err.code === '23505') throw fail(409, 'Email sudah terdaftar pada akun lain.');
    throw err;
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  if (email && !EMAIL_RE.test(email)) throw fail(400, 'Format email tidak valid.');

  try {
    const updated = await userService.updateKasir(req.params.id, { name, email });
    if (!updated) throw fail(404, 'Akun kasir tidak ditemukan.');
    res.json(updated);
  } catch (err) {
    if (err.code === '23505') throw fail(409, 'Email sudah terdaftar pada akun lain.');
    throw err;
  }
});

/** PATCH /api/users/:id/status  body: { isActive: boolean } — "hapus" = nonaktifkan (riwayat transaksi tetap utuh). */
const setUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') throw fail(400, 'isActive harus true atau false.');

  const updated = await userService.setActive(req.params.id, isActive);
  if (!updated) throw fail(404, 'Akun kasir tidak ditemukan.');
  res.json(updated);
});

const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw fail(400, 'Password baru minimal 8 karakter.');

  const ok = await userService.resetPassword(req.params.id, newPassword);
  if (!ok) throw fail(404, 'Akun kasir tidak ditemukan.');
  res.json({ message: 'Password berhasil direset.' });
});

module.exports = { getUsers, createUser, updateUser, setUserStatus, resetUserPassword };
