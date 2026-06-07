# GXEON OS

**The execution operating system for turning opportunities into accountable revenue workflows.**

GXEON OS is a public-facing product and engineering repository for a visual enterprise demo of an opportunity-to-revenue operating layer. The current repository is structured to help investors, partners, companies, and technical reviewers understand the product vision, architecture, module boundaries, and execution roadmap without implying live production integrations that are not yet activated.

> **Demo:** `https://YOUR-VERCEL-DEMO-LINK.vercel.app`  
> Replace this placeholder with the official Vercel deployment when approved.

## What GXEON OS is building

GXEON OS is designed as a unified command center where teams can identify opportunities, convert them into tasks, route execution, track revenue impact, and review analytics from one operational surface.

The repository currently emphasizes:

- A premium visual dashboard experience.
- Monorepo structure for apps, API packages, runtime modules, database libraries, and operational scripts.
- Documentation that separates vision, architecture, roadmap, revenue model, and operating model.
- Honest status reporting: visual demo first, production activation later.

## Safety and status note

This repository currently represents a **visual demo and enterprise repository presentation layer**. External APIs are not claimed as live, Supabase production activation is pending, and integrations should remain disabled until explicitly validated through the production-readiness process. No secrets should be committed to the repository.

## Core flow

```text
Opportunity → Task → Execution → Revenue → Analytics
```

| Stage | Meaning | Current repository role |
| --- | --- | --- |
| Opportunity | Capture market, customer, workflow, or operational potential. | Represented in product language, dashboard concepts, and roadmap docs. |
| Task | Convert an opportunity into concrete execution units. | Supported by runtime and workflow module boundaries. |
| Execution | Route work through operators, queues, runtime dispatchers, and apps. | Represented by runtime, operators, queues, and dashboard packages. |
| Revenue | Connect completed execution to monetization pathways. | Documented as a thesis and roadmap, not represented as live revenue claims. |
| Analytics | Measure signals, outcomes, telemetry, and performance. | Represented by analytics and telemetry module structure. |

## Architecture overview

```text
┌────────────────────────────────────────────────────────────┐
│                        GXEON OS                            │
├────────────────────────────────────────────────────────────┤
│ Dashboard / Mobile / Mockup Sandbox                         │
│ API Server / API Spec / API Zod / React Client               │
│ Runtime Engine / Dispatchers / Workers / Operators           │
│ Events / Queues / Telemetry / Analytics                      │
│ Database Library / Supabase Readiness / Governance Scripts   │
│ Documentation / Evidence / Operations / Roadmap              │
└────────────────────────────────────────────────────────────┘
```

The architecture is organized as a monorepo with clear boundaries between presentation, API contracts, runtime execution concepts, data readiness, and operational governance. The current objective is public clarity and reviewability without changing runtime behavior.

## Module map

