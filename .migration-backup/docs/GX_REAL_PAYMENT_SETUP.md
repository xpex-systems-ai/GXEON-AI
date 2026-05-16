# GX Real Payment Activation Guide

## 🌑 GXEON PIX Production Setup

This guide walks through activating **real PIX payments** with MercadoPago integration, webhook confirmation, and automatic commission distribution.

---

## 📋 Prerequisites

### MercadoPago Account
1. Create account at https://www.mercadopago.com.br
2. Complete identity verification (KYC)
3. Get **Production Access Token** from Developers Panel
4. Configure your **PIX Key** (CPF, Email, or Random)

### Webhook Setup
1. In MercadoPago Dashboard → Webhooks
2. Add URL: `https://your-app.railway.app/v1/webhook/mercadopago`
3. Select events: `payment`
4. Save and validate

---

## 🔧 Environment Configuration

### Required Environment Variables

```bash
# MercadoPago (REQUIRED)
export MERCADO_PAGO_ACCESS_TOKEN="YOUR_PRODUCTION_ACCESS_TOKEN"
export PIX_RECEIVER_KEY="your-pix-key-here"
export MP_NOTIFICATION_URL="https://your-app.railway.app/v1/webhook/mercadopago"

# Supabase (REQUIRED)
export SUPABASE_PROJECT_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Telegram (REQUIRED)
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="-100xxxxxxxxxx"
```

### Railway Dashboard Setup

1. Go to https://railway.app/dashboard
2. Select your project
3. Click "Variables" tab
4. Add each variable above
5. Redeploy the service

---

## 🗄️ Database Setup

Run the SQL schema in Supabase SQL Editor:

```bash
# File: supabase/GX_REAL_PAYMENT_SCHEMA.sql
psql $SUPABASE_DB_URL -f supabase/GX_REAL_PAYMENT_SCHEMA.sql
```

This creates:
- `transactions` table (all PIX payments)
- `commissions` table (commission tracking)
- `actor_wallets` table (actor balances)
- `webhook_logs` table (audit trail)

---

## 🚀 Deployment Steps

### 1. Disable Test Mode

```bash
# Remove test data generation
git rm scripts/test_*.js

# Commit changes
git commit -m "chore: remove test logic for production"
```

### 2. Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

### 3. Validate Deployment

```bash
# Run validation script
node scripts/real_payment_validation.js
```

Expected output:
```
✅ ENV_VALIDATION: PASS
✅ BOOT_VALIDATION: PASS
✅ PAYMENT_CREATION: PASS
💰 TEST PAYMENT CREATED
...
System Status: READY
```

---

## 🧪 Testing Real Payments

### Step 1: Create Test Payment (R$ 1.00)

```bash
curl -X POST https://your-app.railway.app/v1/payment/create \
  -H "Content-Type: application/json" \
  -d '{
    "actor_code": "GX_TEST",
    "amount": 1.00,
    "payer_email": "test@example.com",
    "payer_name": "Test User",
    "tier": "PRO"
  }'
```

### Step 2: Pay the PIX

1. Copy the `pix_copy_paste` code from response
2. Open your banking app
3. Pay via PIX
4. Wait for confirmation (usually instant)

### Step 3: Verify Webhook

Check webhook logs:
```sql
SELECT * FROM webhook_logs 
WHERE provider = 'mercadopago' 
ORDER BY received_at DESC 
LIMIT 5;
```

### Step 4: Confirm Transaction

```sql
SELECT * FROM transactions 
WHERE status = 'PAID' 
ORDER BY paid_at DESC 
LIMIT 1;
```

### Step 5: Verify Commission

```sql
SELECT * FROM commissions 
WHERE transaction_id = 'YOUR_TX_ID';
```

---

## 🔐 Security Checklist

- [ ] `MERCADO_PAGO_ACCESS_TOKEN` is production (not TEST-)
- [ ] `PIX_RECEIVER_KEY` is your registered PIX key
- [ ] Webhook URL is HTTPS and accessible
- [ ] Supabase RLS is enabled on all tables
- [ ] No debug routes are exposed
- [ ] Rate limiting is active
- [ ] All manual payment confirmation endpoints are removed

---

## 📊 Monitoring

### Check Payment Health
```bash
curl https://your-app.railway.app/v1/payment/health
```

### View Dashboard
```sql
SELECT * FROM payment_overview;
```

### Actor Earnings
```sql
SELECT * FROM actor_dashboard 
WHERE actor_code = 'YOUR_ACTOR_CODE';
```

---

## 🚨 Troubleshooting

### "Missing environment variable" Error
- Verify all required ENV vars in Railway dashboard
- Redeploy after adding variables

### Webhook Not Receiving
- Check URL is HTTPS
- Verify MercadoPago webhook configuration
- Check `webhook_logs` table for errors

### Payment Not Confirming
- Verify MercadoPago account is approved for production
- Check transaction stuck in `PENDING`
- Verify webhook is receiving and processing

### Commission Not Calculating
- Verify `actor_code` exists in `actors` table
- Check `commission_rate` is set (> 0)
- Verify `actor_wallets` row exists

---

## 🎯 Production Readiness Criteria

| Criteria | Status |
|----------|--------|
| Environment variables configured | ☐ |
| Database schema applied | ☐ |
| Test logic removed | ☐ |
| Real payment created successfully | ☐ |
| Webhook receiving notifications | ☐ |
| Payment auto-confirmed via webhook | ☐ |
| Commission auto-distributed | ☐ |
| **SYSTEM READY** | ☐ |

---

## 📝 Support

For issues:
1. Check logs: `railway logs`
2. Review `webhook_logs` table
3. Verify ENV vars in Railway dashboard
4. Contact: admin@gxeon.ai

---

**Comandante Júnior Sena - GXEON Systems** 🌑
