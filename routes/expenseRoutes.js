const express = require('express');
const router = express.Router();
const { addExpense, updateExpense, deleteExpense, getExpenses } = require('../controllers/expenseController');
const { protect, admin } = require('../middleware/authMiddleware');

// جميع المسارات للإدمن فقط
router.use(protect);
router.use(admin);

router.post('/', addExpense); // إضافة مصروف
router.put('/:id', updateExpense); // تعديل مصروف
router.delete('/:id', deleteExpense); // حذف مصروف
router.get('/', getExpenses); // جلب كل المصاريف

module.exports = router;
