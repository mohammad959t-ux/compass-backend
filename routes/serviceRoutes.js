const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const serviceController = require('../controllers/serviceController');

// POST رفع صورة الخدمة مباشرة للسحابة
router.post('/upload', protect, serviceController.uploadImageToCloud('image'), (req, res) => {
  res.json({ url: req.fileUrl });
});

// باقي الروتات كما هي
router.post('/sync', protect, admin, serviceController.syncApiServices);
router.delete('/delete-all', protect, admin, serviceController.deleteAllServices);
router.put('/make-visible/all', protect, admin, serviceController.makeAllServicesVisible);
router.get('/admin', protect, admin, serviceController.getServicesAdmin);
router.get('/categories', serviceController.getCategories);
router.get('/', serviceController.getServices);
router.post('/', protect, serviceController.uploadImageToCloud('image'), serviceController.createService);
router.put('/:id', protect, serviceController.updateService);
router.delete('/:id', protect, serviceController.deleteService);
router.get('/:id', serviceController.getServiceById);

module.exports = router;
