# 🤖 GXEON Bot Examples

**Free Crypto Signals API (limited) → Upgrade for real-time access**

---

## 📋 Quick Start

### Free Tier (No API Key Required)
```bash
# Python
curl -X GET "https://gxeon-core.up.railway.app/v1/signals/free"

# Node.js
node node_bot.js

# Python
python python_bot.py
```

**Free tier limits:**
- 30 requests/day per IP
- Delayed data (5-15 min delay)
- Locked targets & stop-loss values
- Reduced confidence scores

---

## 💎 Upgrade to Real-Time

### Pricing
| Tier | Price | Daily Signals | Features |
|------|-------|---------------|----------|
| BASIC | R$ 29.90 | 10 | Full details, API access |
| PRO | R$ 99.90 | 100 | Real-time, priority support |
| ENTERPRISE | R$ 299.90 | 1000 | Dedicated support, webhooks |

### How to Upgrade

**1. Register your agent:**
```bash
curl -X POST "https://gxeon-core.up.railway.app/v1/register-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "name": "Your Bot Name",
    "tier": "BASIC"
  }'
```

**2. Response includes:**
- `payment.pix_qr_code` - Scan to pay via PIX
- `payment.pix_copy_paste` - Copy-paste PIX code
- `credentials.api_key` - Will activate after payment

**3. Pay via PIX and wait for activation** (automatic via webhook)

**4. Use your API key:**
```bash
curl -X GET "https://gxeon-core.up.railway.app/v1/signals" \
  -H "X-API-Key: YOUR_API_KEY"
```

---

## 🔧 Example Bots

### Node.js Bot
```bash
# Free tier
node node_bot.js

# Show upgrade info
node node_bot.js --upgrade

# Paid tier (after activation)
node node_bot.js --api-key=YOUR_API_KEY
```

### Python Bot
```bash
# Free tier
python python_bot.py

# Show upgrade info
python python_bot.py --upgrade
```

---

## 📡 API Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /v1/signals/free` | None | Free tier (limited) |
| `GET /v1/signals` | API Key | Real-time signals |
| `POST /v1/register-agent` | None | Register & get PIX |
| `GET /v1/agent/status` | API Key | Check quota & status |

---

## 💰 Payment Flow

1. **Register** → Get PIX code + pending API key
2. **Pay PIX** → Any banking app
3. **Webhook confirmation** → Automatic activation
4. **Use API** → Real-time signals

**Treasury:** `0x3955d559055DadB7067054cB6E6f974710345224`

---

## 🆘 Support

- Docs: https://docs.gxeon.ai
- API Base: https://gxeon-core.up.railway.app
- Status: https://gxeon-core.up.railway.app/health

---

**Built with 🌙 by GXEON Autonomous Systems**
