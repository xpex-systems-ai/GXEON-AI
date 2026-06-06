# GXEON Architecture

## Architecture principle

GXEON OS uses a lean stack to keep execution auditable, visual, and activation-safe. Active and planned components are separated so the demo does not imply production activation.

## Active components

| Component | Role |
|---|---|
| ChatGPT | Strategy, audit, investor narrative, operating guidance |
| Codex | Repository execution, documentation, validation, code changes |
| GitHub | Source of truth, version control, PRs, audit trail |
| Vercel | Visual demo and preview deployment layer |
| GXEON Dashboard | Visual-first operating system demo |

## Planned components

| Component | Planned role | Current state |
|---|---|---|
| Supabase | Database, auth, storage, financial persistence | Pending activation |
| Microsoft 365 / Copilot | Observation, reporting, operator productivity | Planned reporting layer |
| API Gateway | Controlled external API access | APIs disabled |
| Payment providers | Payment attempts and webhook processing | Not active |
| Blockchain | On-chain surfaces and advanced marketplace primitives | Future roadmap |

## Operational flow

```text
Opportunity capture
  ↓
Radar X qualifies signals
  ↓
Task Engine creates queues and milestones
  ↓
Agent Hub assigns human/AI execution roles
  ↓
Marketplace packages services/jobs/offers
  ↓
Financial Core tracks expected revenue and ledger states
  ↓
Analytics reports outcomes and operating intelligence
```

## Data and activation boundaries

- Current demo uses visual/mock states.
- Supabase is the intended data/auth/storage layer but is not active in the visual demo.
- Database migrations and pushes are gated by explicit approval.
- Service-role secrets must never be exposed to frontend bundles.
- External providers remain disconnected until separate activation missions.

## Repository flow

1. ChatGPT defines mission scope and safety boundaries.
2. Codex performs repository work and validation.
3. GitHub stores source, commits, pull requests, and audit history.
4. Vercel generates preview deployments from GitHub configuration.
5. Supabase activation happens later through secured environment variables and approved non-mutating/mutating steps.

## Investor interpretation

The current architecture proves the product shape and execution model. It does not prove production scale, real revenue, active integrations, or real users.
