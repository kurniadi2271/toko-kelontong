const { asyncHandler } = require('../middleware/errorHandler');
const userService = require('../services/userService');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

const getUsers = asyncHandler(async (req, res) => {
  res.json(await userService.listUsers());
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'kasir' } = req.body;

  if (!name || !email || !password) throw fail(400, 'Nama, email, dan password wajib diisi.');
  if (!EMAIL_RE.test(email)) throw fail(400, 'Format email tidak valid.');
  if (password.length < 8) throw fail(400, 'Password minimal 8 karakter.');
  if (!userService.ROLES.includes(role)) throw fail(400, 'Role harus admin atau kasir.');

  try {
    res.status(201).json(await userService.createUser({ name, email, password, role }));
  } catch (err) {
    if (err.code === '23505') throw fail(409, 'Email sudah terdaftar pada akun lain.');
    throw err;
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role } = req.body;
  const target = await userService.getUserById(req.params.id);
  if (!target) throw fail(404, 'Akun tidak ditemukan.');

  if (email && !EMAIL_RE.test(email)) throw fail(400, 'Format email tidak valid.');
  if (role && !userService.ROLES.includes(role)) throw fail(400, 'Role harus admin atau kasir.');

  // Cegah admin "mengunci dirinya sendiri" / menghilangkan admin terakhir.
  if (role && role !== target.role && target.role === 'admin') {
    if (target.id === req.user.id) throw fail(400, 'Anda tidak dapat menurunkan role akun Anda sendiri.');
    if (target.is_active && (await userService.countActiveAdmins()) <= 1) {
      throw fail(400, 'Tidak bisa menurunkan admin aktif terakhir.');
    }
  }

  try {
    res.json(await userService.updateUser(req.params.id, { name, email, role }));
  } catch (err) {
    if (err.code === '23505') throw fail(409, 'Email sudah terdaftar pada akun lain.');
    throw err;
  }
});

/** PATCH /api/users/:id/status  body: { isActive: boolean } — "hapus" = nonaktifkan (riwayat transaksi tetap utuh). */
const setUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') throw fail(400, 'isActive harus true atau false.');

  const target = await userService.getUserById(req.params.id);
  if (!target) throw fail(404, 'Akun tidak ditemukan.');

  if (!isActive) {
    if (target.id === req.user.id) throw fail(400, 'Anda tidak dapat menonaktifkan akun Anda sendiri.');
    if (target.role === 'admin' && target.is_active && (await userService.countActiveAdmins()) <= 1) {
      throw fail(400, 'Tidak bisa menonaktifkan admin aktif terakhir.');
    }
  }

  res.json(await userService.setActive(req.params.id, isActive));
});

const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw fail(400, 'Password baru minimal 8 karakter.');

  const ok = await userService.resetPassword(req.params.id, newPassword);
  if (!ok) throw fail(404, 'Akun tidak ditemukan.');
  res.json({ message: 'Password berhasil direset.' });
});

module.exports = { getUsers, createUser, updateUser, setUserStatus, resetUserPassword };
