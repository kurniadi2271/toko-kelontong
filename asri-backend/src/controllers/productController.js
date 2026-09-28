const { asyncHandler } = require('../middleware/errorHandler');
const productService = require('../services/productService');

const getProducts = asyncHandler(async (req, res) => {
  const { search, category, lowStock } = req.query;
  const rows = await productService.listProducts({ search, category, lowStock });
  res.json(rows);
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  res.json(product);
});

const createProduct = asyncHandler(async (req, res) => {
  const { barcode, name, category, unit, costPrice, sellPrice, stock, lowStockThreshold } = req.body;

  if (!barcode || !name || !category || !unit || costPrice == null || sellPrice == null) {
    return res.status(400).json({ error: 'Field barcode, nama, kategori, satuan, HPP, dan harga jual wajib diisi.' });
  }
  if (Number(costPrice) < 0 || Number(sellPrice) < 0) {
    return res.status(400).json({ error: 'HPP dan harga jual tidak boleh negatif.' });
  }

  try {
    const product = await productService.createProduct({
      barcode, name, category, unit, costPrice, sellPrice, stock, lowStockThreshold,
    }, req.user.id);
    res.status(201).json(product);
  } catch (err) {
    if (err.code === '23505') { // unique_violation (barcode duplikat)
      return res.status(409).json({ error: 'Barcode sudah digunakan oleh produk lain.' });
    }
    if (err.code === '23503') { // foreign_key_violation (kategori tidak ada)
      return res.status(400).json({ error: 'Kategori tidak ditemukan. Tambahkan dulu lewat menu Kelola Kategori.' });
    }
    throw err;
  }
});

const updateProduct = asyncHandler(async (req, res) => {
  const { stock, costPrice, sellPrice } = req.body;

  if (stock !== undefined && stock !== null && stock !== '' && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
    return res.status(400).json({ error: 'Stok harus berupa bilangan bulat >= 0.' });
  }
  if ((costPrice != null && Number(costPrice) < 0) || (sellPrice != null && Number(sellPrice) < 0)) {
    return res.status(400).json({ error: 'HPP dan harga jual tidak boleh negatif.' });
  }

  try {
    const product = await productService.updateProduct(req.params.id, req.body, req.user.id);
    if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    res.json(product);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Barcode sudah digunakan oleh produk lain.' });
    if (err.code === '23503') return res.status(400).json({ error: 'Kategori tidak ditemukan.' });
    throw err;
  }
});

const restockProduct = asyncHandler(async (req, res) => {
  const qty = Number(req.body.qty);
  if (!qty || qty <= 0) {
    return res.status(400).json({ error: 'Jumlah restock harus lebih dari 0.' });
  }

  const product = await productService.restockProduct(req.params.id, qty, req.user.id);
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  res.json(product);
});

const getProductMovements = asyncHandler(async (req, res) => {
  const movements = await productService.getProductMovements(req.params.id);
  res.json(movements);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const deleted = await productService.softDeleteProduct(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  res.status(204).send();
});

module.exports = { getProducts, getProductById, createProduct, updateProduct, restockProduct, deleteProduct, getProductMovements };