| Area | Path | Purpose |
| --- | --- | --- |
| Web dashboard | `artifacts/gxeon-dashboard` | Vite/React dashboard visual experience. |
| Mobile dashboard | `artifacts/gxeon-dashboard-mobile` | Mobile-oriented dashboard package. |
| API server | `artifacts/api-server` | Express-based API server package. |
| Mockup sandbox | `artifacts/mockup-sandbox` | Visual sandbox for product presentation. |
| API contracts | `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | Shared API definitions and generated/typed client boundaries. |
| Database library | `lib/db` | Database schema and validation package. |
| Runtime | `runtime` | Execution engine, dispatcher, worker, compensation, persistence, and telemetry boundaries. |
| Operators | `operators` | Operator and live-operator concepts. |
| Events and queues | `events`, `queues` | Event and queue domain boundaries. |
| Analytics and telemetry | `analytics`, `telemetry` | Measurement, realtime analytics, and reporting concepts. |
| Billing and payments | `billing`, `payments` | Revenue-supporting domain boundaries. |
| Governance and infrastructure | `governance`, `infrastructure`, `scripts` | Operational checks, deployment support, and governance scripts. |
| Documentation hub | `docs` | Investor, architecture, evidence, roadmap, operations, monetization, and brand docs. |

## Current status

| Category | Status | Notes |
| --- | --- | --- |
| Repository presentation | Active / consolidated | README, navigation hub, status document, and GitHub templates are the canonical public review entry points. |
| Repository presentation | Active | README, navigation hub, status document, and GitHub templates are being upgraded for public review. |
| Dashboard | Visual demo | Dashboard package exists and build/typecheck commands are available. |
| API server | Code package present | Activation status should be validated before production claims. |
| External APIs | Not live by default | No live partner/API activation is claimed in this repository presentation. |
| Supabase | Pending production activation | Supabase readiness exists as a workstream; production database activation is not claimed. |
| Revenue | Thesis/roadmap | No revenue, customer, or user claims are made here. |
| Investor readiness | In progress | Docs are structured for review, evidence collection, and partner conversations. |

## Lean stack

The active public stack should be read as a lean demo/review stack: dashboard, API package, shared contracts, database readiness libraries, and governance checks. Items below describe repository components, not live production activation.
## Stack

| Layer | Technology / package |
| --- | --- |
| Monorepo | pnpm workspace |
| Web app | React, Vite, TypeScript |
| UI and motion | Radix UI, Tailwind CSS, Framer Motion, lucide-react, Recharts |
| API | Express, TypeScript, Pino |
| Data tooling | Drizzle ORM, Supabase client package, workspace database library |
| Contracts | Zod, shared API spec/client packages |
| Quality | TypeScript typecheck, Vite build, repository governance scripts |
| Deployment targets | Vercel/GitHub Pages/Railway-oriented scripts and workflows where configured; deployment approval is separate from repository presentation |
| Deployment targets | Vercel/GitHub Pages/Railway-oriented scripts and workflows where configured |

## Documentation map

Start here: **[GXEON Repository Index](docs/GXEON_INDEX.md)**

Key documents:

- [Repository status](GXEON_REPOSITORY_STATUS.md)
- [Brand guide](docs/brand/GXEON_BRAND_GUIDE.md)
- [Master roadmap](docs/roadmap/GXEON_MASTER_ROADMAP.md)
- [Operating model](docs/operations/GXEON_OPERATING_MODEL.md)
- [Revenue engine](docs/monetization/GXEON_REVENUE_ENGINE.md)
- [Investor review notes](docs/investor/README.md)
- [Architecture notes](docs/architecture/README.md)
- [Evidence notes](docs/evidence/README.md)
- [Railway database provisioning notes](docs/RAILWAY_DATABASE_PROVISIONING.md)

## Roadmap

| Phase | Focus | Outcome |
| --- | --- | --- |
| Phase 0 | Enterprise repository presentation | Premium public structure, README, templates, docs, and status clarity. |
| Phase 1 | Demo hardening | Validate dashboard build, screenshot evidence, and navigation quality. |
| Phase 2 | Integration readiness | Prepare API and Supabase activation checklists without enabling secrets or production writes. |
| Phase 3 | Pilot operations | Define partner pilot workflows, reporting, support loops, and acceptance criteria. |
| Phase 4 | Production activation | Activate approved services only after security, database, and governance checks pass. |

## Monetization thesis

GXEON OS is positioned around accountable execution infrastructure: a system that helps organizations move from opportunity discovery to measured revenue outcomes. Potential monetization paths include enterprise subscriptions, managed execution workspaces, workflow automation packages, analytics/reporting tiers, and partner implementation services.

These are strategic monetization directions, not claims of current revenue, active customers, or live integrations.

## Investor and partner CTA

If you are reviewing GXEON OS as an investor, partner, or technical evaluator:

1. Start with the [repository index](docs/GXEON_INDEX.md).
2. Review the [repository status](GXEON_REPOSITORY_STATUS.md) for current activation boundaries.
3. Review the [master roadmap](docs/roadmap/GXEON_MASTER_ROADMAP.md) and [revenue engine](docs/monetization/GXEON_REVENUE_ENGINE.md).
4. Request a demo walkthrough, architecture review, or pilot-readiness session before assuming production integration status.

## Repository principles

- Show the product clearly.
- Keep status statements honest.
- Do not expose secrets.
- Do not activate integrations without explicit readiness checks.
- Do not mutate databases during documentation or presentation work.
- Preserve existing dashboard behavior while improving repository presentation.
