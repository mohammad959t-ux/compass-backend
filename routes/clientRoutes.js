// getAllClients
const Client = require('../models/Client');

// جلب كل العملاء
exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.find();

    res.status(200).json({
      success: true,
      clients, // 🔑 الآن الـ Flutter يقدر يستخدم ['clients']
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clients',
      error: error.message,
    });
  }
};
