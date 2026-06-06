# GXEON Revenue Engine P0 — Opportunity Inbox

## Purpose

Revenue Engine P0 creates the first operational revenue-validation layer for GXEON OS: a manual-first Opportunity Inbox. The feature exists to capture and prioritize possible revenue opportunities before GXEON activates external APIs, marketplace integrations, automation, payments, or database persistence.

The P0 flow is intentionally conservative:

1. An opportunity signal is entered manually.
2. The operator classifies source, client type, category, value, complexity, urgency, and evidence.
3. GXEON displays a fit score and priority from static/manual-first data.
4. Qualified records become candidates for a future Task Queue P0.
5. Outcomes can later be measured as execution evidence and revenue only after real validation is explicitly enabled.

## Why manual-first

Manual-first mode reduces false positives and prevents premature claims of revenue. The current dashboard uses static sample records only, which allows the team to validate the operating workflow while preserving the existing Visual Demo mode, APIs Disabled mode, and Safe Preview mode.

This P0 layer does **not** scrape platforms, call external services, mutate a database, create payments, or connect live credentials. It is a dashboard and documentation layer for operator validation.

## Opportunity sources

The static sample data models the following source channels without connecting to them:

- Workana
- 99Freelas
- Upwork
- Freelancer
- LinkedIn
- Community
- Referral
- Manual

These labels are used for classification only. They are not evidence that any platform integration is active.

## Static opportunity model

Each opportunity is represented with:

- ID and title
- Source and optional URL shape
- Client type and category
- Estimated value in BRL
- Complexity, urgency, fit score, and priority
- Pipeline status
- Next manual action
- Optional evidence note
- Created and updated timestamps
- `sample_manual_first` data mode

All bundled records are realistic but non-identifying sample opportunities. They contain no real personal data and no scraped content.

## Scoring model

The P0 scoring model is documented in the static dashboard data as:

| Signal | Weight |
| --- | ---: |
| Value | 30% |
| Fit | 30% |
| Urgency | 20% |
| Simplicity | 20% |

The output is a `fit_score` from 0 to 100 and a priority label: `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`. In this P0 implementation, scores are static sample values so operators can validate the visual workflow before a future scoring engine exists.

## Pipeline statuses

The Opportunity Inbox renders the following status model:

1. `NEW`
2. `REVIEWING`
3. `QUALIFIED`
4. `PROPOSAL_READY`
5. `CONTACTED`
6. `WON`
7. `LOST`
8. `ARCHIVED`

Active pipeline value is calculated only from `NEW`, `REVIEWING`, `QUALIFIED`, `PROPOSAL_READY`, and `CONTACTED`. A `WON` sample can exist to validate the UI state, but the dashboard explicitly states that no real revenue is claimed.

## What is not active yet

The following remain inactive in Revenue Engine P0:

- No Workana, 99Freelas, Upwork, Freelancer, LinkedIn, GitHub Projects, Supabase, Mercado Pago, Microsoft 365, or payment connections
- No external API calls
- No web scraping
- No database writes or migrations
- No service-role keys, database URLs, payment credentials, or secrets
- No automated outreach
- No claims of generated revenue

## Dashboard route

The preferred operational route is:

```text
/ops/opportunities
```

The sidebar includes a `Revenue Engine P0` module entry, and the Financial Core module exposes an `Opportunity Inbox` widget link to the same route.

## Next step: Task Queue P0

After operators validate how opportunities are captured, classified, and prioritized, the next safe layer is Task Queue P0. That layer should convert qualified opportunities into manual execution tasks with scoped checklists, owner assignment, evidence requirements, and outcome tracking. It should keep the same conservative boundary until explicit activation is approved.
