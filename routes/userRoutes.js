// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  authUser,
  registerUser,
  verifyOtp,
  forgotPassword,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  changePassword, // <-- ✅ تم استيراد الدالة الجديدة
  addBalance,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// --- قواعد التحقق ---
const registerValidation = [
  body('name', 'الاسم مطلوب').not().isEmpty().trim().escape(),
  body('email', 'الرجاء إدخال بريد إلكتروني صحيح').isEmail().normalizeEmail(),
  body('password', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').isLength({ min: 6 }),
];

const loginValidation = [
  body('email', 'الرجاء إدخال بريد إلكتروني صحيح').isEmail().normalizeEmail(),
  body('password', 'كلمة المرور مطلوبة').exists(),
];

// --- المسارات ---
router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, authUser);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

// ✅ تعديل: مسار الملف الشخصي الآن يستخدم PUT لتحديث الاسم
router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, [ body('name', 'الاسم لا يمكن أن يكون فارغًا').not().isEmpty() ], updateUserProfile);

// ✅ إضافة: مسار جديد ومخصص لتغيير كلمة المرور
router.put('/change-password', protect, [
    body('oldPassword', 'كلمة المرور القديمة مطلوبة').not().isEmpty(),
    body('newPassword', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل').isLength({ min: 6 })
], changePassword);
    
// --- المسارات الخاصة بالمدير ---
router.route('/').get(protect, admin, getUsers);
router.route('/:id')
    .delete(protect, admin, deleteUser)
    .get(protect, admin, getUserById)
    .put(protect, admin, updateUser);

router.post('/add-balance', protect, admin, addBalance);

module.exports = router;