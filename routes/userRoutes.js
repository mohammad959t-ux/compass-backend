const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
    authUser,
    registerUser,
    verifyOtp, // <-- إضافة
    forgotPassword, // <-- إضافة
    resetPassword, // <-- إضافة
    getUserProfile,
    updateUserProfile,
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
router.post('/verify-otp', verifyOtp); // <-- مسار جديد
router.post('/forgot-password', forgotPassword); // <-- مسار جديد
router.put('/reset-password/:token', resetPassword); // <-- مسار جديد

router.route('/profile')
    .get(protect, getUserProfile)
    .put(protect, updateUserProfile);
    
// المسارات الخاصة بالمدير
router.route('/').get(protect, admin, getUsers);
router.route('/:id')
    .delete(protect, admin, deleteUser)
    .get(protect, admin, getUserById)
    .put(protect, admin, updateUser);

router.post('/add-balance', protect, admin, addBalance);

module.exports = router;