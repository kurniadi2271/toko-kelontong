const express = require('express');
const { getStats, getReport, getKasirStats } = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, authorize('admin'), getStats);
router.get('/report', authenticate, authorize('admin'), getReport);

// Dashboard ringkas khusus kasir (omset/transaksi miliknya sendiri, tanpa laba).
router.get('/kasir-stats', authenticate, authorize('admin', 'kasir'), getKasirStats);

module.exports = router;
