const Project = require('../models/Project');
const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');

// إنشاء مشروع جديد مع رفع الصور
const createProject = asyncHandler(async (req, res) => {
  const { title, description, details } = req.body;
  const coverImageFile = req.files?.coverImage?.[0];
  const additionalImagesFiles = req.files?.images || [];

  if (!title || !description || !coverImageFile) {
    res.status(400);
    throw new Error('Title, description and cover image are required');
  }

  const coverImage = `/uploads/projects/${coverImageFile.filename}`;
  const images = additionalImagesFiles.map(file => `/uploads/projects/${file.filename}`);

  const project = await Project.create({
    title,
    description,
    coverImage,
    images,
    details: details ? JSON.parse(details) : []
  });

  res.status(201).json(project);
});

// جلب كل المشاريع
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json(projects);
});

// جلب مشروع واحد
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  res.json(project);
});

// تحديث مشروع مع الصور
const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const { title, description, details } = req.body;
  const coverImageFile = req.files?.coverImage?.[0];
  const additionalImagesFiles = req.files?.images || [];

  // تحديث صورة الغلاف وحذف القديمة
  if (coverImageFile) {
    if (project.coverImage) {
      const oldPath = path.join(__dirname, '..', project.coverImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    project.coverImage = `/uploads/projects/${coverImageFile.filename}`;
  }

  // إضافة الصور الجديدة
  if (additionalImagesFiles.length > 0) {
    const newImages = additionalImagesFiles.map(file => `/uploads/projects/${file.filename}`);
    project.images = [...project.images, ...newImages];
  }

  project.title = title || project.title;
  project.description = description || project.description;
  if (details) project.details = JSON.parse(details);

  const updatedProject = await project.save();
  res.json(updatedProject);
});

// حذف مشروع مع الصور
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // حذف صورة الغلاف
  if (project.coverImage) {
    const coverPath = path.join(__dirname, '..', project.coverImage);
    if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
  }

  // حذف الصور الإضافية
  if (project.images && project.images.length > 0) {
    project.images.forEach(img => {
      const imgPath = path.join(__dirname, '..', img);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    });
  }

  await project.remove();
  res.json({ message: 'Project removed' });
});

// حذف صورة واحدة من الصور الإضافية
const removeProjectImage = asyncHandler(async (req, res) => {
  const { imageName } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const imageIndex = project.images.findIndex(img => img.includes(imageName));
  if (imageIndex === -1) {
    res.status(404);
    throw new Error('Image not found in project');
  }

  const imagePath = path.join(__dirname, '..', project.images[imageIndex]);
  if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

  project.images.splice(imageIndex, 1);
  const updatedProject = await project.save();
  res.json(updatedProject);
});

// إضافة تفصيلة جديدة
const addProjectDetail = asyncHandler(async (req, res) => {
  const { detail } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (!detail) {
    res.status(400);
    throw new Error('Detail is required');
  }

  project.details.push(detail);
  const updatedProject = await project.save();
  res.json(updatedProject);
});

// حذف تفصيلة واحدة
const removeProjectDetail = asyncHandler(async (req, res) => {
  const { index } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (index === undefined || index < 0 || index >= project.details.length) {
    res.status(400);
    throw new Error('Invalid detail index');
  }

  project.details.splice(index, 1);
  const updatedProject = await project.save();
  res.json(updatedProject);
});

// تعديل تفصيلة محددة
const updateProjectDetail = asyncHandler(async (req, res) => {
  const { index, detail } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (index === undefined || index < 0 || index >= project.details.length) {
    res.status(400);
    throw new Error('Invalid detail index');
  }

  if (!detail) {
    res.status(400);
    throw new Error('Detail content is required');
  }

  project.details[index] = detail;
  const updatedProject = await project.save();
  res.json(updatedProject);
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  removeProjectImage,
  addProjectDetail,
  removeProjectDetail,
  updateProjectDetail
};
