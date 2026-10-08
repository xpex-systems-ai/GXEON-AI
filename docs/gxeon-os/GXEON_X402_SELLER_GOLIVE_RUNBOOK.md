# GXEON Revenue Engine — Seller x402 go-live gates

**As of 2026-10-08:** implementation in [PR #432](https://github.com/xpex-systems-ai/GXEON-AI/pull/432). **No x402 charges, payments, Base USDC transfers, settlement receipts, verified buyers, or production deployment claimed.** Do not merge without an independent review.

## Available without making payments

| HTTP path | Access | Verified behavior |
| --- | --- | --- |
| `GET /api/gxeon/evidence/manifest` | Public | Names capability; explicit payment disabled |
| `GET /api/gxeon/evidence/openapi` | Public | OpenAPI 3.1 discoverability without customer secrets |
| `POST /api/gxeon/evidence/preview` | Public demo | Bounded deterministic SHA-256 of canonicalized JSON |
| `POST /api/gxeon/evidence/verify` | **DISABLED** | Always returns HTTP 402 `PAYMENT_INTEGRATION_NOT_CONFIGURED`; not a valid x402 payment challenge |
| `GET /api/radar/x402/status` | Read-only | Reports whether CDP Bazaar bearer discovery token is configured, not whether provider credentials work |
| `GET /api/radar/x402/catalog-preview` | Read-only | Optional 20-record GET to official CDP Bazaar when an **authorized time-valid bearer token** is configured |
| `POST /api/radar/x402/classify-preview` | Read-only classification | Accepts a trusted-operator-supplied catalog JSON for up to 25 records; does not independently verify their authenticity |
| `/ops/x402-revenue-engine` | Dashboard | Read-only classification, free preview, explicit zero confirmed payments |

CDP documented GET list: <https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/list-x402-resources>. Provider requires a bearer JWT created from the operator's CDP API credentials; a static environment token may expire. NEVER log its value, expose it to a browser, or generate wallet signatures inside the dashboard. Historical `quality.l30DaysUniquePayers` and `quality.l30DaysTotalCalls` are *provider-reported seller-side usage*, not GXEON customers, buyer requests or settled GXEON USDC.

## Planned commercial product

- **Product:** GXEON Evidence Verify v1, SHA-256 hash of deterministic recursive JSON serialization.
- **Price proposal:** `0.01 USDC` or `10000` atomic native USDC units.
- **Blockchain:** Base mainnet, CAIP-2 `eip155:8453`.
- **Token:** native USDC `0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913`.
- **Recipient:** **UNVERIFIED / NOT CONFIGURED**. The public GXEON Coinbase Wallet address is known in other systems but its signatory and permission to receive product revenue must be independently approved by the owner. A public address alone does not prove ownership.
- **Canonicalization:** `recursive-utf16-key-order-v1`. **Not RFC 8785/JCS.** Hashes do not prove that source claims are true, human-reviewed or legally valid.

## Production activation checklist

1. Keep `paidExecutionEnabled=false` until the complete production middleware and receipt reconciliation are audited. There is intentionally **no** temporary fake-200 paid route.
2. Pin compatible official versions from `@x402/core`, `@x402/express`, `@x402/evm`, adding them to **`artifacts/api-server/package.json`** using `pnpm --filter @workspace/api-server add` with updated `pnpm-lock.yaml` after supply-chain review. Verify package release age and do not disable the existing workspace minimum-release-age policy. Refer to <https://www.npmjs.com/package/@x402/express>.
3. Configure `x402ResourceServer`, `ExactEvmScheme` and a **Base mainnet-capable** `HTTPFacilitatorClient`; **the public x402.org facilitator may be testnet only**. Validate `/supported` for `eip155:8453` + `exact`, and proper verify/settle auth if using Coinbase CDP.
4. Authorize the seller's **public** EVM `payTo` address through a wallet-owner-controlled signed challenge. Do not ever collect/export a seed phrase/private key. No financial signing is needed from GXEON to *receive* funds.
5. Mount the official middleware **before** the `/api/gxeon/evidence/verify` Express handler, and **only for that exact POST route**. Require accepted scheme/network/token/recipient/amount. Do not accept arbitrary `PAYMENT-SIGNATURE` headers or manually issue a valid-looking 402 response without a verifier. Do not protect `/preview`, `/manifest` or `/openapi`.
6. Add a durable idempotent transaction-receipt ledger with unique network + transaction ID, payer authorization, service request digest, recipient/amount matching, and provider settlement status. No `PAYMENT_CONFIRMED` without successful facilitator `settle` AND independent chain receipt/transfer verification as required.
7. Add a production gateway-distributed **rate limit**, request size limit before JSON parsing, security review of CORS, anti-replay for repeated signed payments, clear failure semantics, metrics without storing customer raw payloads, and accounting for fees/refunds.
8. Staging: deploy to an **identified and isolated** service with a verified base URL. Test gratis manifest/preview and a **non-production testnet** x402 request first. The currently connected Railway account did **not** expose a GXEON-AI service during this audit; do not alter unrelated Railway services.
9. Mainnet: perform one tiny controlled transaction only after the operator approves the exact token, network, fee/gas estimate, recipient, amount and source wallet. Record the actual tx hash (redacted evidence), receipt and ledger entry. Then publish Bazaar discovery via the official x402 extensions and verify catalog listing.
10. Independently review PR, CI, product wording and legal/business policy before merging or exposing a real paywall. **THE EXECUTOR DOES NOT APPROVE ITS OWN DELIVERY.**

## Existing CI reality

- Focused `GXEON Revenue Engine Focused Verification` runs Python regressions, scoped TypeScript typecheck, and an HTTP smoke runner. These jobs have succeeded in PR #432.
- Full monorepo build/typecheck currently fails with TypeScript errors in **existing** unrelated `durableState`, `auditV1`, `ledgerStore`, `operatorWorkflow` and other modules. Never claim that whole-repo CI passes. Avoid weakening `tsconfig` merely to silence these failures.
- Dashboard is wired in `artifacts/gxeon-dashboard/src/App.tsx` with a link from the existing Monetization Board; **not proof of deployment**.

## Truth table

| Observed signal | Revenue? |
| --- | --- |
| Seller catalog listing / `quality` calls | No |
| User pressed a checkout or preview button | No |
| HTTP 402 challenge | No |
| Agent submitted a payment signature | No |
| Verifier accepted signature without settlement | No |
| Provider settled + Base USDC receipt reconciled | **Yes, after evidence and independent reconciliation** |

**Last audited status: 0 confirmed new USDC earnings; no payment operation executed here.**
