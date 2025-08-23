# دليل رفع المشاريع - Project Upload Guide

## كيفية رفع مشروع جديد:

### 1. **استخدام FormData:**
```javascript
const formData = new FormData();
formData.append('title', 'عنوان المشروع');
formData.append('description', 'وصف المشروع');
formData.append('details', 'تفصيل 1,تفصيل 2,تفصيل 3');
formData.append('coverImage', file); // ملف الصورة الرئيسية

fetch('/api/projects', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 2. **استخدام Postman:**
- **Method**: POST
- **URL**: `/api/projects`
- **Headers**: 
  - `Authorization`: `Bearer {token}`
- **Body**: `form-data`
  - `title`: نص
  - `description`: نص
  - `details`: نص (مفصول بفواصل)
  - `coverImage`: ملف (File)

### 3. **استخدام cURL:**
```bash
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -F "title=عنوان المشروع" \
  -F "description=وصف المشروع" \
  -F "details=تفصيل 1,تفصيل 2" \
  -F "coverImage=@/path/to/image.jpg" \
  http://localhost:5000/api/projects
```

## كيفية تحديث مشروع:

### 1. **تحديث البيانات فقط:**
```javascript
fetch(`/api/projects/${projectId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'عنوان جديد',
    description: 'وصف جديد'
  })
});
```

### 2. **تحديث الصورة الرئيسية:**
```javascript
const formData = new FormData();
formData.append('title', 'عنوان جديد');
formData.append('coverImage', newImageFile);

fetch(`/api/projects/${projectId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

## ملاحظات مهمة:

1. **الصورة الرئيسية**: يجب أن تكون باسم `coverImage`
2. **الصور الإضافية**: غير مدعومة حالياً (سيتم إضافتها لاحقاً)
3. **التفاصيل**: مفصولة بفواصل
4. **المصادقة**: مطلوبة (admin فقط)

## الأخطاء الشائعة:

- **`Unexpected field`**: تأكد من أن اسم الحقل `coverImage`
- **`Cover Image is required`**: تأكد من رفع صورة
- **`Title is required`**: تأكد من إرسال العنوان
- **`Description is required`**: تأكد من إرسال الوصف
