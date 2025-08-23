// lib/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  createBulkOrders, // ✅ تم إضافة الدالة الجديدة
  getUserOrders, 
  getOrdersForAdmin, 
  getRecentOrders, 
  updateOrderStatus, 
  createOrderManual,
  checkOrderStatuses
} = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// إنشاء طلب جديد من التطبيق (للمستخدم العادي)
router.post('/', protect, createOrder);

// ✅ المسار الجديد لإنشاء طلبات متعددة من العربة
router.post('/bulk-create', protect, createBulkOrders);

// جلب طلبات المستخدم العادي
router.get('/myorders', protect, getUserOrders);

// 🛠️ مسار جديد لعملية فحص حالة الطلبات التلقائية
router.get('/status-check', protect, checkOrderStatuses); // ✅ تم إضافة حماية protect

// تحديث حالة الطلب (Admin فقط)
router.put('/:id/status', protect, admin, updateOrderStatus);

// إضافة طلب يدوي (Admin فقط)
router.post('/manual', protect, admin, createOrderManual);

// جلب كل الطلبات للـ Admin
router.get('/', protect, admin, getOrdersForAdmin);

// جلب أحدث 10 طلبات للـ Admin
router.get('/recent', protect, admin, getRecentOrders);


module.exports = router;