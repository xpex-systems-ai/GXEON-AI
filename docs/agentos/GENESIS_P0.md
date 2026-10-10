# GXEON AgentOS — Genesis P0

**Status: implemented source-only synthetic kernel; NOT deployed; no provider agents run.**

This is the first auditable state-transition module for the envisioned XPeX AgentOS, layered beside existing **Broker P0** and **Home Center Agent Registry**. It deliberately does not turn their PREVIEW_ONLY roles into live operators.

## One complete *synthetic* mission lifecycle

```text
fixture://repos/demo-api
  → CREATE (AUDITOR)
  → RECORD OBSERVATION (AUDITOR)
  → DRAFT CORRECTION REFERENCE (ENGINEER, different actor)
  → VERIFY EVIDENCE (VERIFIER, independent actor)
  → AWAITING_HUMAN_APPROVAL (never auto-approved)
```

This is an executable local state-machine demonstration, **not** an actual repository audit, model invocation, software patch or autonomous worker. All observations, draft and proof references are synthetic fixture identifiers; no content is produced by a real AI model.

```bash
node --experimental-strip-types --test scripts/tests/agentos-genesis-contracts.test.mjs
node --experimental-strip-types scripts/agentos-genesis-demo.mjs
```

## Read-only API integration (not deployed)

The draft routes are wired to the existing Express GXEON router:
- `GET /api/agentos/genesis/status` — explicit synthetic-only readiness and disabled-action flags.
- `GET /api/agentos/genesis/synthetic-demo` — deterministic fixed-fixture mission journal. No POST/execute/approve endpoints.

**These routes exist only in draft source until approved and deployed.** Any future accessible endpoint remains synthetic-only; no customer task or model/tool execution is created.

## Guaranteed kernel boundaries
- Only risk R0/R1 and `fixture://` references accepted.
- No network, provider access, filesystem mutation, GitHub writes, emails, invoices, payments, wallet signing, production deploys or actual customer actions.
- Budget is fixed at US$0 for these **non-modelled synthetic transitions**; this is not evidence of zero real inference cost.
- Explicit mandatory separation of Auditor, Engineer and Verifier actor identifiers.
- SHA-256 digest chain detects accidental/tampered event changes in an observed record. It is NOT cryptographic identity or immutable persisted chain-of-custody; a malicious party with full write access can recompute the chain.
- All records are immutable-style return values held in memory by the demo; restart loses them.
- `AWAITING_HUMAN_APPROVAL` is terminal in P0. There is no approval, execution, deploy or payment API.
- Actor identifiers are test fixture claims, not authenticated identities. **No authentication or RBAC is provided by this kernel.**

## Ecosystem interfaces (design mapping, not current integrations)

| Existing component | Target interface | Gate |
|---|---|---|
| Systems Command | System ID, canonical source, ownership, mission index | G1/G2 source and tenant proof |
| Broker P0 | Risk-tier and preview route | Adapter and contract tests (no execution conversion) |
| Home Center Agent Registry | Agent IDs, explicit capabilities and denied actions | G5 independent agent identity |
| Plugin Factory / MCP | Read-only approved capability catalog | Allowlist, auth, source validation |
| GitHub | Synthetic first; later scoped repo read, draft PR only | Explicit operator approval and RBAC |
| PostgreSQL | Transactional append-only mission journal | Durable adapter, tenant isolation, backups |
| Evidence Engine | Signed/anchored evidence records and verifier trace | Provenance and independent verification |
| Agent APIs / SDK | Later model and tool runtime, quotas, webhook validation | Provider credentials, sandbox and cost controls |

## Required before a production agent
1. Independent code review and orderly PR chain merger (#436 → #438 → #439 → #440 → #442 → this PR).
2. Authorized read-only frontend/API integration smoke from GXEON 11.
3. Authenticate and authorize mission owner, agents and reviewer; fail-closed tenancy.
4. Durable, append-only and tamper-resilient event storage with idempotency, concurrency control and replay.
5. Evaluate tool execution in sandbox; test prompt injection, SSRF, data exfiltration, cancellation and retries.
6. Budget/accounting telemetry, per-tenant quotas, privacy classification, threat model and independent signoff.
7. Only after G0–G7 proof can a live action-capable worker be offered commercially.

**Evidence First. The executor does not approve its own delivery.**
