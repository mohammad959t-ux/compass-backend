const express = require('express');
const router = express.Router();
const {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  getApiServices,
  importApiServices,
} = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');
const multer = require('multer');

// إعداد Multer لتخزين الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // مسار حفظ الصور
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// مسارات للمستخدم العادي (عرض الخدمات فقط)
router.get('/', getServices);          // عرض كل الخدمات
router.get('/:id', getServiceById);    // عرض خدمة محددة

// مسارات Admin
router.post('/', protect, admin, upload.single('image'), createService);
router.put('/:id', protect, admin, upload.single('image'), updateService);
router.delete('/:id', protect, admin, deleteService);
router.get('/list', protect, admin, getApiServices);
router.post('/import', protect, admin, importApiServices);

module.exports = router;
