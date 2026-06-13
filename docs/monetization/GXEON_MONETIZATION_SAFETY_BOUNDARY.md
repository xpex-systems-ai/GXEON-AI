# GXEON Monetization P0 Safety Boundary

Monetization P0 is intentionally non-transactional.

## Disabled in P0

- Checkout session creation.
- Payment capture or payment intent creation.
- Invoice or receipt creation.
- Customer contact or email sending.
- Real revenue claims or paid markers.
- Payment provider API calls.
- Credential collection forms.
- Production database mutation, workers, and schedulers.
- Runtime GitHub writes, issues, comments, PRs, or commits.

## Required response flags

Every Monetization P0 response includes:

```json
{
  "mode": "PREVIEW_ONLY",
  "paymentProvidersConnected": false,
  "captureEnabled": false,
  "checkoutSessionCreationEnabled": false,
  "invoiceDisabled": true,
  "realRevenueClaimed": false,
  "approvalRequired": true
}
```

## Rollback plan

Revert the monetization route mount, remove the `src/monetization` runtime files, and keep the dashboard fallback state. Since P0 is in-memory/preview-only, rollback requires no data migration.
