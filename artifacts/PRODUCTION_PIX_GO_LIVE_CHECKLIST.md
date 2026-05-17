# GXEON Production PIX Go-Live Checklist

## 1) Railway environment variables
Set in Railway service:

- `MERCADO_PAGO_WEBHOOK_SECRET=<strong-random-secret>`
- `SUPABASE_URL=<supabase-project-url>`
- `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
- `NODE_ENV=production`
- `GXEON_RUNTIME_MODE=live`
- `MERCADO_PAGO_ACCESS_TOKEN=<app-access-token>`
- `MERCADO_PAGO_PUBLIC_KEY=<app-public-key>`
- `MERCADO_PAGO_CLIENT_ID=<client-id>`
- `MERCADO_PAGO_CLIENT_SECRET=<client-secret>`

> Security: never commit keys/tokens in git. Keep only in Railway/Supabase secret stores and rotate immediately if exposed.

## 2) Supabase production tables
Ensure these tables exist and RLS/service-role access is valid:

- `wallets`
- `credit_ledger`
- `subscriptions`
- `payments`
- `commission_settlements`
- `autonomous_tasks`

## 3) Mercado Pago webhook
Configure webhook URL in Mercado Pago:

- `POST https://<railway-domain>/webhooks/mercado-pago`

Expected behavior:
- `status=approved` + valid signature => instant credit activation.
- Duplicate event IDs => idempotent no-op.
- `status=pending` => follow-up queue entry.

## 4) Scheduler v2 runtime loop
Cron/worker cadence:

- Every 1 min: generate sellable Radar tasks
- Every 1 min: run scheduler settlement cycle
- Every 2 min: process pending PIX follow-ups

## 5) End-to-end production smoke test
1. Create PIX payment for top-up
2. Send approved webhook payload
3. Confirm wallet credit increase
4. Confirm dashboard metric increments

## 5.1) Deploy commands (Railway + runtime)

```bash
# login and bind project
railway login
railway link

# set/update secrets (repeat for each variable)
railway variables set MERCADO_PAGO_WEBHOOK_SECRET="<secret>"
railway variables set MERCADO_PAGO_ACCESS_TOKEN="<token>"
railway variables set SUPABASE_URL="<url>"
railway variables set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"

# deploy current branch
railway up

# check logs for webhook/scheduler health
railway logs --tail
```

## 6) cURL commands

```bash
# 1) Trigger task generation
curl -X POST "https://<railway-domain>/runtime/radar/generate" \
  -H "Content-Type: application/json" \
  -d '{"count":5,"base_price_credits":25,"consumer_agent_id":"agent_buyer_1"}'

# 2) Run settlement cycle
curl -X POST "https://<railway-domain>/runtime/scheduler/cycle" \
  -H "Content-Type: application/json" \
  -d '{"max_tasks":5,"fail_rate":0}'

# 3) Create PIX top-up
curl -X POST "https://<railway-domain>/runtime/topup/pix" \
  -H "Content-Type: application/json" \
  -d '{"agent_id":"agent_buyer_1","amount":297}'

# 4) Simulate approved webhook
curl -X POST "https://<railway-domain>/webhooks/mercado-pago" \
  -H "Content-Type: application/json" \
  -H "x-signature: <computed-hmac-sha256>" \
  -d '{"id":"pix_live_001","status":"approved","payment_type_id":"pix","amount":297,"metadata":{"agent_id":"agent_buyer_1"}}'

# 5) Process pending follow-ups
curl -X POST "https://<railway-domain>/runtime/pix/followups/process" \
  -H "Content-Type: application/json" \
  -d '{"limit":50}'

# 6) Fetch dashboard metrics
curl -X GET "https://<railway-domain>/runtime/dashboard/revenue"
```

## 7) 14-day revenue sprint (R$10k)
- Day 1-2: launch Basic/Pro with live PIX checkout.
- Day 3-5: daily outbound + WhatsApp follow-up for pending PIX.
- Day 6-10: push Enterprise demos with assisted onboarding.
- Day 11-14: retarget inactive leads + auto top-up campaigns.

Target mix example:
- 20 × Basic (R$297) = R$5.940
- 4 × Pro (R$997) = R$3.988
- Total = R$9.928 (near R$10k, one upsell closes gap)
