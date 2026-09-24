const express = require('express');
const {
  createTransaction, getTransactions, getTransactionById,
} = require('../controllers/transactionController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Checkout: kasir & admin
router.post('/', authenticate, authorize('admin', 'kasir'), createTransaction);

// Riwayat & laporan detail: admin only
router.get('/', authenticate, authorize('admin'), getTransactions);
router.get('/:id', authenticate, authorize('admin'), getTransactionById);

module.exports = router;
