const express = require('express');
const {
  getProducts, getProductById, createProduct, updateProduct, restockProduct, deleteProduct, getProductMovements,
} = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Kasir & admin boleh melihat katalog produk (dipakai halaman POS)
router.get('/', authenticate, authorize('admin', 'kasir'), getProducts);
router.get('/:id', authenticate, authorize('admin', 'kasir'), getProductById);

// Restock cepat: dibuka untuk kasir & admin (realistis secara operasional —
// kasir yang menerima barang dari supplier), TAPI tetap tercatat siapa
// pelakunya lewat stock_movements (lihat productController#restockProduct).
router.patch('/:id/restock', authenticate, authorize('admin', 'kasir'), restockProduct);

// Riwayat pergerakan stok (audit trail) — admin only.
router.get('/:id/movements', authenticate, authorize('admin'), getProductMovements);

// Hanya admin yang boleh mengelola master barang (harga, hapus, dsb.)
router.post('/', authenticate, authorize('admin'), createProduct);
router.put('/:id', authenticate, authorize('admin'), updateProduct);
router.delete('/:id', authenticate, authorize('admin'), deleteProduct);

module.exports = router;
