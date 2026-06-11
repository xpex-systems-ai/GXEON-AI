# GXEON Ledger Safety Boundary

Ledger P0 is not an accounting system and not a payment system. It is a runtime preview layer for internal operational forecasting.

## Explicitly disabled

- No real money is received.
- No invoice is created.
- No receipt is created.
- No checkout session is created.
- No payment provider is called.
- No payment is captured.
- No payment is marked received.
- No production database is mutated.
- No accounting record is persisted to a real database.
- No external user is contacted.
- No GitHub write is performed from runtime app code.
- No worker or scheduler is introduced.
- No revenue is claimed as real.

## Required record flags

Each Ledger P0 preview record must preserve:

```json
{
  "mode": "PREVIEW_ONLY",
  "paymentDisabled": true,
  "invoiceDisabled": true,
  "receiptDisabled": true,
  "realRevenueClaimed": false,
  "databaseWriteDisabled": true,
  "approvalRequired": true,
  "externalContact": false,
  "githubWrites": false,
  "paymentAction": false,
  "autonomousExecution": false
}
```

## Allowed state changes

Only preview/manual statuses are allowed: `FORECAST`, `APPROVED_MANUAL`, `PENDING_PAYMENT_REVIEW`, `LOST`, `CANCELLED` and `ARCHIVED`.

`RECEIVED_REAL`, `PAID_REAL`, payment captured states and real receipt states are rejected in Ledger P0.

## Rollback

Rollback is safe because Ledger P0 state is in-memory only. Reverting the code removes the API routes and UI wiring; no database migration or accounting cleanup is required.
