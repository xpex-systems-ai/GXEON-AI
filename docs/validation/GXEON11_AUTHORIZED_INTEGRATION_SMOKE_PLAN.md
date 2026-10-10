# GXEON 11 — Authorized Integration Smoke Test Plan

Date: 2026-10-10. Status: PREPARED_NOT_EXECUTED.
Scope: isolated, read-only and synthetic operational QA after Typecheck/Build on exact reviewed commit.

## Evidence and environment prerequisites

1. Reviewer signs a **specific authorization** for the target staging environment, account, dates and scope. Do not rely on broad permission to modify production.
2. Capture exact app source commit, CI run, deployment ID, environment label, backend API origin *classification* (not token/value), dashboard origin, certificate/TLS status, and service owner.
3. Confirm staging/synthetic tenancy, SSO/RBAC and test identity with least privilege. Never collect real Gmail, customer mail, contact details, bank keys, PIX, wallet credentials, tokens or financial account data.
4. Use synthetic fixtures only. Ensure test data is identifiable as artificial and has zero actual orders, receipts and provider settlements.
5. Run from a browser/test client controlled by an authorized operator with network access and suitable signed-in identity. Where production SSO blocks unauthenticated access, do not bypass protection.

## Read-only acceptance matrix

| ID | Scope | Safe operation | Expected evidence |
|----|-------|----------------|------------------|
| INT-01 | Source-to-deploy | Compare deployed SHA to reviewed PR chain and provider metadata | Commit/deploy IDs match, timestamp captured |
| INT-02 | Frontend | Load staging Dashboard under authorized SSO | HTTP/UI loads; no secrets, no login HTML mistaken for API JSON |
| INT-03 | Frontend-to-API | GET /api/audit-os/status and /api/audit-os/catalog in authorized staging scope | JSON, explicit HTTP status, correct API origin, CORS allowed only for intended frontend origin |
| INT-04 | API health | GET an existing safe health endpoint in verified staging | Service reachable and response clearly distinct from success of business endpoints |
| INT-05 | Ledger | View empty and synthetic Ledger, Monetization Board | Forecast, operator-confirmed and provider-verified values labeled separately; provider-verified revenue stays R$0 |
| INT-06 | Operator previews | Open GitHub Demand and R100 manual workflow UIs, no mutation or external operations | Preview-only/manual review controls displayed; loading/error/empty states correct |
| INT-07 | Auth negative | Read-only request as unauthenticated or low-privilege synthetic user, only where permitted | Access is denied according to documented identity/tenant policy; no cross-tenant data |
| INT-08 | Failure UX | Simulated backend-down / invalid JSON via local fixture (NOT production proxy tampering) | Sanitized error; never raw secret or synthetic token; no unexpected automatic retry/write |
| INT-09 | Security | Review CORS allowlist, rate limiting, logs, test authorization and key exposure in synthetic environment | No wildcard trust or credential leakage; findings redacted |
| INT-10 | Evidence | Capture sanitized test run result (timestamp, SHA, status, screenshot/video, reviewer) | PASS/FAIL/BLOCKED with raw-free evidence link and independent sign-off |

## Explicit prohibitions

- No POST/PATCH/DELETE with state-changing behavior; no schema-apply/probe/export, provider claim/deliver, email send, checkout, invoices or payment capture as part of this plan.
- No wallet signing/swap/movement, no real inbox scraping, no real customer communications, no production deploy and no SSO bypass.
- No claim that provider `READY`, empty error groups, static tests or Typecheck/Build PASS independently establish security or live business availability.

## Stop conditions

Stop if permission absent, wrong environment/commit, unexpected customer data, untrusted SSO redirect, CORS overreach, credential leak, action performing a write, real revenue represented as received without settlement proof, or critical 4xx/5xx behavior. Mark BLOCKED and request human review.

## Sign-off sheet (blank pending authorization)

- Environment and owner:
- Authorizing operator and independent reviewer:
- Approval date/scope:
- Source SHA, CI run, deployment IDs:
- Synthetic tenant/fixture:
- INT-01 ... INT-10: NOT_EXECUTED
- Recorded redacted evidence:
- Open defects:
- Security/finance reviewers:
- Release recommendation: NOT_APPROVED
