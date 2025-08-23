// controllers/clientController.js
const Client = require('../models/Client'); // موديل Mongoose
const { uploadImageToCloud } = require('../utils/cloudinary'); // دالة رفع الصور للسحابة

// جلب كل العملاء
exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.find({});
    res.json({
      message: 'Clients fetched successfully',
      clients,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching clients.' });
  }
};

// إضافة عميل جديد
exports.createClient = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded.' });
  }

  try {
    const logoUrl = await uploadImageToCloud(req.file);

    const newClient = await Client.create({
      name: req.body.name,
      logoUrl,
    });

    res.status(201).json({
      message: 'Client added successfully',
      client: newClient,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating client.' });
  }
};

// تعديل عميل
exports.updateClient = async (req, res) => {
  try {
    const clientToUpdate = await Client.findById(req.params.id);
    if (!clientToUpdate) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    if (req.file) {
      const logoUrl = await uploadImageToCloud(req.file);
      clientToUpdate.logoUrl = logoUrl;
    }

    clientToUpdate.name = req.body.name || clientToUpdate.name;

    const updatedClient = await clientToUpdate.save();
    res.json({
      message: 'Client updated successfully',
      client: updatedClient,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating client.' });
  }
};

// حذف عميل
exports.deleteClient = async (req, res) => {
  try {
    const clientToDelete = await Client.findById(req.params.id);
    if (!clientToDelete) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    await clientToDelete.deleteOne();
    res.json({ message: 'Client deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting client.' });
  }
};
