# GXEON Execution Tracker P2

## Status

**Revenue Engine P2 · Execution Tracker** is a manual-first, visual-first validation layer. It connects the existing Opportunity Inbox P0 and Task Queue P1 sample records to execution progress, proof-of-work states, deliverables, blockers and next operator actions.

The tracker is intentionally static in this phase. It does **not** activate external APIs, scraping, Supabase, Railway, Microsoft 365, GitHub, Vercel, storage, database persistence, payment validation or backend mutation.

## Why P2 follows Task Queue P1

The Revenue Engine flow is:

1. **Opportunity Inbox P0** captures and classifies sample/manual-first opportunities.
2. **Task Queue P1** turns qualified sample opportunities into execution-ready tasks.
3. **Execution Tracker P2** shows how tasks become work-in-progress, deliverables, blockers and proof-of-work.
4. Future phases can validate delivery, revenue and analytics only after the manual flow is clear.

P2 exists so the operator can inspect execution evidence before any live operational systems are connected.

## How tasks become execution records

Each execution record is a static/manual-first object with:

- `task_id` linking back to a P1 task.
- Optional `opportunity_id` linking back to a P0 opportunity.
- Execution type, owner, priority, status and progress.
- Estimated BRL value labeled as sample-only validation data.
- A blocker, next action, proof type, proof status and deliverable.

These records are not persisted anywhere outside the source file. They are sample records for UI validation only.

## Execution statuses

The P2 status model is:

- `NOT_STARTED` — execution is visible but no meaningful work has begun.
- `IN_PROGRESS` — manual work is underway.
- `BLOCKED` — progress needs manual evidence, operator input or a scope decision.
- `REVIEW` — execution or proof is ready for manual review.
- `DELIVERED` — sample deliverable is marked delivered for UI validation only.
- `VERIFIED` — sample proof has been verified as a sample state only.
- `ARCHIVED` — execution is inactive and excluded from active execution value.

The board renders static grouped columns and does not support drag-and-drop or persistence in this phase.

## Proof-of-work and evidence states

Proof statuses are:

- `MISSING` — no sample evidence attached.
- `DRAFT` — draft evidence label exists.
- `ATTACHED_SAMPLE` — sample/manual-first evidence exists.
- `READY_FOR_REVIEW` — proof is ready for manual review.
- `VERIFIED_SAMPLE` — proof is verified only as sample UI state.

Proof types such as GitHub PR, Vercel Preview, Screenshot, Proposal Draft, Client Note, Manual Evidence and Report are labels only. P2 does not upload files, create links, call GitHub or Vercel, connect Microsoft 365, connect storage or write to a database.

## Manual-first execution boundaries

P2 preserves these boundaries:

- No real customer work is claimed.
- No real users or real revenue are claimed.
- No scraping is performed.
- No external service is connected.
- No migrations are run.
- No database is modified.
- No secrets, service-role keys, tokens, private keys or credentials are introduced.
- All execution data is static sample/manual-first data.

## What is not active yet

The following capabilities are intentionally not active:

- Supabase persistence.
- Railway deployment orchestration.
- GitHub PR or issue synchronization.
- Vercel preview synchronization.
- Microsoft 365 document, email or calendar workflows.
- Payment validation or Mercado Pago flows.
- External marketplace scraping or platform messaging.
- Drag-and-drop status mutation.
- File upload or storage-backed proof attachments.

## Current route

The dashboard route is:

```text
/ops/execution
```

The existing routes remain available:

```text
/ops/opportunities
/ops/tasks
```

## Next step

The recommended next architectural decision is either:

- **Supabase readiness** if the team wants to design safe persistence for opportunities, tasks and execution records; or
- **Delivery Validation P3** if the team wants to extend the manual-first flow into sample delivery acceptance before persistence.

Either next step should remain honest about inactive integrations until credentials, data governance, consent and backend boundaries are explicitly designed.
