# GXEON AgentOS ↔ XPeX Systems Command — Read Contract V1

**Status: P1 local fixture adapter implemented and tested. Live Systems Command connection: NOT IMPLEMENTED.**

## Source of truth and mapping

XPeX Systems Command's canonical `prisma/schema.prisma` defines:
- `System.systemCode`, `System.canonicalSlug`, `System.ownershipClass` (`PROPRIETARY`/`FORK`/`EXTERNAL`/`UNKNOWN`), and `System.maturity`.
- `Evidence.verificationStatus` (`UNVERIFIED`/`DISCOVERED`/`CORROBORATED`/`VERIFIED`/`REJECTED`).

P1's `ReadOnlyCommandSystem` mirrors a **narrow subset** of these fields using in-repository fake records `SYN-...`. This is a bounded shape test, not a live, authenticated catalog connection.

## Implemented demonstrator

- `readSystemsCommandFixture(FIXTURE_GRANT)` is the one allowed in-process READ_ONLY tool. It returns fixed, frozen records and does not touch providers or databases.
- `runReadOnlyAgentFixture()` invokes that tool **twice**: auditor and independent verifier. A deterministic rule-based analyzer produces findings for unknown owners, no verified evidence, and asserted production with no verified evidence.
- The engineer role produces **draft remediation suggestions only**; no code, PR, cloud or customer changes.
- `createGenesisMission → recordGenesisAudit → draftGenesisCorrection → verifyGenesisDraft` records the mission with a SHA-256 event chain. Completion stops at `AWAITING_HUMAN_APPROVAL`. Roles are distinct synthetic identities, not real authenticated users.
- The second tool invocation recomputes findings, checks digest and plan equivalence. This is **functional separation only**, not security isolation.
- `GET /api/agentos/genesis/read-only-worker-demo` is a fixed-fixture, input-free, GET-only report route in **draft source**, not deployed.
- Offline tests: `node --experimental-strip-types --test scripts/tests/agentos-readonly-worker-contracts.test.mjs`
- Demo: `node --experimental-strip-types scripts/agentos-readonly-worker-demo.mjs`

## Safety guarantees in the proposed source

The P1 runtime accepts only the singleton test fixture grant. It rejects counterfeit grant objects and synthetic catalogs with real-looking IDs. It has zero network or filesystem mutation, no model API calls, no external side effects, no payments, no wallet transactions, no production deployment and no real-world system access. No credentials or personal data are stored.

A hardcoded test grant is **not real authorization**. SHA-256 checksums of local records are **not authenticated, durable or anchored evidence**. `modelCalls: 0` is not an operational LLM-cost measurement. No inference loop or provider agent runtime has been implemented. The interface is only a platform-integration prototype.

## Integration contract for future live read access (NOT APPROVED)

1. Independently approve the stacked source PR chain (including GXEON #443) and the Systems Command source, risk classification and ownership.
2. Establish a **server-to-server** Systems Command read endpoint scoped by verified identity and tenant; no shared secret in browser or public query string.
3. Define a versioned, signed or mutually authenticated request with allowlisted fields, pagination, strict runtime payload validation, per-tenant rate limits and bounded timeouts.
4. Map evidence to a single canonical tenant/system and source; require `VerificationStatus` + provenance, rather than inferring truth from display text.
5. Persist mission and tool records transactionally with idempotency and independently anchored provenance. Protect logs from secrets and cross-tenant data.
6. Add an actual model/provider driver only with explicit approval, quotas, sandbox, privacy review and cost telemetry. Model choice must not bypass tool policy.
7. Execute authorized staging smoke, negative tenancy, prompt injection and failure tests. Get independent human G0–G7 signoff before live customers or promotion.

**The existing public broker remains PREVIEW_ONLY. Do not silently repurpose it as an executor.**

Evidence First — The executor does not approve its own delivery.
