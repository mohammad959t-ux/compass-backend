const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  getUserOrders, 
  getOrdersForAdmin, 
  getRecentOrders, 
  updateOrderStatus, 
  createOrderManual 
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// إنشاء طلب جديد من التطبيق
router.post('/', protect, createOrder);

// جلب طلبات المستخدم العادي
router.get('/myorders', protect, getUserOrders);

// تحديث حالة الطلب (Admin)
router.put('/:id/status', protect, admin, updateOrderStatus);

// إضافة طلب يدوي (Admin)
router.post('/manual', protect, admin, createOrderManual);

// جلب كل الطلبات للـ Admin
router.get('/', protect, admin, getOrdersForAdmin);

// جلب أحدث 10 طلبات للـ Admin
router.get('/recent', protect, admin, getRecentOrders);

module.exports = router;
