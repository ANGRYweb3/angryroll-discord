# การ Deploy Discord Service บน Render

## ขั้นตอนการ Deploy

### 1. เตรียม Repository
- ตรวจสอบว่า repository ถูก push ไป GitHub แล้ว
- ตรวจสอบว่าไฟล์ `.env` ถูกลบออกจาก git tracking แล้ว

### 2. สร้าง Service บน Render

1. ไปที่ [Render Dashboard](https://dashboard.render.com/)
2. คลิก "New +" และเลือก "Web Service"
3. เชื่อมต่อ GitHub repository ของคุณ
4. เลือก repository และ branch ที่ต้องการ
5. ตั้งค่าดังนี้:

#### Basic Settings
- **Name**: `angryroll-discord-service`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Free` (หรือตามต้องการ)

#### Advanced Settings
- **Auto-Deploy**: `Yes`
- **Health Check Path**: `/health`
- **Node Version**: `18` (หรือ 16+)

### 3. ตั้งค่า Environment Variables

ใน Render Dashboard หาส่วน "Environment Variables" และเพิ่ม:

```
NODE_ENV=production
DISCORD_WEBHOOK_URL_GAMES=https://discord.com/api/webhooks/1389559006716104867/W5_48e26uGAGUQeqpBJlWvTZ6TO1zARU9N6JTdHmcPPP8zx6E2onYPedB4ipPjtkgM6f
DISCORD_WEBHOOK_URL_REVENUE=https://discord.com/api/webhooks/1389557939781636146/j5Zfk32DQB2qCQel7QPSM7PlhulQ4LT68ntuWd-N_ToNcegUTpVtcXtSHFbhR89qHsbZ
```

### 4. Deploy

1. คลิก "Create Web Service"
2. รอให้ Render build และ deploy (ประมาณ 3-5 นาที)
3. เมื่อ deploy เสร็จจะได้ URL เช่น `https://angryroll-discord-service.onrender.com`

### 5. ทดสอบ Service

ทดสอบผ่าน browser หรือ curl:

```bash
# Health check
curl https://your-service-url.onrender.com/health

# Status check
curl https://your-service-url.onrender.com/status

# Test notification
curl -X POST https://your-service-url.onrender.com/test/coinflip
```

## Endpoints ที่สำคัญ

- `GET /health` - Health check
- `GET /status` - ตรวจสอบ webhook configuration
- `POST /notify/coinflip/created` - แจ้งเตือนเกม coinflip ใหม่
- `POST /notify/coinflip/settled` - แจ้งเตือนผลเกม coinflip
- `POST /notify/jackpot/entry` - แจ้งเตือนการเข้าร่วม jackpot
- `POST /notify/jackpot/winner` - แจ้งเตือนผู้ชนะ jackpot
- `POST /test/coinflip` - ทดสอบ notification coinflip
- `POST /test/jackpot` - ทดสอบ notification jackpot

## หมายเหตุ

1. **Free Plan Limitations**: 
   - Service จะ sleep หลังจากไม่มีการใช้งาน 15 นาที
   - จะใช้เวลา 30-60 วินาทีในการ wake up

2. **Security**: 
   - อย่าเปิดเผย webhook URLs
   - ตรวจสอบให้แน่ใจว่าไฟล์ .env ไม่ถูก commit

3. **Monitoring**: 
   - ใช้ Render dashboard ดู logs
   - ตั้งค่า monitoring ถ้าต้องการ

## การอัพเดต

เมื่อมีการ push code ใหม่ไป GitHub, Render จะ auto-deploy ใหม่อัตโนมัติ 