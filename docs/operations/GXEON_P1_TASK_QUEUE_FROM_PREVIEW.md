# GXEON P1 Task Queue From Opportunity Preview

## Why this phase exists

The readiness audit confirmed that P0 Opportunity Inbox is the first real end-to-end slice: Radar X preview signals can be imported, qualified, and converted into draft-only planning outputs. P1 is the next safe increment because it converts an existing **Task Preview** into an accountable internal task record without enabling autonomous execution.

## Implemented P1 path

1. Radar X produces a preview-only candidate.
2. Opportunity Inbox stores the opportunity in memory.
3. The operator qualifies the opportunity.
4. The operator generates Task Preview.
5. The operator explicitly clicks **Create Internal Task**.
6. `/api/tasks/from-opportunity/:opportunityId` creates an in-memory P1 task.
7. `/ops/tasks` lists task records, counters, approval gates, evidence requirements, rollback requirements, and safety boundaries.

## Task statuses

- `TASK_READY` — task has planning material ready for review.
- `APPROVAL_REQUIRED` — default status for created P1 tasks; operator decision required.
- `APPROVED_FOR_MANUAL_EXECUTION` — operator approved manual execution planning only; no execution occurs.
- `BLOCKED` — task is paused pending missing scope, access, proof, or safety review.
- `IN_REVIEW` — reserved for future manual review flow.
- `DONE` — reserved for future manually validated completion.
- `CANCELLED` — task was intentionally closed without execution.

## Safe transitions

P1 exposes only three task mutation routes:

- approve manual execution;
- block;
- cancel.

Approval changes internal status only. It does not run code, deploy, create issues, send messages, or trigger payment.

## Boundary contract

P1 remains manual-first and internal-only:

- no autonomous agents;
- no automatic task execution;
- no external contact;
- no GitHub writes;
- no email or Microsoft 365 sends;
- no checkout sessions, payment captures, Stripe, or Mercado Pago calls;
- no fake clients, revenue, or evidence.

## Next phase: P2 Execution Center

P2 should not be implemented until P1 task records are stable. The next phase should add an execution tracking domain that references P1 task IDs while keeping human approval gates and evidence requirements intact.
