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

// المسارات بعد التعديل لدعم رفع الصور
router.route('/')
  .post(protect, admin, upload.single('image'), createService)
  .get(getServices);

router.route('/list')
  .get(protect, admin, getApiServices);

router.route('/import')
  .post(protect, admin, importApiServices);

router.route('/:id')
  .get(getServiceById)
  .put(protect, admin, upload.single('image'), updateService)
  .delete(protect, admin, deleteService);

module.exports = router;
