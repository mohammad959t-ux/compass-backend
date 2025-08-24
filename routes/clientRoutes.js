const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getAllClients } = require('../controllers/clientController');

// المسار لجلب جميع العملاء (متاح للمدير فقط)
router.get('/', protect, admin, getAllClients);

module.exports = router;
