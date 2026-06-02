# SUPABASE_REALTIME_MAP.md

**Mission:** 04 — Supabase Readiness Protocol  
**Generated at:** 2026-06-02  
**Method:** static repository audit only. No Supabase connection, no credentials, no migrations, no data changes.

## 1. Executive realtime verdict

**Status:** YELLOW — GXEON already has a local WebSocket realtime gateway, and Supabase Realtime is enabled in project metadata, but the direct Supabase realtime subscription currently targets a missing table name.

## 2. Current realtime architecture

| Realtime component | Current implementation | Role |
|---|---|---|
| Local WebSocket gateway | `gateway/realtime/wsGateway.cjs` reads `.gxeon_runtime/events.jsonl` and broadcasts `runtime.events`. | Runtime/operator event stream independent of Supabase. |
| Runtime events | `runtime/telemetry/events.cjs` emits local events through persistence store. | Source for local websocket stream. |
| Supabase project config | `[realtime] enabled = true`. | Supabase capability is expected when connected. |
| Web topbar Supabase channel | `dashboard-topbar` subscribes to `postgres_changes` on table `transactions`. | Intended revenue live update, but table is not in schema. |

## 3. Event and channel map

### 3.1 Local channels

| Channel | Source | Payload | Filters |
|---|---|---|---|
| `runtime.events` | Local JSONL event store via gateway. | `{ channel: 'runtime.events', event }`. | `workflow_id`, `type`, `operator` query/message filters. |

### 3.2 Supabase channels planned/observed

| Channel | Table | Status | Required correction |
|---|---|---|---|
| `dashboard-topbar` | `transactions` | Not ready: table missing. | Use `global_transactions` or compatibility view. |
| Proposed: `financial-transactions` | `global_transactions` | Not implemented. | Enable only if RLS + publication is safe. |
| Proposed: `revenue-events` | `revenue_events` | Table missing. | Add table + policy before subscribing. |
| Proposed: `dataset-purchases` | `dataset_purchases` | Table missing. | Add table + entitlement policy before subscribing. |

## 4. Subscription dependencies

| Dependency | Required before real Supabase Realtime |
|---|---|
| Tables exist | `global_transactions` exists; `transactions`, `revenue_events`, `dataset_purchases` do not. |
| RLS enabled | Required for any client-side realtime subscription. |
| Publication scope | Limit to low-risk tables and event types. Avoid publishing full financial ledger rows to public clients. |
| Payload minimization | Use views or projected tables for dashboards instead of raw sensitive financial tables. |
| Auth session | Client subscriptions should run as authenticated users with RLS, not broad anon access. |

## 5. Recommended Supabase Realtime strategy

1. Keep local `runtime.events` WebSocket as the canonical runtime/operator telemetry stream.
2. Use Supabase Realtime only for UI-facing database changes after RLS is complete.
3. Replace the current `transactions` subscription with `global_transactions` or a safe `dashboard_transactions` view/table.
4. Do not publish `financial_ledger` to client Realtime by default.
5. Prefer aggregate/revenue event tables for dashboards where possible.
6. Add a realtime test plan that verifies anon users cannot subscribe to protected rows.

## 6. Realtime risks

| Risk | Severity | Mitigation |
|---|---:|---|
| Realtime subscription points to missing `transactions` table. | High | Rename to `global_transactions` or create compatibility view/table. |
| Financial data broadcast before RLS. | Critical | Block real connection until RLS + publication scope are reviewed. |
| Duplicate realtime sources confuse operators. | Medium | Document local WS vs Supabase Realtime ownership. |
| Over-broad `postgres_changes` `event: '*'`. | Medium | Scope events and payloads to what the UI needs. |

## 7. Realtime readiness score

**Realtime score:** 58 / 100

- +20 local WebSocket gateway already functional by design
- +10 runtime event emission exists
- +10 Supabase Realtime enabled in project config
- +8 dashboard has intended realtime UX
- +10 healthcheck/deploy docs cover gateway
- -15 subscription table mismatch
- -15 no RLS/publication policy for Supabase Realtime
- -10 missing event table coverage

**Decision:** YELLOW — local realtime is ready; Supabase Realtime should wait for schema/RLS correction.
