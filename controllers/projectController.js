const asyncHandler = require('express-async-handler');
const Project = require('../models/Project');

// @desc Create a new project
// @route POST /api/projects
// @access Private/Admin
const createProject = asyncHandler(async (req, res) => {
  const { title, description, details, coverImage, images } = req.body;

  if (!title || !description || !coverImage) {
    res.status(400);
    throw new Error('Title, Description and Cover Image are required');
  }

  const project = new Project({
    title,
    description,
    details: details ? details.split(',') : [],
    coverImage,
    images: images || [],
    createdBy: req.user._id,
  });

  const createdProject = await project.save();
  res.status(201).json(createdProject);
});

// @desc Get all projects with pagination and search
// @route GET /api/projects
// @access Public
const getProjects = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const search = req.query.search || '';

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
    items: projects,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// @desc Get a single project by ID
// @route GET /api/projects/:id
// @access Public
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  res.json(project);
});

// @desc Update a project
// @route PUT /api/projects/:id
// @access Private/Admin
const updateProject = asyncHandler(async (req, res) => {
  const { title, description, details, coverImage, images } = req.body;
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  project.title = title || project.title;
  project.description = description || project.description;
  project.details = details ? details.split(',') : project.details;
  if (coverImage) project.coverImage = coverImage;
  if (images && images.length > 0) project.images.push(...images);

  const updatedProject = await project.save();
  res.json(updatedProject);
});

// @desc Delete a project
// @route DELETE /api/projects/:id
// @access Private/Admin
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  await project.deleteOne();
  res.json({ message: 'Project removed successfully' });
});

// @desc Remove a specific image from a project
// @route DELETE /api/projects/:id/image
// @access Private/Admin
const removeProjectImage = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const imageIndex = project.images.indexOf(imageUrl);
  if (imageIndex > -1) {
    project.images.splice(imageIndex, 1);
    await project.save();
    res.json({ message: 'Image removed successfully', project });
  } else {
    res.status(404);
    throw new Error('Image not found in project');
  }
});

// @desc Add a detail to a project
// @route POST /api/projects/:id/detail
// @access Private/Admin
const addProjectDetail = asyncHandler(async (req, res) => {
  const { detail } = req.body;
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  project.details = project.details || [];
  project.details.push(detail);
  await project.save();
  res.json(project);
});

// @desc Remove a detail from a project
// @route DELETE /api/projects/:id/detail
// @access Private/Admin
const removeProjectDetail = asyncHandler(async (req, res) => {
  const { detail } = req.body;
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  project.details = project.details.filter(d => d !== detail);
  await project.save();
  res.json({ message: 'Detail removed successfully', project });
});

// @desc Update a detail in a project
// @route PUT /api/projects/:id/detail
// @access Private/Admin
const updateProjectDetail = asyncHandler(async (req, res) => {
  const { oldDetail, newDetail } = req.body;
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  const detailIndex = project.details.indexOf(oldDetail);
  if (detailIndex > -1) {
    project.details[detailIndex] = newDetail;
    await project.save();
    res.json(project);
  } else {
    res.status(404);
    throw new Error('Original detail not found');
  }
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
  updateProjectDetail,
};
