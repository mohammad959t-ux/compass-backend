# متغيرات البيئة المطلوبة - Environment Variables

## متغيرات Cloudinary (مطلوبة):
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
h=your_api_secret
```

## متغيرات MongoDB:
```env
MONGO_URI=mongodb://localhost:27017/compass_db
```

## متغيرات أخرى:
```env
NODE_ENV=production
PORT=10000
```

## كيفية الحصول على متغيرات Cloudinary:

1. اذهب إلى [Cloudinary Dashboard](https://cloudinary.com/console)
2. سجل دخول أو أنشئ حساب جديد
3. من لوحة التحكم، ستجد:
   - **Cloud Name**: اسم السحابة الخاص بك
   - **API Key**: مفتاح API
   - **API Secret**: السر الخاص بـ API

## في Render Dashboard:

1. اذهب إلى مشروعك
2. اذهب إلى **Environment**
3. أضف المتغيرات التالية:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `MONGO_URI`

## ملاحظات مهمة:
- تأكد من أن جميع متغيرات Cloudinary موجودة
- لا تشارك هذه القيم مع أي شخص
- في Render، تأكد من أن المتغيرات marked as **Secret**
