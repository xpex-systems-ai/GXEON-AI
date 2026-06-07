# GXEON Private QG Index

This index is the central navigation hub for operating GXEON OS as Junior Sena's private QG command center. It groups the repository by operational pipeline, safety, monetization, architecture, and validation workstreams.

## Start here

| Document | Use it for |
| --- | --- |
| [README](../README.md) | Private QG positioning, P0-P5 pipeline, stack overview, and operator checklist. |
| [Private QG status](../GXEON_PRIVATE_QG_STATUS.md) | Current private command-center posture, active modules, inactive integrations, and next monetization actions. |
| [Repository status](../GXEON_REPOSITORY_STATUS.md) | Current repository status, inactive integrations, and explicit non-claims. |
| [Security checklist](operations/GXEON_PRIVATE_SECURITY_CHECKLIST.md) | Repository privacy, secret handling, Vercel, Supabase, Railway, payment, and external API boundaries. |
| [Real monetization plan](monetization/GXEON_REAL_MONETIZATION_PLAN.md) | Immediate cash-generation offers and the 7-day action plan. |

## P0-P5 operations

| Phase | Route | Use it for |
| --- | --- | --- |
| P0 Opportunity | `/ops/opportunities` | Capture monetization ideas, leads, operational gaps, and offer candidates. |
| P1 Task Queue | `/ops/tasks` | Convert opportunities into scoped execution tasks. |
| P2 Execution | `/ops/execution` | Track build, delivery, automation, and operator progress. |
| P3 Validation | `/ops/validation` | Validate quality, evidence, acceptance criteria, and readiness. |
| P4 Release | `/ops/release` | Manage controlled delivery, handoff, rollback notes, and release decisions. |
| P5 Ledger | `/ops/ledger` | Track quoted value, invoices, payments, delivery status, and revenue accountability. |

## Architecture

| Document / path | Use it for |
| --- | --- |
| [README architecture and module map](../README.md#module-map) | Quick system map and package boundaries. |
| `artifacts/gxeon-dashboard/` | Web dashboard package. |
| `artifacts/api-server/` | API server package. |
| `lib/api-spec/`, `lib/api-zod/`, `lib/api-client-react/` | Shared API contract packages. |
| `lib/db/` | Database library and validation package. |
| `runtime/`, `events/`, `queues/`, `operators/` | Execution and orchestration boundaries. |
| `analytics/`, `telemetry/` | Measurement and operational reporting concepts. |

## Monetization

| Document | Use it for |
| --- | --- |
| [Real monetization plan](monetization/GXEON_REAL_MONETIZATION_PLAN.md) | Immediate offers, P0-P5 routing, and 7-day action plan. |
| [Revenue engine](monetization/GXEON_REVENUE_ENGINE.md) | Existing monetization thesis and revenue motion. |
| `billing/`, `payments/` | Revenue-supporting domain boundaries; inactive until controlled activation. |
| `marketplace/` | Marketplace-oriented module boundary. |

## Operations and safety

| Document / path | Use it for |
| --- | --- |
| [Private security checklist](operations/GXEON_PRIVATE_SECURITY_CHECKLIST.md) | Required private repo and secret-safety review. |
| [Operating model](operations/GXEON_OPERATING_MODEL.md) | Existing operating model reference. |
| [Railway database provisioning](RAILWAY_DATABASE_PROVISIONING.md) | Existing provisioning reference; do not run provisioning unless explicitly approved. |
| `governance/`, `infrastructure/`, `scripts/` | Operational checks, platform scripts, and infrastructure references. |

## Development

| Document / path | Use it for |
| --- | --- |
| [Pull request template](../.github/PULL_REQUEST_TEMPLATE.md) | PR review structure. |
| [Bug report template](../.github/ISSUE_TEMPLATE/bug-report.md) | Bug reports. |
| `package.json` | Workspace scripts. |
| `pnpm-workspace.yaml` | Workspace package boundaries and package manager policy. |

## Review expectations

- Treat GXEON as a private QG command center.
- Do not infer live external APIs, active customers, live revenue, or production database activation from documentation.
- Keep secrets out of commits, logs, docs, issues, screenshots, and pull requests.
- Confirm build/typecheck results before relying on dashboard changes.
- Preserve `/ops/opportunities`, `/ops/tasks`, `/ops/execution`, `/ops/validation`, `/ops/release`, and `/ops/ledger`.
