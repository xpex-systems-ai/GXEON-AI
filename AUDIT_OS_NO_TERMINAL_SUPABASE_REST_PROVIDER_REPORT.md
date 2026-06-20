# MISSION_004_12 Audit OS Supabase REST provider report

Status: READY_FOR_NO_TERMINAL_BOOTSTRAP

## Implemented

- Added Audit OS provider mode contract: `auto`, `postgres`, and `supabase_rest`.
- Kept Postgres/Drizzle as primary provider and added Supabase REST fallback using native `fetch`.
- Added sanitized provider diagnostics with safe error classes for Postgres auth, host lookup, Supabase REST auth, missing config, and missing audit tables.
- Added Supabase REST schema probes for `audit_assets`, `audit_cases`, and `audit_operator_notes`.
- Added protected Supabase REST first-case bootstrap with idempotency by GXEON-AI repository asset URL.
- Added Supabase REST case listing fallback for Mission Control.
- Added the dashboard **Bootstrap sem terminal** operator panel with diagnostic, create, and verify actions.

## Safety

No secrets are returned by diagnostics. Supabase REST headers are created only inside backend requests and are not logged. The bootstrap token remains route-protected and the frontend stores it only in memory.
