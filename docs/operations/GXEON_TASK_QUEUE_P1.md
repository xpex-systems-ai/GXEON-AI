# GXEON Revenue Engine P1 · Task Queue

## Status

**Revenue Engine P1 is a manual-first task execution validation layer.** It is designed to show how qualified Opportunity Inbox records can become execution tasks before GXEON activates persistence, backend services, automation, payments, scraping, Supabase, Railway, or external platform APIs.

## Why Task Queue comes after Opportunity Inbox

Revenue Engine P0 introduced the **Opportunity Inbox**: a static/manual-first surface for capturing, classifying, scoring, and reviewing sample opportunities. P1 adds the next operational layer in the sequence:

> Opportunity → Task → Execution → Revenue → Analytics

The Task Queue does not claim real work or revenue. It validates whether an operator can see the handoff from a qualified sample opportunity into a concrete execution task with owner, status, due label, next action, and progress.

## How opportunities become tasks

In P1, the conversion is visual and manual:

1. The operator reviews a sample/manual-first opportunity in `/ops/opportunities`.
2. The Opportunity Inbox shows a **Create Task · sample/manual-first** affordance.
3. The affordance links to `/ops/tasks` and does not mutate state.
4. Static Task Queue records reference P0 opportunity IDs where feasible, for example `OPP-P0-003` becoming a proposal task.
5. The operator validates whether the task card contains enough execution context to proceed manually.

No database write, webhook, platform message, CRM update, payment action, queue dispatch, or automation is performed.

## Task statuses

The P1 board uses these statuses:

- `BACKLOG` — task is visible but not yet triaged for immediate execution.
- `TRIAGE` — operator is clarifying scope, evidence, priority, or owner.
- `IN_PROGRESS` — manual work is currently being prepared or executed in safe preview mode.
- `WAITING_CLIENT` — task is blocked by manual input or consented information from a human.
- `REVIEW` — task output, copy, safety boundary, or proposal language needs review.
- `DONE` — task is closed as a UI/sample state only; it is not proof of real revenue.
- `ARCHIVED` — task is intentionally inactive and excluded from open execution value.

## Manual-first execution boundaries

P1 intentionally preserves these boundaries:

- Static/manual-first seed data only.
- No real customer data.
- No scraped records.
- No external API calls.
- No Supabase or Railway connection.
- No database mutation or migration.
- No payment activation.
- No drag-and-drop persistence.
- No claim that sample `DONE` or `WON` states represent real revenue.

## What is not active yet

The following remain intentionally inactive:

- Real task creation and persistence.
- Authentication-gated task ownership.
- External marketplace ingestion.
- LinkedIn, Workana, 99Freelas, Upwork, Freelancer, Fiverr, GitHub Projects, Microsoft 365, CRM, payment, or messaging integrations.
- Automated task routing, reminders, notifications, or execution agents.
- Revenue recognition, invoicing, billing, or settlement.

## Next step: Execution Tracking P2

P2 should only be considered after P1 validates that operators understand the opportunity-to-task handoff. A safe P2 would add manual execution tracking concepts such as deliverables, acceptance criteria, review checkpoints, and time/value evidence before any real persistence or automation is activated.
