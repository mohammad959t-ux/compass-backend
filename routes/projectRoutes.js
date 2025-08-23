const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  removeProjectImage,
  addProjectDetail,
  removeProjectDetail,
  updateProjectDetail
} = require('../controllers/projectController');
const { protect, admin } = require('../middleware/authMiddleware');

// إعداد Multer لرفع الصور
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/projects/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Images only!'));
  }
};

const upload = multer({ storage, fileFilter });

// Routes
router.route('/')
  .get(getProjects)
  .post(protect, admin, upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]), createProject);

router.route('/:id')
  .get(getProjectById)
  .put(protect, admin, upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]), updateProject)
  .delete(protect, admin, deleteProject);

router.route('/:id/image')
  .delete(protect, admin, removeProjectImage);

router.route('/:id/detail')
  .post(protect, admin, addProjectDetail)
  .put(protect, admin, updateProjectDetail)
  .delete(protect, admin, removeProjectDetail);

module.exports = router;
