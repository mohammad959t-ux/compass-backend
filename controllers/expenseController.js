const asyncHandler = require('express-async-handler');
const Expense = require('../models/Expense');

// إضافة مصروف جديد
const addExpense = asyncHandler(async (req, res) => {
  const { type, amount, description, date, relatedOrder } = req.body;

  if (!type || !amount) {
    res.status(400);
    throw new Error('Type and amount are required.');
  }

  const expense = await Expense.create({
    type,
    amount,
    description: description || '',
    date: date || Date.now(),
    relatedOrder: relatedOrder || null,
  });

  res.status(201).json(expense);
});

// تعديل مصروف
const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expense = await Expense.findById(id);

  if (!expense) {
    res.status(404);
    throw new Error('Expense not found.');
  }

  const { type, amount, description, date, relatedOrder } = req.body;

  expense.type = type || expense.type;
  expense.amount = amount || expense.amount;
  expense.description = description || expense.description;
  expense.date = date || expense.date;
  expense.relatedOrder = relatedOrder || expense.relatedOrder;

  await expense.save();
  res.json(expense);
});

// حذف مصروف
const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expense = await Expense.findById(id);

  if (!expense) {
    res.status(404);
    throw new Error('Expense not found.');
  }

  await expense.remove();
  res.json({ message: 'Expense deleted successfully.' });
});

// جلب كل المصاريف
const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await Expense.find().sort({ date: -1 });
  res.json(expenses);
});

module.exports = {
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
};
