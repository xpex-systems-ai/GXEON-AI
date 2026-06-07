# GXEON Repository Index

This index is the central navigation hub for reviewers who need to understand GXEON OS quickly and honestly. It groups the repository by audience, evidence type, and execution workstream while separating active demo components from future activation work.
This index is the central navigation hub for reviewers who need to understand GXEON OS quickly and honestly. It groups the repository by audience, evidence type, and execution workstream.

## Start here

| Document | Use it for |
| --- | --- |
| [README](../README.md) | High-level product story, architecture overview, stack, roadmap, and investor CTA. |
| [Repository status](../GXEON_REPOSITORY_STATUS.md) | Current state, active stack, demo status, pending integrations, and next phase. |
| [Docs README](README.md) | Short docs landing page that points back to this canonical index. |
| [Docs README](README.md) | Existing docs landing page. |

## Investor and partner review

| Document | Use it for |
| --- | --- |
| [README](../README.md) | Fast narrative review of GXEON OS. |
| [Repository status](../GXEON_REPOSITORY_STATUS.md) | Honest activation and readiness boundaries. |
| [Revenue engine](monetization/GXEON_REVENUE_ENGINE.md) | Monetization thesis, packages, and non-claim boundaries. |
| [Investor notes](investor/README.md) | Investor/partner review boundaries and current non-claims. |
| `docs/investor/` | Reserved for future investor memos, demo notes, and partner materials. |

## Architecture

| Document / path | Use it for |
| --- | --- |
| [README architecture overview](../README.md#architecture-overview) | Quick system map. |
| `artifacts/gxeon-dashboard/` | Web dashboard package. |
| `artifacts/api-server/` | API server package. |
| `lib/api-spec/`, `lib/api-zod/`, `lib/api-client-react/` | Shared API contract packages. |
| `lib/db/` | Database library and validation package. |
| `runtime/`, `events/`, `queues/`, `operators/` | Execution and orchestration boundaries. |
| [Architecture notes](architecture/README.md) | Active-vs-future component boundaries for technical reviewers. |
| `docs/architecture/` | Reserved for deeper diagrams and technical design notes. |

## Evidence and demo proof

| Document / path | Use it for |
| --- | --- |
| `.github/ISSUE_TEMPLATE/visual-evidence.md` | Submit screenshot/video evidence, including Awesome Screenshot links. |
| `.github/ISSUE_TEMPLATE/execution-report.md` | Submit Codex/Copilot or execution-agent reports. |
| [Evidence notes](evidence/README.md) | Evidence collection rules and current demo-proof status. |
| `docs/evidence/` | Reserved for curated screenshots, review notes, and demo validation artifacts. |

## Roadmap

| Document | Use it for |
| --- | --- |
| [Master roadmap](roadmap/GXEON_MASTER_ROADMAP.md) | Phase plan from repository presentation to production activation. |
| [Repository status](../GXEON_REPOSITORY_STATUS.md#next-execution-phase) | Immediate next execution phase. |
| [Roadmap directory](roadmap/GXEON_MASTER_ROADMAP.md) | Roadmap workstream home. |
| `docs/roadmap/` | Roadmap workstream home. |

## Monetization

| Document | Use it for |
| --- | --- |
| [Revenue engine](monetization/GXEON_REVENUE_ENGINE.md) | Monetization thesis and revenue motion. |
| `billing/`, `payments/` | Revenue-supporting domain boundaries. |
| `marketplace/` | Marketplace-oriented module boundary. |

## Operations

| Document / path | Use it for |
| --- | --- |
| [Operating model](operations/GXEON_OPERATING_MODEL.md) | How GXEON OS should be reviewed, operated, and advanced safely. |
| [Railway database provisioning](RAILWAY_DATABASE_PROVISIONING.md) | Existing database provisioning reference; do not run provisioning unless explicitly approved. |
| `governance/`, `infrastructure/`, `scripts/` | Operational checks, platform scripts, and infrastructure references. |

## Development

| Document / path | Use it for |
| --- | --- |
| [Pull request template](../.github/PULL_REQUEST_TEMPLATE.md) | Required PR review structure. |
| [Bug report template](../.github/ISSUE_TEMPLATE/bug-report.md) | Professional bug reports. |
| `package.json` | Workspace scripts. |
| `pnpm-workspace.yaml` | Workspace package boundaries and package manager policy. |

## Review expectations

- Treat the current repository as a visual and structural demo unless a production activation document says otherwise.
- Do not infer live external APIs, active customers, or revenue from presentation materials.
- Confirm build/typecheck results before demo or investor review.
- Record visual evidence through issue templates so reviewers can audit what was shown.

## Canonical status boundary

If older repository reports or artifact notes use stronger activation language, treat them as historical execution artifacts unless they are explicitly linked from this index as current status. The canonical public status is: visual demo, external APIs disabled unless explicitly configured and approved, Supabase production activation pending, and revenue not yet active.
