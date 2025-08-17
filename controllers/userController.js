const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please enter all fields');
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({ name, email, password });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
      balance: user.balance,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token: generateToken(user._id),
      balance: user.balance,
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      balance: user.balance,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;

    if (req.body.email && req.body.email !== user.email) {
      user.transactions.push({
        type: 'credit',
        amountUSD: 0,
        currency: 'USD',
        createdBy: req.user._id,
        note: `Email changed from ${user.email} to ${req.body.email}`,
      });
      user.email = req.body.email;
    }

    if (req.body.password) {
      user.transactions.push({
        type: 'credit',
        amountUSD: 0,
        currency: 'USD',
        createdBy: req.user._id,
        note: 'Password changed',
      });
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      token: generateToken(updatedUser._id),
      balance: updatedUser.balance,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Add balance to a user
// @route   POST /api/users/add-balance
// @access  Private/Admin
const addBalance = asyncHandler(async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount || amount <= 0) {
    res.status(400);
    throw new Error('Invalid user ID or amount.');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found.');
  }

  user.balance += amount;
  user.transactions.push({
    type: 'credit',
    amountUSD: amount,
    currency: 'USD',
    createdBy: req.user._id,
    note: 'Admin added balance manually',
  });

  await user.save();

  res.status(200).json({
    message: `Balance of ${amount} added successfully to ${user.name}. New balance: ${user.balance}`,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      transactions: user.transactions,
    },
  });
});

// @desc    Get all users for admin
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user) res.json(user);
  else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update a user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    user.name = req.body.name || user.name;

    if (req.body.email && req.body.email !== user.email) {
      user.transactions.push({
        type: 'credit',
        amountUSD: 0,
        currency: 'USD',
        createdBy: req.user._id,
        note: `Email changed from ${user.email} to ${req.body.email}`,
      });
      user.email = req.body.email;
    }

    if (req.body.password) {
      user.transactions.push({
        type: 'credit',
        amountUSD: 0,
        currency: 'USD',
        createdBy: req.user._id,
        note: 'Password changed',
      });
      user.password = req.body.password;
    }

    user.isAdmin = req.body.isAdmin;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      balance: updatedUser.balance,
      transactions: updatedUser.transactions,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  authUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  addBalance,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
};
