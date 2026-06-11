# GXEON Ledger P0 Runtime Preview

Ledger P0 is a safe, preview-only and manual-first financial runtime layer. It converts Release Gate P0 preview-like records into internal ledger preview records for forecasting and readiness review only.

## Runtime role

Pipeline:

1. Release Gate P0 Preview
2. Ledger P0 Preview
3. Financial Forecast
4. Manual Payment Readiness
5. Future Monetization

Ledger P0 tracks expected, approved-manual, pending-preview and lost-preview values. It always keeps received revenue at `0` and never claims real revenue.

## Safety boundary

Every preview record includes:

- `mode: "PREVIEW_ONLY"`
- `paymentDisabled: true`
- `invoiceDisabled: true`
- `receiptDisabled: true`
- `realRevenueClaimed: false`
- `databaseWriteDisabled: true`
- `approvalRequired: true`
- `externalContact: false`
- `githubWrites: false`
- `paymentAction: false`
- `autonomousExecution: false`

Ledger P0 uses an in-memory store only. It does not create invoices, receipts, checkout sessions, provider payment intents, accounting database rows, workers or schedulers.

## API contracts

All responses include `{ success: boolean, data: object }`.

- `GET /api/ledger/status` returns `LEDGER_P0_READY`, summary totals, allowed statuses and safety flags.
- `GET /api/ledger/previews` returns summary data and `ledgerPreviews`.
- `GET /api/ledger/previews/:id` returns one `ledgerPreview`.
- `POST /api/ledger/previews` accepts Release Gate preview-like input or direct ledger preview input and returns a new in-memory `ledgerPreview`.
- `PATCH /api/ledger/previews/:id/state` accepts safe preview statuses only: `FORECAST`, `APPROVED_MANUAL`, `PENDING_PAYMENT_REVIEW`, `LOST`, `CANCELLED`, `ARCHIVED`.

Forbidden real payment states such as `RECEIVED_REAL` and `PAID_REAL` are rejected.

## Frontend behavior

`/ops/ledger` reads backend previews when available and falls back to the existing empty manual state if the API is unavailable. The Release Gate page exposes a clearly-labeled `Create Ledger Preview` action that posts release preview data to Ledger P0 only.

## Future work

Future Monetization P0 may consume Ledger P0 previews, but it must remain preview/manual-first until explicit production activation exists. Real payment acceptance, invoicing, receipts, accounting persistence and external provider calls remain out of scope for Ledger P0.
