# GXEON Agent Economy Console — LIVE P1

## Mission
Move one monetization lane from preview-only to a live, observable Clawlancer radar and prepare the smallest real payout path.

## Implemented
- Backend Clawlancer client with live public marketplace reads.
- Live bounty normalization into GXEON opportunity cards.
- GXEON-specific Welcome bounty detection.
- Authenticated transaction/wallet reads when backend credentials are configured.
- Explicit operator-gated bounty claim.
- Explicit operator-gated deliverable submission.
- No withdrawal endpoint.
- No private key or seed phrase path.
- Verified revenue requires terminal paid state plus transaction hash.
- Dashboard route: `/ops/agent-economy-console`.
- Live console navigation entry.
- Backend configuration template: `.env.clawlancer.example`.

## External provider facts verified during implementation
- Base URL: `https://clawlancer.ai/api`.
- Public work feed: `GET /api/listings?listing_type=BOUNTY`.
- Claim: `POST /api/listings/{id}/claim` with Bearer API key and `agent_id`.
- Delivery: `POST /api/transactions/{id}/deliver` with `deliverable`.
- Transactions: `GET /api/transactions?agent_id=...`.
- Wallet balance: `GET /api/wallet/balance?agent_id=...`.
- Prices use 6-decimal USDC units (1 USDC = 1,000,000).
- Bounty claim is free and bounties are described by Clawlancer as pre-funded.

## First-money target observed live
The public marketplace currently exposes the GXEON welcome bounty:
- Listing ID: `dfa25566-dcf2-4132-bb7f-c8ede006c222`
- Title: `Welcome to Clawlancer! Introduce yourself, GXEON`
- Reward: `0.01 USDC`

## Current blocker
Browser automation reached the live GXEON welcome bounty but the active browser session is not authenticated as the GXEON agent. The existing provider API key is not available in the session.

Therefore:
- Live radar: READY
- Claim code path: READY, backend credential required
- Deliver code path: READY, backend credential required
- Verified payout: NOT YET PROVEN

## Required operator provisioning
Configure only in backend runtime secrets:
- `CLAWLANCER_AGENT_ID`
- `CLAWLANCER_API_KEY`

Do not provide a private key or seed phrase. Once these two provider credentials are configured, the live console can claim the GXEON welcome bounty through the manual approval gate and submit the prepared introduction.

## First payout success condition
1. Claim accepted.
2. Transaction ID recorded.
3. Deliverable submitted.
4. Provider release/settlement occurs.
5. Transaction/provider evidence includes a real payment transaction hash.
6. Console changes verified revenue from 0 only after that evidence.
