const express = require('express');
const { getCategories, createCategory, renameCategory, deleteCategory } = require('../controllers/categoryController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'kasir'), getCategories);
router.post('/', authenticate, authorize('admin'), createCategory);
router.put('/:id', authenticate, authorize('admin'), renameCategory);
router.delete('/:id', authenticate, authorize('admin'), deleteCategory);

module.exports = router;
