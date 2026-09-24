const express = require('express');
const { getStoreSettings, updateStoreSettings } = require('../controllers/settingsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/store', authenticate, authorize('admin', 'kasir'), getStoreSettings);
router.put('/store', authenticate, authorize('admin'), updateStoreSettings);

module.exports = router;
