# GXEON Handoff UX Stabilization P2.1

## Purpose
Stabilize the manual-first P2 operator workflow handoff bus so each destination route has a single active handoff context and at most one visible handoff banner.

## What changed
- Added singleton-style active handoff helpers and route-specific active handoff lookup.
- Added idempotent handoff creation for repeated clicks.
- Added shared frontend hooks for handoff and workflow summary loading.
- Updated destination routes to render one controlled `OperatorHandoffBanner`.

## Single active handoff policy
The in-memory store returns the latest non-archived open handoff as the active handoff. Creating a new handoff supersedes previous open handoffs for the same target route unless the request matches an existing source route, target route, and action type; in that case the existing handoff is reused.

## Route banner policy
Prospects, client offers, manual payment, revenue close loop, and ledger render a single full banner when a `handoffId` exists. If a route has an active open handoff but no URL id, the page can show compact context instead of duplicating the full banner.

## Idempotency rule
`POST /api/operator-workflow/handoffs/from-next-action` reuses an equivalent open handoff unless `forceNew=true` is passed. Reused handoffs include `duplicatePrevented=true`.

## Manual test flow
1. Open `/ops/operator-assistant`.
2. Click `Criar/Continuar handoff + abrir rota`.
3. Confirm repeated clicks reuse one open handoff.
4. Confirm `/ops/prospects?handoffId=...` shows one banner.
5. Confirm prefill is visible as human-readable fields first.
6. Mark route opened and preview created.
7. Return to War Room and Brain to confirm active handoff context.
8. Archive the handoff and confirm active indicators disappear.

## Known limitations
- In-memory only.
- No persistence across API restart.
- No automatic external send.
- No payment API.
- No GitHub write.
- No revenue recognition without operator confirmation.
- No autonomous agent execution.

## Next phase
P3 can add assisted internal preview generation from the active handoff while preserving manual approval and avoiding external actions.
