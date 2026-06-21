# GXEON Audit OS — First Proposal DRAFT Runbook

Mission: `MISSION_007_1_AUDIT_OS_FIRST_PROPOSAL_DRAFT_AUTORUNNER`.

## Purpose
Create or reuse exactly one internal first proposal in `DRAFT` status for the first existing Audit Case. This is not revenue, not acceptance, and not a payment event.

## Required flags for one-shot autorun

```bash
GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL=true
GXEON_AUDIT_WRITE_MODE=enabled
GXEON_AUDIT_ALLOW_DB_WRITES=true
```

Optional:

```bash
GXEON_AUDIT_DEFAULT_OFFER_KEY=technical_audit
GXEON_AUDIT_DEFAULT_PROPOSAL_LANGUAGE=pt-BR
```

## Manual endpoint flow

1. Confirm `GET /api/v1/audit/proposals/first-draft/status` is sanitized and read-only.
2. Temporarily provide `GXEON_AUDIT_OPERATOR_TOKEN` to the dashboard in memory only.
3. Click **Criar primeira proposta DRAFT segura** or call `POST /api/v1/audit/proposals/first-draft/run` with the bearer token.
4. Review the returned `proposalId`, `caseId`, `offerKey`, `status`, `priceTarget`, and `currency`.

## Safety contract

- No client is created automatically.
- No email, WhatsApp, DM, webhook, invoice, checkout, Stripe, Mercado Pago, or payment provider call happens.
- No `audit_revenue_events` row is created.
- Proposal `DRAFT` is not confirmed revenue.
- Revenue remains `R$0` until real acceptance and real payment proof are recorded by a future mission.

## Shutdown after success

After a DRAFT exists, set:

```bash
GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL=false
GXEON_AUDIT_WRITE_MODE=preview_only
GXEON_AUDIT_ALLOW_DB_WRITES=false
```

Rotate/remove temporary operator or mission runner tokens if used.

## Next mission
`MISSION_008_REVENUE_LEDGER_AND_PAYMENT_PROOF`.
