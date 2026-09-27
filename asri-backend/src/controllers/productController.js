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
  if (!productService.CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Kategori tidak valid. Pilihan: ${productService.CATEGORIES.join(', ')}` });
  }
  if (Number(costPrice) < 0 || Number(sellPrice) < 0) {
    return res.status(400).json({ error: 'HPP dan harga jual tidak boleh negatif.' });
  }

  try {
    const product = await productService.createProduct({
      barcode, name, category, unit, costPrice, sellPrice, stock, lowStockThreshold,
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === '23505') { // unique_violation (barcode duplikat)
      return res.status(409).json({ error: 'Barcode sudah digunakan oleh produk lain.' });
    }
    throw err;
  }
});

const updateProduct = asyncHandler(async (req, res) => {
  const { category } = req.body;
  if (category && !productService.CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Kategori tidak valid. Pilihan: ${productService.CATEGORIES.join(', ')}` });
  }

  const product = await productService.updateProduct(req.params.id, req.body);
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  res.json(product);
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
