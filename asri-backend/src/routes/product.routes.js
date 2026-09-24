const express = require('express');
const {
  getProducts, getProductById, createProduct, updateProduct, restockProduct, deleteProduct,
} = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Kasir & admin boleh melihat katalog produk (dipakai halaman POS)
router.get('/', authenticate, authorize('admin', 'kasir'), getProducts);
router.get('/:id', authenticate, authorize('admin', 'kasir'), getProductById);

// Hanya admin yang boleh mengelola master barang
router.post('/', authenticate, authorize('admin'), createProduct);
router.put('/:id', authenticate, authorize('admin'), updateProduct);
router.patch('/:id/restock', authenticate, authorize('admin'), restockProduct);
router.delete('/:id', authenticate, authorize('admin'), deleteProduct);

module.exports = router;
