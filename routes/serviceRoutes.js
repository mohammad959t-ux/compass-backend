const express = require('express');
const router = express.Router();
const { createDiskUpload } = require('../middleware/uploadConfig');
const upload = createDiskUpload();
const { protect, admin } = require('../middleware/authMiddleware');
const serviceController = require('../controllers/serviceController');

// ط±ظپط¹ طµظˆط±ط© ظ…ط¨ط§ط´ط±ط©
router.post('/upload', protect, upload.single('image'), async (req, res) => {
  try {
    const url = await serviceController.uploadImage(req.file);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/sync', protect, admin, serviceController.syncApiServices);
router.delete('/delete-all', protect, admin, serviceController.deleteAllServices);
router.put('/make-visible/all', protect, admin, serviceController.makeAllServicesVisible);
router.get('/admin', protect, admin, serviceController.getServicesAdmin);
router.get('/categories', serviceController.getCategories);
router.get('/', serviceController.getServices);
router.post('/', protect, upload.single('image'), serviceController.createService);
router.put('/:id', protect, upload.single('image'), serviceController.updateService);
router.delete('/:id', protect, serviceController.deleteService);
router.get('/:id', serviceController.getServiceById);

module.exports = router;

