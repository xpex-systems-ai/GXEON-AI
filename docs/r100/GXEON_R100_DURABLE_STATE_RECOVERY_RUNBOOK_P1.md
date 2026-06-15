# GXEON R$100 Durable State Recovery Runbook P1

## Manual recovery checklist

1. Open `/ops/r100-state`.
2. Confirm the banner says Manual-first and Preview-only.
3. Inspect `/api/r100-state/status` for `persistenceMode`, `healthy`, `fallbackUsed`, `lastLoadedAt`, and `lastSavedAt`.
4. Inspect `/api/r100-state/verification` for durability level, collection counts, restored collections, warnings, and next manual action.
5. Use the redacted snapshot view only for operator audit. Do not paste secrets into manual notes.
6. Run a safe probe only if needed. It creates `durabilityProbes` records, not prospects, offers, payments, revenue, ledger records, or handoffs.
7. Manually reload only with `RELOAD_R100_STATE_MANUALLY`; never automate reload on page load.

## How to interpret modes

- `SAFE_MEMORY_FALLBACK`: safe but restart recovery is unavailable.
- `SERVER_LOCAL_JSON`: server-local file mode; verify deployment storage/volume before relying on it.
- `UNHEALTHY_FALLBACK`: keep operating manually and do not rely on recovery until investigated.

## Stop and move to P2 database when

- Multiple API instances are needed.
- Railway or deployment filesystem durability is uncertain.
- Audit retention, backup/restore, or access controls are required.
- The business depends on durable recovery beyond local JSON.

Provider verified revenue remains R$0. Real revenue is operator-confirmed only. No payment provider API, checkout, invoice, auto-send, external contact, GitHub write, or scraping is part of this runbook.
