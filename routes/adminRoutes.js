const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { addUser, adminChangePassword } = require('../controllers/adminController');

router.post('/add-user', protect, admin, addUser);
router.put('/change-password/:id', protect, admin, adminChangePassword);

module.exports = router;
