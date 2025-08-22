// controllers/clientController.js
const Client = require('../models/Client');
const fs = require('fs'); // لإدارة الملفات على السيرفر (لحذف الصور)
const path = require('path'); // للتعامل مع مسارات الملفات

let clientsData = []; // استخدام 'let' بدلاً من 'const' لتكون قابلة للتعديل

// وظيفة لجلب جميع العملاء
exports.getAllClients = (req, res) => {
  res.json({
    message: 'Clients fetched successfully',
    clients: clientsData,
  });
};

// وظيفة لإضافة عميل جديد مع شعار مرفوع
exports.createClient = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded.' });
  }

  const newClient = new Client(
    clientsData.length > 0 ? clientsData[clientsData.length - 1].id + 1 : 1, // معرف (ID) فريد
    req.body.name,
    `/uploads/${req.file.filename}`
  );

  clientsData.push(newClient);

  res.status(201).json({
    message: 'Client added successfully',
    client: newClient,
  });
};

// ** إضافة وظيفة التعديل **
exports.updateClient = (req, res) => {
  const { id } = req.params;
  const clientIndex = clientsData.findIndex(c => c.id === parseInt(id));

  if (clientIndex === -1) {
    return res.status(404).json({ message: 'Client not found.' });
  }

  const clientToUpdate = clientsData[clientIndex];
  
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
  if (req.body.name) {
    clientToUpdate.name = req.body.name;
  }

  res.json({
    message: 'Client updated successfully',
    client: clientToUpdate,
  });
};

// ** إضافة وظيفة الحذف **
exports.deleteClient = (req, res) => {
  const { id } = req.params;
  const clientIndex = clientsData.findIndex(c => c.id === parseInt(id));

  if (clientIndex === -1) {
    return res.status(404).json({ message: 'Client not found.' });
  }
  
  const clientToDelete = clientsData[clientIndex];
  
  // حذف الصورة من السيرفر
  const imagePath = path.join(__dirname, '..', clientToDelete.logoUrl);
  if (fs.existsSync(imagePath)) {
    fs.unlinkSync(imagePath);
  }

  // حذف العميل من القائمة
  clientsData.splice(clientIndex, 1);

  res.json({ message: 'Client deleted successfully.' });
};