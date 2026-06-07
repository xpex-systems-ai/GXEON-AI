# GXEON OS

**Junior Sena's private operational command center for converting opportunities into shipped, validated, monetizable execution.**

GXEON OS is now positioned as a **private QG (quartel-general) command center repository**. It exists to help Junior Sena operate opportunities, tasks, execution, validation, release readiness, and financial ledger discipline from one controlled workspace. This repository is not a public launch surface, investor deck, or open demo promise.

## Privacy-first statement

GXEON is private by default. Repository content should describe operational intent, module boundaries, readiness state, and monetization work without exposing secrets, customer-sensitive information, private credentials, or unapproved production claims.

- Keep the GitHub repository visibility set to **Private**.
- Store secrets only in approved provider dashboards or local ignored files.
- Do not commit `.env` files, service-role keys, database URLs, API keys, payment secrets, private keys, screenshots with secrets, or customer-sensitive data.
- Do not activate Supabase, Railway, payment providers, external APIs, or database migrations from documentation-only work.
- Treat every integration as inactive until explicitly validated and approved.

## Mission

GXEON's monetization mission is to turn Junior Sena's operational opportunities into cash-generating delivery offers through a disciplined P0-P5 pipeline. The system should support fast opportunity capture, clear tasking, execution tracking, delivery validation, release discipline, and ledger-based revenue visibility.

## Private QG operating pipeline P0-P5

```text
P0 Opportunity → P1 Task Queue → P2 Execution → P3 Validation → P4 Release → P5 Ledger
```

| Phase | Route | Purpose | Private QG rule |
| --- | --- | --- | --- |
| P0 Opportunity | `/ops/opportunities` | Capture monetization ideas, client leads, workflow gaps, and operational opportunities. | Record only safe, non-secret context unless stored in an approved private system. |
| P1 Task Queue | `/ops/tasks` | Convert opportunities into prioritized, accountable execution tasks. | Keep scope, owner, acceptance criteria, and risk boundaries explicit. |
| P2 Execution | `/ops/execution` | Track build, delivery, automation, and operator work. | Do not activate external systems without a controlled integration plan. |
| P3 Validation | `/ops/validation` | Validate deliverables, evidence, quality, and readiness. | Separate evidence from secrets; redact sensitive screenshots before committing. |
| P4 Release | `/ops/release` | Prepare controlled release steps and handoff decisions. | Release only after validation, rollback thinking, and environment separation are confirmed. |
| P5 Ledger | `/ops/ledger` | Track money movement, offer performance, and revenue accountability. | No live revenue claim should be made unless backed by verified ledger evidence. |

## Current status

| Category | Status | Notes |
| --- | --- | --- |
| Repository positioning | Private QG lockdown active | Documentation is being oriented around private command-center operations. |
| Dashboard | Buildable workspace package | Dashboard code remains present; P0-P5 routes must remain stable. |
| API server | Code package present | Do not claim production activation without validation. |
| Supabase | Inactive / readiness only | Do not connect, migrate, push schemas, or expose service-role keys. |
| Railway | Inactive / readiness only | Do not provision or deploy from this lockdown work. |
| External APIs | Inactive by default | No external API activation is part of this mission. |
| Payments and billing | Inactive / planning | Payment secrets and provider credentials must stay out of the repo. |
| Monetization | Active planning | Focus is immediate cash-generation offers routed through P0-P5. |

## Stack overview

| Layer | Tools / packages |
| --- | --- |
| Monorepo | pnpm workspace, TypeScript |
| Dashboard | Vite, React, Tailwind-oriented UI package structure |
| API package | Express, TypeScript, Pino |
| Contracts | API spec, Zod contracts, React client package |
| Data readiness | Drizzle ORM, Supabase client package, database validation package |
| Operations | Runtime, events, queues, operators, telemetry, analytics, governance scripts |
| Validation | TypeScript checks, Vite builds, repository scripts, GitHub workflows |

## Module map

| Area | Path | Purpose |
| --- | --- | --- |
| Web dashboard | `artifacts/gxeon-dashboard` | Private command-center dashboard experience. |
| Mobile dashboard | `artifacts/gxeon-dashboard-mobile` | Mobile-oriented dashboard package. |
| API server | `artifacts/api-server` | Express-based API server package. |
| Mockup sandbox | `artifacts/mockup-sandbox` | Visual sandbox for controlled internal UI iteration. |
| API contracts | `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | Shared API definitions and typed client boundaries. |
| Database library | `lib/db` | Database schema and validation package; do not push migrations during lockdown. |
| Runtime | `runtime` | Execution engine, dispatcher, worker, compensation, persistence, and telemetry boundaries. |
| Operators | `operators` | Operator and live-operator concepts. |
| Events and queues | `events`, `queues` | Event and queue domain boundaries. |
| Analytics and telemetry | `analytics`, `telemetry` | Measurement and performance concepts. |
| Billing and payments | `billing`, `payments` | Revenue-supporting boundaries; no provider activation by default. |
| Governance and infrastructure | `governance`, `infrastructure`, `scripts` | Operational checks, platform scripts, and infrastructure references. |
| Documentation hub | `docs` | Private QG operations, security, roadmap, and monetization documentation. |

## Next phase: real monetization and controlled integrations

The next phase is not public launch activity. It is private execution toward real monetization with safety gates:

1. Convert viable offers into P0 opportunities.
2. Break the best opportunities into P1 tasks with owners, acceptance criteria, and revenue targets.
3. Execute P2 delivery work for one immediate cash-generating offer at a time.
4. Validate P3 evidence before any client handoff or release claim.
5. Use P4 release discipline for controlled delivery, rollback notes, and environment separation.
6. Track money, invoices, payment state, and lessons in P5 ledger workflows.
7. Prepare integrations only after secrets, environments, provider dashboards, and rollback rules are documented.

## Safety boundaries

- Do not activate APIs during repository-positioning work.
- Do not connect Supabase or Railway during repository-positioning work.
- Do not run database migrations from this mission.
- Do not expose secrets in commits, logs, screenshots, issues, or documentation.
- Do not remove or break core GXEON operational modules.
- Preserve `/ops/opportunities`, `/ops/tasks`, `/ops/execution`, `/ops/validation`, `/ops/release`, and `/ops/ledger`.
- Keep build configuration intact.

## Operator checklist

Before using GXEON for real monetization work:

1. Confirm GitHub visibility is **Private** in repository settings.
2. Review the private security checklist in `docs/operations/GXEON_PRIVATE_SECURITY_CHECKLIST.md`.
3. Review the private QG status in `GXEON_PRIVATE_QG_STATUS.md`.
4. Route new revenue work through the monetization plan in `docs/monetization/GXEON_REAL_MONETIZATION_PLAN.md`.
5. Validate dashboard typecheck/build before relying on UI changes.
