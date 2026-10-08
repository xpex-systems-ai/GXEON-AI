# GXEON x402 Revenue Engine — deployment gates

## Verified implementation in this PR
- Read-only Python classifier and TypeScript adapter.
- Bazaar seller API listings are classified as SELLER_API, not BUYER_DEMAND.
- USDC on Base (eip155:8453) amount conversion, capability tags and optional 30-day usage.
- No private keys, payments, signing, background execution, or production deployment.

## Integration contract
1. Backend fetches Bazaar catalog from documented discovery endpoint; preserve raw response with timestamp and source.
2. Normalize the records; use adapters only for supported response shapes.
3. Display separate views for SELLER_API, BUYER_DEMAND, BOUNTY_FUNDED, READY_TO_CLAIM.
4. BUYER_DEMAND requires an explicit buyer request with terms; BOUNTY_FUNDED requires verifiable escrow or funding evidence.
5. Register one GXEON service endpoint with reproducible functional tests, pricing, authentication, request limits and logs.
6. Configure x402 payment middleware with a public receiving address via secret/environment configuration (never hard-code signing keys).
7. Reconcile payments by chain ID, token contract, recipient, amount and transaction receipt; deduplicate transaction hashes.
8. Only PAYMENT_CONFIRMED records contribute to revenue metrics; a 402 response or paid API catalog listing is not revenue.

## Mandatory pre-production acceptance
- Unit/integration tests pass on the repository CI.
- Test with a non-production wallet and small-value controlled transaction before enabling live collection.
- Verify wallet ownership and settlement account.
- Human review of pricing, service claims, rate limits, error handling, refund and security policies.
- Do not autonomously purchase third-party APIs or move funds without explicit approval.
- Never mark revenue confirmed without independently verified payment evidence.

## Status
Implementation partial; deployment, real customer demand, settlement integration and verified revenue pending.
