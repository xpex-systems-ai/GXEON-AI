# 🧪 GXEON M2M Test Suite

## Final Validation Tests for Sovereign Data Endpoint

### Quick Start

```bash
cd tests
npm install
npm test
```

### Environment Variables

```bash
export GXEON_API_URL="https://gxeon-ai.xmentex2.replit.app/api/v1"
export SYSTEM_API_KEY="gx_live_xxxxxxxx"
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### Test Coverage

- ✅ HTTP 200 Status
- ✅ JSON Content-Type
- ✅ Required Data Fields
- ✅ M2M Headers
- ✅ SLA Response Time (< 100ms)
- ✅ Billing Deduction (0.05 credits)
- ✅ Human Detection (403 for browsers)
- ✅ Invalid API Key (401)

### Output

Results saved to: `../logs/final_verification.log`
