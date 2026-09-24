const express = require('express');
const { getStats, getReport } = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, authorize('admin'), getStats);
router.get('/report', authenticate, authorize('admin'), getReport);

module.exports = router;
