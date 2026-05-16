# GXEON Billing System - Deployment Guide

## Overview

This guide covers the deployment of the GXEON billing enforcement system, which fixes all 12 monetization leaks identified in the technical audit.

## Architecture

```
Request → gxeonEnforcer (deduct credits) → Execute Agent → Success/Refund
              ↓
    deduct_credits_atomic() RPC
              ↓
    [reserved] → [completed] OR [refunded]
```

## Quick Deployment (5 Steps)

### Step 1: Deploy Supabase Schema

Run in Supabase SQL Editor:

```sql
-- File: server/database/billing_schema_v2.sql

-- 1. Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance_credits NUMERIC DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Create billing transactions table
CREATE TABLE IF NOT EXISTS billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    amount NUMERIC NOT NULL,
    operation TEXT NOT NULL,
    request_id TEXT,
    balance_after NUMERIC,
    status TEXT DEFAULT 'reserved',
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create atomic deduction function
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
    p_api_key TEXT,
    p_amount NUMERIC,
    p_operation TEXT,
    p_request_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_transaction_id UUID;
BEGIN
    SELECT id, balance_credits INTO v_user_id, v_current_balance
    FROM users WHERE api_key = p_api_key FOR UPDATE;
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'API Key invalid');
    END IF;
    
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'message', 'Insufficient balance');
    END IF;
    
    v_new_balance := v_current_balance - p_amount;
    UPDATE users SET balance_credits = v_new_balance WHERE id = v_user_id;
    
    INSERT INTO billing_transactions (user_id, amount, operation, request_id, balance_after, status)
    VALUES (v_user_id, p_amount, p_operation, p_request_id, v_new_balance, 'reserved')
    RETURNING id INTO v_transaction_id;
    
    RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction_id, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql;

-- 4. Create refund function
CREATE OR REPLACE FUNCTION refund_credits(tx_id_input UUID)
RETURNS JSONB AS $$
DECLARE
    v_transaction RECORD;
BEGIN
    SELECT * INTO v_transaction FROM billing_transactions 
    WHERE id = tx_id_input AND status = 'reserved' FOR UPDATE;
    
    IF v_transaction IS NULL THEN
        RETURN jsonb_build_object('success', false);
    END IF;
    
    UPDATE users SET balance_credits = balance_credits + v_transaction.amount 
    WHERE id = v_transaction.user_id;
    
    UPDATE billing_transactions SET status = 'refunded', refunded_at = NOW() 
    WHERE id = tx_id_input;
    
    RETURN jsonb_build_object('success', true, 'refunded', v_transaction.amount);
END;
$$ LANGUAGE plpgsql;

-- 5. Create indexes
CREATE INDEX idx_users_api_key ON users(api_key);
CREATE INDEX idx_billing_user ON billing_transactions(user_id);
CREATE INDEX idx_billing_status ON billing_transactions(status);
```

### Step 2: Deploy Middleware

Ensure these files are in place:

```
server/
├── middleware/
│   └── gxeonEnforcer.js          # Billing middleware
├── services/
│   └── agentService.js             # Agent execution with error propagation
├── routes/
│   ├── agents_protected.js         # Protected agent routes
│   └── billing_integration.js      # Reference implementation
└── database/
    └── billing_schema_v2.sql       # Supabase schema
```

### Step 3: Configure Server

Replace `server/index.js` with `server/index_billing.js` or update manually:

```javascript
// Add to imports
const { gxeonEnforcer, gxeonAuthOnly } = require('./middleware/gxeonEnforcer');

// Protect routes
app.use('/chat', gxeonEnforcer({ llm_call: 0.001 }), chatRoute);
app.use('/api/agents', gxeonEnforcer({ agent_execution: 0.005 }), agentRoutes);
```

### Step 4: Create Test User

```sql
-- Create user with API key and balance
INSERT INTO users (id, name, api_key, balance_credits, status)
VALUES (
    gen_random_uuid(),
    'Test User',
    'gx-test-key-001',
    1.000,  -- $1.00 starting balance
    'active'
);
```

### Step 5: Test Billing Flow

