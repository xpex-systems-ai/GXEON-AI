# 🌙 GXEON Free Crypto Signals API

**Free trading signals for bots. Upgrade via PIX for real-time data.**

---

## 🚀 Quick Start (Free Tier)

```bash
# Get free crypto signals (no API key needed)
curl https://gxeon-core.up.railway.app/v1/signals/free
```

**Free tier includes:**
- ✅ 30 requests/day
- ✅ BTC, ETH, major pairs
- ⚠️ 5-15 minute delay
- 🔒 Locked targets (upgrade to unlock)

---

## 💎 Upgrade to Real-Time

| Tier | Price | Daily Signals | Features |
|------|-------|---------------|----------|
| **BASIC** | R$ 29.90 | 10 | Full details, API access |
| **PRO** | R$ 99.90 | 100 | Real-time, webhooks |
| **ENTERPRISE** | R$ 299.90 | 1000 | Dedicated support |

### How to Upgrade

**1. Register your bot:**
```bash
curl -X POST https://gxeon-core.up.railway.app/v1/register-agent \
  -H "Content-Type: application/json" \
  -d '{"email": "bot@example.com", "name": "MyBot", "tier": "BASIC"}'
```

**2. Response includes:**
- `pix_qr_code` - Scan to pay
- `pix_copy_paste` - PIX code for banking apps
- `api_key` - Activates automatically after payment

**3. Pay via PIX** → Automatic activation via webhook

**4. Use your API key:**
```bash
curl https://gxeon-core.up.railway.app/v1/signals \
  -H "X-API-Key: YOUR_API_KEY"
```

---

## 📡 API Endpoints

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /v1/signals/free` | None | Free tier (limited, delayed) |
| `GET /v1/signals` | API Key | Real-time signals |
| `POST /v1/register-agent` | None | Register & get PIX code |
| `GET /v1/agent/status` | API Key | Check quota & usage |

---

## 🐍 Python Bot Example

```python
import requests

# Free tier - no API key
response = requests.get("https://gxeon-core.up.railway.app/v1/signals/free")
data = response.json()

print(f"Signals: {data['count']}")
for signal in data['signals']:
    print(f"  {signal['pair']}: {signal['type']} @ {signal['entry']}")
    # Upgrade to see targets, stop loss, etc.
```

**Full example:** See `examples/python_bot.py`

---

## 📡 Node.js Bot Example

```javascript
const axios = require('axios');

// Free tier
const response = await axios.get(
  'https://gxeon-core.up.railway.app/v1/signals/free'
);
console.log('Signals:', response.data.signals);

// Upgrade for real-time: POST /v1/register-agent
```

**Full example:** See `examples/node_bot.js`

---

## 💰 Paywall Flow

```
1. Test API → GET /v1/signals/free
2. Hit limit → 429 "Rate limit exceeded"
3. Try paid → GET /v1/signals
4. Paywall → 402 + PIX payload
5. Pay PIX → Webhook confirms
6. Activated → API key works!
```

---

## 🆘 Support

- **API Base:** `https://gxeon-core.up.railway.app`
- **Health Check:** `/health`
- **Examples:** `examples/` directory

---

**Treasury:** `0x3955d559055DadB7067054cB6E6f974710345224`

Built with 🌙 by GXEON Autonomous Systems
