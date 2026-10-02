# GXEON Clawlancer Hub — Import Audit

## Executive status

The Lovable-built monitor is visually strong and aligned with GXEON's truth-first policy, but it is still a DEMO/read-only monitor rather than a production Clawlancer connector.

## What is already good

- Clear DEMO labeling across the UI.
- Verified revenue starts at 0.00 USDC.
- Pending revenue is explicitly not confirmed.
- Payment verification requires release + transaction hash/on-chain evidence.
- Public wallet and provider references are treated as public identifiers only.
- No private key/seed phrase belongs in the frontend.
- Data access already has a clean `GET /monitor/snapshot` abstraction.

## Gaps found before production integration

1. The Lovable shell links to `/tasks`, `/evidence`, and `/earnings`, but the imported route set currently contains only `/` and `/radar`.
2. The project is TanStack Start/Vite 8 while the official dashboard is a Vite/Wouter app; copying it directly into `artifacts/gxeon-dashboard` would create framework and lockfile risk.
3. There is no real backend adapter yet for Clawlancer.
4. Current IDs, wallet, rewards and evidence are mock/demo data.
5. No release/payout is verified until a real transaction hash is observed.

## Safe migration strategy

Phase A — preserve source (this PR):
- Keep the Lovable source under `imports/lovable/gxeon-clawlancer-hub`.
- Do not change pnpm workspace, lockfile, Railway or Vercel.

Phase B — production port:
- Port domain types/status logic into `artifacts/gxeon-dashboard/src/modules/clawlancer`.
- Build a backend-only Clawlancer adapter in `artifacts/api-server`.
- Expose a read-only snapshot endpoint to the dashboard.
- Keep provider/API secrets server-side.
- Add real pages/routes inside the existing Wouter dashboard rather than introducing a second frontend framework.

Phase C — payout proof:
- Populate public agent/listing/transaction IDs from the real connector.
- Mark revenue verified only after release + on-chain transaction evidence.
