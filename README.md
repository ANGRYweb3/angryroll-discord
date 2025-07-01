# 🤖 Angryroll Discord Service

Discord notification microservice สำหรับ Angryroll Gaming Platform ที่รองรับการแจ้งเตือนเกม Coinflip, Jackpot และ Revenue tracking

## ✨ Features

- 🎮 **Game Notifications**: แจ้งเตือนการสร้างเกม, การจบเกม และผู้ชนะ
- 💰 **Revenue Tracking**: ติดตามรายได้จาก Mirror Node และแจ้งเตือนเมื่อมีการเปลี่ยนแปลง
- 🎯 **Separate Channels**: รองรับ Discord channels แยกสำหรับ games และ revenue
- 🚀 **RESTful API**: เรียกใช้ผ่าน HTTP API endpoints
- 🧪 **Testing Tools**: เครื่องมือทดสอบครบครัน

## 📦 Installation

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. คัดลอกและแก้ไข environment variables
cp env-example.txt .env

# 3. แก้ไข .env ให้ใส่ Discord webhook URLs
nano .env
```

## ⚙️ Configuration

สร้างไฟล์ `.env` และตั้งค่า:

```bash
# Discord Webhook URLs
DISCORD_WEBHOOK_URL_GAMES=https://discord.com/api/webhooks/your_games_webhook
DISCORD_WEBHOOK_URL_REVENUE=https://discord.com/api/webhooks/your_revenue_webhook

# Server Configuration  
PORT=3000
NODE_ENV=production
```

## 🚀 Running the Service

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start

# ทดสอบการทำงาน
npm test
```

## 📡 API Endpoints

### Health Checks
```bash
GET /health          # ตรวจสอบสถานะ service
GET /status          # ตรวจสอบการตั้งค่า webhooks
```

### Game Notifications
```bash
POST /notify/coinflip/created    # แจ้งเตือนการสร้าง coinflip game
POST /notify/coinflip/settled    # แจ้งเตือนการจบ coinflip game
POST /notify/jackpot/entry       # แจ้งเตือนการเข้าร่วม jackpot
POST /notify/jackpot/winner      # แจ้งเตือนผู้ชนะ jackpot
```

### Revenue Tracking
```bash
POST /notify/revenue/check       # ตรวจสอบ revenue แบบ manual
GET /revenue/stats              # ดูสถิติ revenue ปัจจุบัน
```

### Testing
```bash
POST /test/coinflip             # ทดสอบ coinflip notification
POST /test/jackpot              # ทดสอบ jackpot notification  
POST /test/revenue              # ทดสอบ revenue notification
```

## 🧪 Testing

### ทดสอบจากบรรทัดคำสั่ง:
```bash
# ทดสอบทั้งหมด
node testDiscord.js

# ทดสอบแยกประเภท
node testDiscord.js coinflip
node testDiscord.js jackpot-winner
node testDiscord.js revenue
node testDiscord.js stats

# ตรวจสอบการตั้งค่า
node testDiscord.js config
```

### ทดสอบผ่าน API:
```bash
# ทดสอบ coinflip notification
curl -X POST http://localhost:3000/test/coinflip

# ตรวจสอบสถานะ
curl http://localhost:3000/status

# ดูสถิติ revenue
curl http://localhost:3000/revenue/stats
```

## 🔌 Integration กับ Game Services

### สำหรับ Coinflip Service:
```javascript
// หลังจากสร้างเกม
await axios.post('http://discord-service-url/notify/coinflip/created', {
  id: gameId,
  betAmount: amount,
  creator: creatorId,
  creatorChoice: choice
});

// หลังจากเกมจบ
await axios.post('http://discord-service-url/notify/coinflip/settled', {
  gameId: gameId,
  wagerAmount: amount,
  winnerId: winnerId,
  winningSide: result,
  challengedByBot: isBot,
  feeCharged: fee
});
```

### สำหรับ Jackpot Service:
```javascript
// หลังจากผู้เล่นเข้าร่วม
await axios.post('http://discord-service-url/notify/jackpot/entry', {
  participantData: {
    username: 'Player123',
    amountEntered: 10,
    chancePercentage: 25
  },
  currentPot: 100,
  participantCount: 4
});

// หลังจากมีผู้ชนะ
await axios.post('http://discord-service-url/notify/jackpot/winner', {
  winnerUsername: 'Winner123',
  prizeAmount: 95,
  roundId: roundId,
  participantCount: 6,
  totalPot: 100
});
```

## 🏗️ Project Structure

```
discord-service/
├── server.js              # Express server หลัก
├── discordNotifier.js      # Discord webhook functions
├── revenueChecker.js       # Revenue tracking logic
├── testDiscord.js          # Testing utilities
├── package.json            # Dependencies และ scripts
├── env-example.txt         # ตัวอย่างการตั้งค่า
└── README.md              # คู่มือการใช้งาน
```

## 💰 Revenue Tracking

Service จะ:
1. ⏰ ตรวจสอบ revenue หลังจากเกมจบ (15-20 วินาที)
2. 🔍 Fetch balance จาก Hedera Mirror Node
3. 📊 เปรียบเทียบกับครั้งก่อน
4. 📢 ส่งแจ้งเตือนถ้ามีการเพิ่มขึ้น >= 0.001 HBAR

**Monitored Wallets:**
- Coinflip: `0.0.9276566`
- Jackpot: `0.0.9314288`

## 🎨 Discord Embed Design

### Visual Elements:
- **Footer**: Group-5627-1.png + "Angryroll Gaming Platform"
- **Thumbnail**: Angryrolllogo2.png (มุมขวาบน)
- **Colors**: 
  - Coinflip: `#F84565` (แดง)
  - Jackpot: `#FFD700` (ทอง)
  - Revenue: `#00FF00` (เขียว)

## 🚀 Deployment

### Render.com:
1. เชื่อมต่อ GitHub repository
2. ตั้งค่า Environment Variables
3. Build Command: `npm install`
4. Start Command: `npm start`

### Environment Variables สำหรับ Production:
```
DISCORD_WEBHOOK_URL_GAMES=your_webhook_url
DISCORD_WEBHOOK_URL_REVENUE=your_webhook_url
PORT=3000
NODE_ENV=production
```

## 🐛 Troubleshooting

### ปัญหาที่พบบ่อย:

**1. Webhook ไม่ทำงาน**
```bash
# ตรวจสอบการตั้งค่า
node testDiscord.js config
```

**2. Revenue ไม่อัปเดท**
```bash
# ตรวจสอบ Mirror Node
node testDiscord.js stats
```

**3. ทดสอบ API**
```bash
# ตรวจสอบ service
curl http://localhost:3000/health
```

## 📝 Changelog

### v1.0.0
- ✅ Discord notifications สำหรับ coinflip และ jackpot
- ✅ Revenue tracking จาก Mirror Node
- ✅ RESTful API endpoints
- ✅ Testing tools
- ✅ Separate channels support

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push และสร้าง Pull Request

## 📄 License

MIT License - ดูไฟล์ LICENSE สำหรับรายละเอียด 