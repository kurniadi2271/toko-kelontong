const express = require('express');
const {
  getUsers, createUser, updateUser, setUserStatus, resetUserPassword,
} = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Seluruh manajemen akun HANYA untuk admin.
router.use(authenticate, authorize('admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', setUserStatus);
router.patch('/:id/password', resetUserPassword);

module.exports = router;
