const express = require('express');
const {
  createTransaction, getTransactions, getTransactionById, getMyTransactions,
} = require('../controllers/transactionController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Checkout: kasir & admin
router.post('/', authenticate, authorize('admin', 'kasir'), createTransaction);

// Riwayat milik sendiri (kasir & admin) — WAJIB didaftarkan SEBELUM '/:id'
// agar path literal "/me" tidak "ketangkep" sebagai parameter :id.
router.get('/me', authenticate, authorize('admin', 'kasir'), getMyTransactions);

// Riwayat & laporan detail lintas kasir: admin only.
router.get('/', authenticate, authorize('admin'), getTransactions);
router.get('/:id', authenticate, authorize('admin'), getTransactionById);

module.exports = router;
