# GXEON Agent Conectou Runtime P0

## Purpose

Agent Conectou is the operator-facing connector readiness page for GXEON OS. It shows which connectors are already visible and which are planned without exposing secrets in the dashboard.

## Current connector posture

- GitHub: `CONNECTED_READONLY`
- Vercel: `CONNECTED_READONLY`
- Railway: `NEXT`
- Supabase: `NEXT`
- Mercado Pago: `MONETIZATION_NEXT`
- Stripe: `MONETIZATION_NEXT`

## Lifecycle

Agent Conectou presents the connector lifecycle as:

1. discover
2. prepare
3. validate
4. connect
5. test
6. monitor
7. evidence
8. dashboard

## Safety boundary

The page has no credential fields. Payment secrets, service-role keys and webhook secrets must remain backend-only environment variables. This P0 does not enable payment capture or destructive automations.
