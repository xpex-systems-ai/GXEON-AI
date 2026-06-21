# Audit OS First Proposal DRAFT Close-Loop Runbook

Mission: `MISSION_007_2_AUDIT_OS_FIRST_PROPOSAL_DRAFT_CLOSE_LOOP`.

## Root cause

The first proposal stayed pending because the original autorunner was intentionally gated by production env flags and its reuse lookup only accepted the exact MISSION_007_1 metadata/idempotency tuple. A safe DRAFT saved manually or created by a newer mission could therefore be missed, and the dashboard had no preview-run path to diagnose provider/table readiness before the protected write.

## Safe operator flow

1. Open the dashboard Proposal + Offer panel.
2. Click **Prévia do run seguro**. This is read-only and returns provider readiness, proposal table readiness, existing reusable DRAFT status, and a sanitized payload preview.
3. Temporarily set Railway/env flags only for the one-time write:
   - `GXEON_AUDIT_WRITE_MODE=enabled`
   - `GXEON_AUDIT_ALLOW_DB_WRITES=true`
   - `GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL=true` only if startup autorun is desired; endpoint-first remains preferred.
   - `GXEON_AUDIT_DEFAULT_OFFER_KEY=technical_audit`
   - `GXEON_AUDIT_DEFAULT_PROPOSAL_LANGUAGE=pt-BR`
4. Paste `GXEON_AUDIT_OPERATOR_TOKEN` only into the dashboard's temporary in-memory token field, or call the protected endpoint with the same bearer token.
5. Click **Criar primeira proposta DRAFT segura** once. Repeated clicks must reuse the same proposal.
6. Verify `GET /api/v1/audit/proposals/first-draft/status` reports `proposalExists=true`, `proposalStatus=DRAFT`, `proposalCount>=1`, and `confirmedRevenue=0`.
7. Immediately shut writes back down:
   - `GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL=false`
   - `GXEON_AUDIT_WRITE_MODE=preview_only`
   - `GXEON_AUDIT_ALLOW_DB_WRITES=false`

## Safety guarantees

The close-loop creates or reuses exactly one internal DRAFT proposal for the first Audit Case. It never creates clients, revenue events, checkout sessions, invoices, payment calls, external webhooks, email, WhatsApp, DMs, or connector writes. A DRAFT proposal is not revenue. Revenue remains R$0 until a future Revenue Ledger mission records real acceptance and payment proof.
