// lib/routes/serviceRoutes.js

const express = require('express');
const router = express.Router();
const {
  getServices,
  getApiService,
  updateService,
  createService,
  deleteService,
  getServiceById,
  syncApiServices // 🛠️ استيراد الدالة الجديدة
} = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');

// ... المسارات الحالية
router.route('/sync').get(protect, admin, syncApiServices); // 🛠️ المسار الجديد

// ... المسارات الأخرى