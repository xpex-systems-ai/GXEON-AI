# GXEON R$100 Durable State Verification P1

This verification layer explains and exposes the current R$100 durable adapter without changing business semantics. It is **Manual-first**, **Preview-only**, and **Operator-approved only**.

## Current modes

- `SAFE_MEMORY_FALLBACK`: default adapter mode. It is safe and non-fatal, but does not survive process restart.
- `SERVER_LOCAL_JSON`: opt-in with `GXEON_R100_STATE_MODE=file`. It writes JSON on the local server filesystem, which is better than memory but is not a production database.
- Future database persistence: not included in this mission. No migration, Supabase/Postgres connection, secret handling, worker queue, or background scheduler is added.

## Safe endpoints

- `GET /api/r100-state/status`: adapter status, mode, health, restored collections and safety metadata.
- `GET /api/r100-state/verification`: operator-safe durability level, trust level, collection counts, warnings, and next manual action.
- `GET /api/r100-state/snapshot`: redacted audit snapshot only.
- `POST /api/r100-state/probe`: requires `{ "confirm": "CREATE_SAFE_R100_DURABILITY_PROBE" }` and creates only a synthetic probe record.
- `POST /api/r100-state/reload`: requires `{ "confirm": "RELOAD_R100_STATE_MANUALLY" }` and reloads state into memory only after explicit operator action.

## What does not happen

No payment provider API. No checkout. No invoice. No auto-send. No external contact. No GitHub write. No scraping. Provider verified revenue remains R$0. Real revenue is operator-confirmed only.
