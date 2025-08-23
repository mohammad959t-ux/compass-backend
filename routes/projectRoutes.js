const express = require('express');
const router = express.Router();
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

// استيراد الـ upload middleware المخصص
const createUploadMiddleware = require('../middleware/upload');

// إعداد upload لمجلد المشاريع
const upload = createUploadMiddleware('projects');

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
