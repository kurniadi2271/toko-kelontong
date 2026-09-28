const { asyncHandler } = require('../middleware/errorHandler');
const categoryService = require('../services/categoryService');

function validName(name) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 50;
}

const getCategories = asyncHandler(async (req, res) => {
  res.json(await categoryService.listCategories());
});

const createCategory = asyncHandler(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!validName(name)) return res.status(400).json({ error: 'Nama kategori wajib diisi (2-50 karakter).' });

  try {
    res.status(201).json(await categoryService.createCategory(name));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Nama kategori sudah ada.' });
    throw err;
  }
});

const renameCategory = asyncHandler(async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!validName(name)) return res.status(400).json({ error: 'Nama kategori wajib diisi (2-50 karakter).' });

  try {
    const updated = await categoryService.renameCategory(req.params.id, name);
    if (!updated) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    res.json(updated);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Nama kategori sudah ada.' });
    throw err;
  }
});

const deleteCategory = asyncHandler(async (req, res) => {
  try {
    const ok = await categoryService.deleteCategory(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Kategori tidak ditemukan.' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Kategori masih dipakai produk. Pindahkan/ubah kategori produk tersebut dulu.' });
    }
    throw err;
  }
});

module.exports = { getCategories, createCategory, renameCategory, deleteCategory };