```bash
# Test 1: Request without API key (should fail 401)
curl -X POST http://localhost:3000/api/agents/execute \
  -H "Content-Type: application/json" \
  -d '{"agent_type": "chatgpt", "payload": {"prompt": "hello"}}'

# Test 2: Request with invalid API key (should fail 401)
curl -X POST http://localhost:3000/api/agents/execute \
  -H "Content-Type: application/json" \
  -H "x-gxeon-key: invalid-key" \
  -d '{"agent_type": "chatgpt", "payload": {"prompt": "hello"}}'

# Test 3: Request with valid key but no balance (should fail 402)
curl -X POST http://localhost:3000/api/agents/execute \
  -H "Content-Type: application/json" \
  -H "x-gxeon-key: gx-test-key-001" \
  -d '{"agent_type": "chatgpt", "payload": {"prompt": "hello"}}'
# Note: First reduce balance to 0 to test this

# Test 4: Successful execution with balance
curl -X POST http://localhost:3000/api/agents/execute \
  -H "Content-Type: application/json" \
  -H "x-gxeon-key: gx-test-key-001" \
  -d '{"agent_type": "chatgpt", "payload": {"prompt": "hello"}}'

# Test 5: Check balance after execution
SELECT balance_credits FROM users WHERE api_key = 'gx-test-key-001';
```

## Pricing Configuration

| Operation | Cost (USD) | File |
|-----------|-----------|------|
| LLM Call (HuggingFace) | $0.001 | `index_billing.js:85` |
| LLM Call (DeepSeek) | $0.002 | `index_billing.js:91` |
| LLM Call (Grok) | $0.004 | `index_billing.js:97` |
| LLM Call (ChatGPT) | $0.0025 | `index_billing.js:103` |
| Agent Execution | $0.005 | `index_billing.js:79` |
| Task Pipeline | $0.002 | `index_billing.js:113` |
| Edge Function | $0.001 | `index_billing.js:123` |
| Onchain Operation | $0.015 | `index_billing.js:108` |

## Migration from Legacy System

### Option A: Gradual Migration (Recommended)

1. Deploy billing system alongside legacy routes
2. Add `gxeonEnforcer` only to new routes
3. Migrate users to new API keys gradually
4. Deprecate old routes after 30 days

### Option B: Hard Cutover

1. Backup database
2. Deploy all billing components
3. Generate API keys for all existing users
4. Notify users of billing activation
5. Switch DNS to new deployment

## Monitoring & Alerts

### Key Metrics to Track

```sql
-- Failed refunds (requires manual intervention)
SELECT * FROM billing_transactions 
WHERE status = 'reserved' 
AND created_at < NOW() - INTERVAL '1 hour';

-- Users with low balance
SELECT id, api_key, balance_credits 
FROM users 
WHERE balance_credits < 0.01;

-- Revenue per hour
SELECT DATE_TRUNC('hour', created_at) as hour, SUM(amount) as revenue
FROM billing_transactions 
WHERE status = 'completed'
GROUP BY hour ORDER BY hour DESC;
```

### Alert Conditions

1. **High Refund Rate** > 10% of transactions
2. **Failed Refunds** Any transaction stuck in 'reserved' > 1 hour
3. **Low Balance Users** Users with < $0.01 balance
4. **API Key Abuse** > 100 requests/minute from single key

## Troubleshooting

### Issue: "Saldo insuficiente" even with balance

**Cause:** User row locked by concurrent request

**Fix:** Check `deduct_credits_atomic` uses proper row locking (`FOR UPDATE`)

### Issue: Refunds not processing

**Cause:** Transaction ID mismatch

**Fix:** Verify `tx_id` is being passed correctly through middleware → route → service

### Issue: High latency on billing routes

**Cause:** Missing indexes on `users.api_key` or `billing_transactions.user_id`

**Fix:** Run the CREATE INDEX statements from Step 1

### Issue: "API Key inválida" for valid key

**Cause:** Case sensitivity or whitespace

**Fix:** Normalize API key: `apiKey.trim().toLowerCase()`

## Security Checklist

- [ ] All routes protected by `gxeonEnforcer` or `gxeonAuthOnly`
- [ ] Supabase RLS policies enabled on `users` and `billing_transactions`
- [ ] API keys are cryptographically random (not sequential)
- [ ] HTTPS enforced in production
- [ ] Rate limiting configured (express-rate-limit)
- [ ] No hardcoded API keys in codebase
- [ ] Billing RPC functions use `SECURITY DEFINER`

## Files Created

1. `server/middleware/gxeonEnforcer.js` - Billing middleware
2. `server/database/billing_schema_v2.sql` - Supabase schema
3. `server/services/agentService.js` - Agent execution service
4. `server/routes/agents_protected.js` - Protected routes
5. `server/routes/billing_integration.js` - Integration reference
6. `server/index_billing.js` - Server configuration

## Next Steps

1. Deploy Supabase schema (Step 1)
2. Configure environment variables
3. Test with `gx-test-key-001`
4. Monitor for 24 hours
5. Enable for production users

## Support

For issues with:
- **Billing logic**: Check `gxeonEnforcer.js` and RPC functions
- **Agent execution**: Check `agentService.js`
- **Database errors**: Verify schema and indexes
- **Route protection**: Check `index_billing.js` route mounting
