// controllers/clientController.js
const Client = require('../models/Client'); // <--- استيراد موديل Mongoose
const fs = require('fs');
const path = require('path');

// لم نعد بحاجة للمصفوفة المؤقتة
// let clientsData = []; 

// وظيفة لجلب جميع العملاء (من قاعدة البيانات)
exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.find({}); // جلب كل العملاء
    res.json({
      message: 'Clients fetched successfully',
      clients: clients,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching clients.' });
  }
};

// وظيفة لإضافة عميل جديد (إلى قاعدة البيانات)
exports.createClient = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded.' });
  }

  try {
    const newClient = await Client.create({
      name: req.body.name,
      logoUrl: `/uploads/${req.file.filename}`,
    });

    res.status(201).json({
      message: 'Client added successfully',
      client: newClient,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating client.' });
  }
};

// وظيفة التعديل (في قاعدة البيانات)
exports.updateClient = async (req, res) => {
  try {
    const clientToUpdate = await Client.findById(req.params.id);

    if (!clientToUpdate) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    // التحقق مما إذا كان هناك ملف جديد
    if (req.file) {
      // حذف الصورة القديمة
      const oldImagePath = path.join(__dirname, '..', clientToUpdate.logoUrl);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      // تحديث مسار الشعار
      clientToUpdate.logoUrl = `/uploads/${req.file.filename}`;
    }

    // تحديث الاسم إذا تم إرساله
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

// وظيفة الحذف (من قاعدة البيانات)
exports.deleteClient = async (req, res) => {
  try {
    const clientToDelete = await Client.findById(req.params.id);

    if (!clientToDelete) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    // حذف الصورة من السيرفر
    const imagePath = path.join(__dirname, '..', clientToDelete.logoUrl);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // حذف العميل من قاعدة البيانات
    await clientToDelete.deleteOne();

    res.json({ message: 'Client deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting client.' });
  }
};