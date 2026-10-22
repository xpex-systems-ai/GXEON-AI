# GXEON Commercial Integration Contract — Issue #458

Status: **PROPOSAL / SAFE PREVIEW**. This document is an integration contract, not a live customer, payment or OMNIX deployment.

## Existing verified interfaces

- `GET /api/monetization/status`: PREVIEW_ONLY, payment providers NOT_CONNECTED.
- `GET /api/monetization/offers`: static offer templates, no checkout.
- `POST /api/github-demand/pipeline-previews/:id/conversion-pack`: in-memory conversion pack.
- `POST /api/github-demand/conversion-packs/:id/create-opportunity-preview`: requires operatorConfirmed.
- `/ops/ledger`: sample/preview financial ledger, including RECEIVED_SAMPLE (never a receipt).

These interfaces are documented in `docs/monetization/GXEON_MONETIZATION_P0.md`, `docs/monetization/GXEON_FINANCIAL_LEDGER_P5.md` and `docs/github-demand/GXEON_GITHUB_DEMAND_CONVERSION_PACK_P0.md`. Runtime deployment and CI are not independently verified by this document.

## Proposed canonical objects

| Object | Minimum fields | Source-of-truth rule |
| --- | --- | --- |
| Opportunity | id, source, external_id, buyer_id, evidence_url, observed_at, status | An external demand is not a signed contract |
| Buyer | id, organization, contact_channel, verification_status, verified_at | Identity must be verified before commercial engagement |
| Qualification | id, opportunity_id, requirements, eligibility, reviewer, reviewed_at | Never infer mandatory credentials |
| Proposal | id, opportunity_id, currency, amount_minor, scope, terms, approval_status | Quote is not an invoice or earned revenue |
| Agreement | id, proposal_id, signed_document_ref, counterparty, accepted_at | Only signed/verified acceptance may advance |
| AuditRun | id, agreement_id, target, authorized_scope, executed_at, outcome | Scope and access must be authorized |
| Evidence | id, audit_run_id, immutable_digest, origin, captured_at, redaction_status | Redact secrets and customer data |
| Invoice | id, agreement_id, issuer, invoice_ref, amount_minor, currency, status | Invoice does not prove receipt |
| PaymentEvent | id, invoice_id, provider, provider_event_id, amount_minor, currency, verification | Verified external evidence only |
| Reconciliation | id, payment_event_id, invoice_id, matched_amount_minor, currency, verified_at | Match invoice and settled provider event |

## Lifecycle and authorization gates

`DISCOVERED → VERIFIED → QUALIFIED → PROPOSED → ACCEPTED → DELIVERED → INVOICED → SETTLED_VERIFIED`

- `VERIFIED` requires a traceable buyer and demand.
- `PROPOSED` requires explicit operator approval for any external communication.
- `ACCEPTED` requires independently verified counterparty acceptance.
- `DELIVERED` requires an authorized audit run and redacted evidence.
- `INVOICED` requires approved legal/payment details.
- `SETTLED_VERIFIED` requires provider/bank evidence, idempotent provider event IDs, and matching amount/currency. No email, PR, claim, wallet balance or forecast substitutes for settlement.

## Safety boundaries

1. Read-only provider adapters first; no credentials in GitHub.
2. All integrations must enforce least privilege, idempotency, audit trails and failure isolation.
3. Do not merge third-party code or enable production deployments without review, tests and approval.
4. Keep RTC, EUR, USD, USDC and BRL separate; never aggregate nominal amounts as cash.
5. Stripe, checkout, transfers, signing, claims, automated outreach and production database writes remain disabled until separately authorized.
6. Existing preview flags `paymentProvidersConnected=false`, `captureEnabled=false`, `checkoutSessionCreationEnabled=false`, `realRevenueClaimed=false` remain unchanged.

## Open dependencies

- Identify the canonical OMNIX repository, deployment, database and owner before building a connector.
- Confirm the existing API implementation and build/test commands in the codebase.
- Establish authorized buyer/customer references before treating a commercial opportunity as qualified.
- Eticas Lot D requires real qualifications and supporting evidence; a question email is not a tender submission.

## Proposed acceptance tests

- Duplicate external events do not duplicate opportunities, invoices or receipts.
- Forged/unverified payment events never become `SETTLED_VERIFIED`.
- Missing GitHub/provider API returns a degraded state, not fabricated results.
- Mixed currencies cannot be added without an explicit verified conversion event.
- `RECEIVED_SAMPLE` remains demo-only and excluded from revenue totals.
- Manual approvals and evidence hashes are retained in an immutable audit log.

Next implementation should be a small PR on this branch with a read-only adapter and contract tests, after confirming canonical runtime paths.
