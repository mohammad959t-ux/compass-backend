const express = require('express');
const router = express.Router();
const {
    authUser,
    registerUser,
    getUserProfile,
    updateUserProfile,
    addBalance,
    getUsers,
    deleteUser,
    getUserById,
    updateUser,
} = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');

// قم بتغيير المسار هنا من '/' إلى '/register'
router.post('/register', registerUser);

router.post('/login', authUser);
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
