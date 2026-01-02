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
  resetPasswordWithOtp,
  getUserProfile,
  updateUserProfile,
  changePassword,
  addBalance,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
  addUser, // <-- تم إضافة الدالة الجديدة
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

// --- مسارات المستخدم العادية ---
router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, authUser);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.post('/reset-password-otp', resetPasswordWithOtp);

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, [ body('name', 'الاسم لا يمكن أن يكون فارغًا').not().isEmpty() ], updateUserProfile);

// --- تغيير كلمة المرور من قبل المستخدم نفسه ---
router.put('/change-password', protect, [
    body('oldPassword', 'كلمة المرور القديمة مطلوبة').not().isEmpty(),
    body('newPassword', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل').isLength({ min: 6 })
], changePassword);

// --- مسارات المدير ---
router.route('/admin/users')
    .get(protect, admin, getUsers)     // جلب جميع المستخدمين
    .post(protect, admin, [
        body('name', 'الاسم مطلوب').not().isEmpty(),
        body('email', 'الرجاء إدخال بريد إلكتروني صحيح').isEmail().normalizeEmail(),
        body('password', 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').isLength({ min: 6 })
    ], addUser);                         // إضافة مستخدم جديد

router.route('/admin/users/:id')
    .delete(protect, admin, deleteUser) // حذف مستخدم
    .get(protect, admin, getUserById)  // جلب مستخدم حسب ID
    .put(protect, admin, [
        body('name').optional().not().isEmpty().withMessage('الاسم لا يمكن أن يكون فارغًا'),
        body('email').optional().isEmail().withMessage('البريد الإلكتروني غير صالح')
    ], updateUser);                     // تعديل بيانات مستخدم

router.put('/admin/change-password/:id', protect, admin, [
    body('newPassword', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل').isLength({ min: 6 })
], changePassword);                     // تغيير كلمة المرور من قبل Admin

router.post('/admin/add-balance', protect, admin, addBalance); // إضافة رصيد

module.exports = router;
