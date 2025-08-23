const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { protect, admin } = require('../middleware/authMiddleware');

// GET كل العملاء
router.get('/', clientController.getAllClients);

// POST إنشاء عميل جديد
router.post('/', protect, admin, clientController.uploadImageToCloud('logo'), clientController.createClient);

module.exports = router;
