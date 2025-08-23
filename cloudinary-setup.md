# إعداد Cloudinary

## المتغيرات المطلوبة في ملف .env

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## كيفية الحصول على هذه القيم:

1. اذهب إلى [Cloudinary Dashboard](https://cloudinary.com/console)
2. سجل دخول أو أنشئ حساب جديد
3. من لوحة التحكم، ستجد:
   - **Cloud Name**: اسم السحابة الخاص بك
   - **API Key**: مفتاح API
   - **API Secret**: السر الخاص بـ API

## الأخطاء التي تم إصلاحها:

### 1. مشكلة في دالة uploadImageToCloud:
- كانت تتوقع `filePath` بدلاً من `file` من Multer
- تم إضافة التحقق من وجود الملف
- تم إضافة معالجة أفضل للأخطاء

### 2. دالة uploadImage المفقودة:
- تم إضافتها في serviceController
- تتعامل مع رفع الصور بشكل صحيح

### 3. حذف الصور القديمة:
- عند تحديث الخدمة، يتم حذف الصورة القديمة من Cloudinary
- عند حذف الخدمة، يتم حذف الصورة من Cloudinary

### 4. تحسينات إضافية:
- إضافة دالة `deleteImageFromCloud`
- معالجة أفضل للأخطاء
- تحسين جودة الصور (auto:good)
- تنسيق تلقائي للصور

## ملاحظات مهمة:

- تأكد من تثبيت مكتبة `cloudinary`: `npm install cloudinary`
- تأكد من وجود متغيرات البيئة الصحيحة
- الصور يتم رفعها إلى مجلد `projects` في Cloudinary
- يتم حذف الملفات المؤقتة تلقائياً من مجلد `uploads/`
