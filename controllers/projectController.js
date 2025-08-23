// controllers/projectController.js
const asyncHandler = require('express-async-handler');
const Project = require('../models/Project');

// ===================== Create Project =====================
const createProject = asyncHandler(async (req, res) => {
  const { title, description, status, client } = req.body;

  if (!title || !description) {
    res.status(400);
    throw new Error('Title and Description are required');
  }

  const project = new Project({
    title,
    description,
    status: status || 'pending',
    client,
    createdBy: req.user._id,
  });

  const createdProject = await project.save();
  res.status(201).json(createdProject);
});

// ===================== Get All Projects (with Pagination + Search) =====================
const getProjects = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;     // رقم الصفحة
  const limit = Number(req.query.limit) || 20; // عدد العناصر في الصفحة
  const search = req.query.search || '';       // فلترة بالعنوان أو الوصف

  const query = search
    ? {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const total = await Project.countDocuments(query);

  const projects = await Project.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    items: projects,                // العناصر
    total,                          // مجموع العناصر
    page,                           // رقم الصفحة الحالية
    pages: Math.ceil(total / limit) // عدد الصفحات
  });
});

// ===================== Get Single Project by ID =====================
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  res.json(project);
});

// ===================== Update Project =====================
const updateProject = asyncHandler(async (req, res) => {
  const { title, description, status, client } = req.body;

  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  project.title = title || project.title;
  project.description = description || project.description;
  project.status = status || project.status;
  project.client = client || project.client;

  const updatedProject = await project.save();
  res.json(updatedProject);
});

// ===================== Delete Project =====================
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  await project.deleteOne();
  res.json({ message: 'Project removed successfully' });
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
};
