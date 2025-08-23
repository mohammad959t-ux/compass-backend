const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
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

// POST و PUT رفع الصور مباشرة للـ Cloud
router.route('/')
  .get(getProjects)
  .post(protect, admin, createProject);

router.route('/:id')
  .get(getProjectById)
  .put(protect, admin, updateProject)
  .delete(protect, admin, deleteProject);

router.route('/:id/image').delete(protect, admin, removeProjectImage);

router.route('/:id/detail')
  .post(protect, admin, addProjectDetail)
  .put(protect, admin, updateProjectDetail)
  .delete(protect, admin, removeProjectDetail);

module.exports = router;
