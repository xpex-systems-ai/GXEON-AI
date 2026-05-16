# GXEON Foundation Audit (Repository-State)

## Executive Summary
GXEON contains substantial production-intent functionality (billing, trading signals, orchestration, dashboarding), but the runtime foundation is fragmented across multiple entrypoints, mixed module systems, and ephemeral orchestration patterns. The biggest systemic risks are **silent failure masking**, **duplicate/replayed execution**, and **billing integrity drift** under retries/crashes.

## Architecture Overview
- **API Layer**: Express servers (`server/index.js`, `server/index-marketplace.js`) with different hardening postures.
- **Execution Layer**: Task engine + swarm orchestration in-process (`core/task_engine.js`, `core/swarm_orchestrator.js`).
- **Billing Layer**: Supabase RPC atomic deduction (`deduct_credits_atomic`) + refund compensation + telemetry routes.
- **Persistence**: Supabase as central store; critical transient state still kept in memory (buffers, session maps, singleton engine instances).
- **Crypto/Radar**: Multiple services for MEV/radar/flash logic tightly coupled to broader server runtime.

## Critical Blockers
1. **Process survival over correctness** pattern in `server/index.js` can hide unrecoverable faults.
2. **No durable workflow orchestration** for multi-step agent chains.
3. **Two-phase billing transitions** without strict global idempotency constraints.
4. **Operational sprawl** (many scripts/entrypoints) prevents deterministic production behavior.

## Dangerous Patterns
- Global module monkey-patching (`ws`) in primary server path.
- Mixed CJS/ESM runtime boundaries across related services.
- Manual compensation requirements (refund paths) for billing consistency.
- Duplicate triggers possible via loops, API start endpoints, and watchdog retries.

## Migration Priorities (No rewrite yet)
1. Establish canonical runtime topology and declare deprecated entrypoints.
2. Enforce execution idempotency keys persisted pre-side-effect.
3. Add deterministic reconciliation workers for stuck billing states.
4. Externalize ephemeral orchestration state to durable execution tables/events.
5. Isolate high-risk crypto/radar executors from API surface.

## Immediate Stabilization Priorities
- Add guardrails: unique request_id constraints and replay checks in billing pipeline.
- Add health assertions for logical invariants (not only process liveness).
- Centralize retry policy with bounded attempts + dead-letter semantics.
- Freeze legacy modules behind explicit feature flags and ownership map.
