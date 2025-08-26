const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { addUser, adminChangePassword } = require('../controllers/adminController');

// إضافة مستخدم جديد (Admin فقط)
router.post('/add-user', protect, admin, addUser);

// تغيير كلمة المرور لأي مستخدم (Admin فقط)
router.put('/change-password/:id', protect, admin, adminChangePassword);

module.exports = router;
