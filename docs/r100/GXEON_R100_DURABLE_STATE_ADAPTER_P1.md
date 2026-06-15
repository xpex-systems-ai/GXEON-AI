# GXEON R$100 Durable State Adapter P1

This P1 adds a manual-first durable state abstraction for the official R$100 flow. It keeps every action preview-only and operator-approved: no auto-send, no checkout, no invoice, no webhook, no payment provider API, no external contact, no scraping, and no GitHub write.

## Modes

- `SAFE_MEMORY_FALLBACK` is the default mode. State is held in process memory through the adapter contract and failures are non-fatal.
- `SERVER_LOCAL_JSON` is enabled only with `GXEON_R100_STATE_MODE=file`. The server writes collection JSON files under `GXEON_R100_STATE_DIR` or `.gxeon-r100-state` from the API server working directory.
- Supabase/external database support is intentionally disabled until explicit future approval. No secrets or connection strings are exposed to the frontend.

## Collections

The adapter handles `manualProspects`, `clientOfferSendPacks`, `manualPaymentRequests`, `revenueCloseLoops`, `operatorConfirmedRevenue`, `ledgerPreviews`, and `operatorWorkflowHandoffs`.

## Routes

- `GET /api/r100-state/status` returns safe adapter mode, health, fallback, load/save timestamps, and restored collection names.
- `GET /api/r100-state/snapshot` returns a redacted operator audit snapshot. Payment links, Pix labels, direct contact fields, and notes/private notes are replaced with safe redaction markers.
- `POST /api/r100-state/reload` reloads collections into memory only when the operator posts `{ "confirmManualReload": true }`. It is idempotent and makes no external calls.

## Truth Spine

`GET /api/r100-truth/summary` now includes persistence metadata: status, mode, health, fallback flag, restored collections, last load, and last save. Persistence failures must not crash truth routes; they surface as safe fallback metadata.

## Rollback

Remove the `r100DurableState` router mount, revert store hydration/persist calls, and remove frontend persistence labels if needed. Provider-verified revenue remains `0` throughout rollback.

## Known limits

The file adapter is server-local and not a distributed database. It is meant for safe P1 durability on one API runtime, not multi-writer coordination.
