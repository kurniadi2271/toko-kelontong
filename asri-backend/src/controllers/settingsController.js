const { asyncHandler } = require('../middleware/errorHandler');
const settingsService = require('../services/settingsService');
const authService = require('../services/authService');

const getStoreSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getStoreSettings();
  res.json(settings);
});

/**
 * PUT /api/settings/store — update identitas toko + (opsional) ganti
 * password admin yang sedang login. Password lama WAJIB diverifikasi
 * dulu lewat authService sebelum perubahan apa pun disimpan.
 */
const updateStoreSettings = asyncHandler(async (req, res) => {
  const { storeName, address, currentPassword, newPassword } = req.body;

  if (!storeName || !address || !currentPassword) {
    return res.status(400).json({ error: 'Nama toko, alamat, dan password saat ini wajib diisi.' });
  }

  const isValid = await authService.verifyPassword(req.user.id, currentPassword);
  if (!isValid) {
    return res.status(401).json({ error: 'Password admin saat ini salah.' });
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password baru minimal 8 karakter.' });
    }
    await authService.changePassword(req.user.id, newPassword);
  }

  const updated = await settingsService.updateStoreSettings(storeName, address);
  res.json(updated);
});

module.exports = { getStoreSettings, updateStoreSettings };
