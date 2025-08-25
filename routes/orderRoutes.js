const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  createBulkOrders,
  getUserOrders, 
  getOrdersForAdmin, 
  getRecentOrders, 
  updateOrderStatus, 
  createOrderManual,
  checkOrderStatuses,
  payOrder // ✅ إضافة الدالة الجديدة
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// إنشاء طلب جديد من التطبيق (للمستخدم العادي)
router.post('/', protect, createOrder);

// إنشاء طلبات متعددة من العربة
router.post('/bulk-create', protect, createBulkOrders);

// جلب طلبات المستخدم العادي
router.get('/myorders', protect, getUserOrders);

// فحص حالة الطلبات التلقائية (Cron / Admin)
router.get('/status-check', protect, checkOrderStatuses);

// تحديث حالة الطلب (Admin فقط)
router.put('/:id/status', protect, admin, updateOrderStatus);

// دفع جزئي أو تسجيل دفعة على طلب موجود
router.post('/:id/pay', protect, payOrder);

// إضافة طلب يدوي (Admin فقط)
router.post('/manual', protect, admin, createOrderManual);

// جلب كل الطلبات للـ Admin
router.get('/', protect, admin, getOrdersForAdmin);

// جلب أحدث 10 طلبات للـ Admin
router.get('/recent', protect, admin, getRecentOrders);

module.exports = router;
