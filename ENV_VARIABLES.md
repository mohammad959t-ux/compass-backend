# ظ…طھط؛ظٹط±ط§طھ ط§ظ„ط¨ظٹط¦ط© ط§ظ„ظ…ط·ظ„ظˆط¨ط© - Environment Variables

## ظ…طھط؛ظٹط±ط§طھ Cloudinary (ظ…ط·ظ„ظˆط¨ط©):
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## ظ…طھط؛ظٹط±ط§طھ MongoDB:
```env
MONGO_URI=mongodb://localhost:27017/compass_db
```

## ظ…طھط؛ظٹط±ط§طھ ط£ط®ط±ظ‰:
```env
NODE_ENV=production
PORT=10000
```

## ظƒظٹظپظٹط© ط§ظ„ط­طµظˆظ„ ط¹ظ„ظ‰ ظ…طھط؛ظٹط±ط§طھ Cloudinary:

1. ط§ط°ظ‡ط¨ ط¥ظ„ظ‰ [Cloudinary Dashboard](https://cloudinary.com/console)
2. ط³ط¬ظ„ ط¯ط®ظˆظ„ ط£ظˆ ط£ظ†ط´ط¦ ط­ط³ط§ط¨ ط¬ط¯ظٹط¯
3. ظ…ظ† ظ„ظˆط­ط© ط§ظ„طھط­ظƒظ…طŒ ط³طھط¬ط¯:
   - **Cloud Name**: ط§ط³ظ… ط§ظ„ط³ط­ط§ط¨ط© ط§ظ„ط®ط§طµ ط¨ظƒ
   - **API Key**: ظ…ظپطھط§ط­ API
   - **API Secret**: ط§ظ„ط³ط± ط§ظ„ط®ط§طµ ط¨ظ€ API

## ظپظٹ Render Dashboard:

1. ط§ط°ظ‡ط¨ ط¥ظ„ظ‰ ظ…ط´ط±ظˆط¹ظƒ
2. ط§ط°ظ‡ط¨ ط¥ظ„ظ‰ **Environment**
3. ط£ط¶ظپ ط§ظ„ظ…طھط؛ظٹط±ط§طھ ط§ظ„طھط§ظ„ظٹط©:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `MONGO_URI`

## ظ…ظ„ط§ط­ط¸ط§طھ ظ…ظ‡ظ…ط©:
- طھط£ظƒط¯ ظ…ظ† ط£ظ† ط¬ظ…ظٹط¹ ظ…طھط؛ظٹط±ط§طھ Cloudinary ظ…ظˆط¬ظˆط¯ط©
- ظ„ط§ طھط´ط§ط±ظƒ ظ‡ط°ظ‡ ط§ظ„ظ‚ظٹظ… ظ…ط¹ ط£ظٹ ط´ط®طµ
- ظپظٹ RenderطŒ طھط£ظƒط¯ ظ…ظ† ط£ظ† ط§ظ„ظ…طھط؛ظٹط±ط§طھ marked as **Secret**


## SMM API (SaudiFollow):
```env
METJAR_API_URL=https://saudifollow.com/api/v2
METJAR_API_KEY=your_api_key
```

## Render Environment (additional):
- `METJAR_API_URL`
- `METJAR_API_KEY`

## Service Sync Cron:
```env
ENABLE_SERVICE_SYNC_CRON=true
SERVICE_SYNC_CRON=0 3 * * *
```

## Render Environment (cron):
- `ENABLE_SERVICE_SYNC_CRON`
- `SERVICE_SYNC_CRON`
