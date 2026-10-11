# GXEON Demand Integration — EXISTING DEMAND ONLY

> Scope: directly integrate third-party, already-published paid work into the **existing GXEON OS**, not create new products, write to marketplace accounts, message leads or solicit customers.

## Architecture

```
Public GitHub Bounty Issues (read only)
  → Query only open issues with "bounty" label and matching agent / MCP / API
  → Independent source schema and canonical GitHub URL check
  → Extract only explicitly advertised $ amount
  → Filter advertised reward >= $100, issue not a PR, recent updates <=90 days, up to 100 comments
  → Disqualify known problem source prefixes and stale/invalid entries
  → Dedupe canonical issue URLs
  → Ranked opportunity records
  → Mandatory external escrow/funding, claim eligibility, competition and spec review
  → Human approval to claim (NO claim automated)
  → Implementation + tests + PR + verified acceptance
  → Payout reconciliation (never inferred from merged PR)
```

### Files

- `scripts/demand-intelligence.mjs` — strict read-only GitHub API adapter with price/currency honesty and source guards.
- `scripts/gxeon-demand-scan.mjs` — operator CLI; disabled from network by default.
- `scripts/tests/gxeon-demand-intelligence.test.mjs` — 17 negative and positive mock-fetch tests.
- `.github/workflows/gxeon-existing-demand.yml` — offline safety CI and optional best-effort read-only live-source smoke.

### Run

```bash
node scripts/gxeon-demand-scan.mjs
# Returns disabled/status; 0 network, 0 claims, 0 USD earned.

node scripts/gxeon-demand-scan.mjs --live-read
# Reads only https://api.github.com/search/issues. No credentials needed.
# Prints a bounded JSON opportunity list. No Github comments, claims, PRs,
# wallet actions or provider-paid model calls. Rate limit errors fail closed.

node --test scripts/tests/gxeon-demand-intelligence.test.mjs
```

## Candidate schema is explicit about economic truth

Each record includes `rewardAdvertisedUsd`, `rewardCurrency: USD_OR_USDC_UNCONFIRMED`,
`fundingEvidence: UNVERIFIED`, `claimState: NOT_CLAIMED`, `payoutState: NOT_PAID`,
and `requiresManualEscrowConfirmation: true`.

A GitHub issue that says "$150" is **NOT proof of escrow, guaranteed work, actual acceptance, USDC liquidity, payment eligibility, or revenue**.

### Reviewed public demand examples at the start of this mission (2026-10-10)

| Platform/source | Real published request | Advertised value | Admission |
|---|---|---|---|
| GitHub / Opire mention | [Claude PR-review agent issue #4](https://github.com/claude-builders-bounty/claude-builders-bounty/issues/4) | $150 | Issue open, but 1,635 comments: HIGH competition / insufficient escrow proof, **do not claim**. |
| Algora / tscircuit | [Open bounty board](https://algora.io/tscircuit/bounties?status=open) | varies, e.g. $170 | Several hundred claims on some older tasks. **No automated claim**. |
| Frantic | [Sourcey docs bounty #33](https://gofrantic.com/bounties/33) | $20 | Appears funded; $20 below floor and strict custom-domain verification; **do not claim**. |
| GitHub / Nexussyn | [Algora integration task #4](https://github.com/Nexussyn/ai-growth-platform/issues/4) | $3 USDC | Published and open; below $100 strategic floor and unconfirmed payment; **do not claim**. |

These examples demonstrate **existing demands** and their risks, not authenticated marketplace assignment or guaranteed ability to collect rewards.

### Eligibility gates before executing any external bounty

1. Verify sponsor and payout platform, actual escrow/payment proof on provider, and current issue state.
2. Confirm task acceptance terms, geographic eligibility, wallet/payment method and genuine reward currency/amount. Avoid bounties demanding prior payment or funded credentials.
3. Verify a specific work slot/claim and check existing PRs; no race on saturated issues.
4. Estimate scope vs payout; do not use paid APIs or expose secrets before approval.
5. Obtain human/operator approval for any irreversible external claim or repo modification.
6. Submit only permitted deliverables and passing tests; record issue link, PR, commit and independent acceptance.
7. Count money only when settled, reconciled and accessible.

**Important:** this first adapter discovers *GitHub-hosted demands*. Official Algora platform endpoints, Opire escrow APIs, Frantic authenticated task claiming, wallets and Stripe payout systems are **NOT connected** by this module. Add those only after validating documented provider endpoints and explicit permissions; don't fabricate integrations based on brand mentions in issue descriptions.

## Why this is not an automated worker factory yet

The GXEON 12–17 AgentOS stack remains draft/unmerged. This source adapter can work independently with public demand information; it does not require a provider-paid inference or expose a model key, and can be consumed by Systems Command once a reviewed ingestion contract exists. **We are integrating demand, not selling a new XPeX service.**

## First real-source smoke: protective findings (2026-10-11 UTC)

The first CI public GitHub search succeeded but found multiple deceptive records from `zhangjiayang6835-cyber/bounty-plaza`. One falsely advertised a `$500` CSS memory-leak task whose source is an explicit agent honeypot. Another mirrored a title advertising `$400` although the original bounty text claimed just `$1 USDC`. These are NOT tasks to pursue, and NO financial value was recognized.

New checks reject the `bounty-plaza` mirror source, other explicit GitHub mirror patterns, honeypot language, and inconsistent amounts across title and body. The system must only produce unverified opportunities after passing these filters; **an issue claiming a high bounty is never payment proof**.


## GXEON — Provider Truth Gate (2026-10-11)

This mission now includes three **canonical, no-auth, read-only** API providers:

| Provider | Public source | Observed actual state | Economic decision |
|---|---|---|---|
| BaseBounty | `GET https://www.basebounty.app/api/v1/bounties?status=open` | Base chain ID 8453, **0 open jobs** | no claim |
| BasedAgents | `GET https://api.basedagents.ai/v1/tasks?status=open` | 20 open records in snapshot; one funded-escrow item is explicitly titled **"Test hire (please ignore)"** and says it will be canceled. Other paid records displayed mostly 0.25–2 USDC without funded escrow, often conditional on the claimant's own paid revenue generation. | no eligible >=100 USDC funded task |
| Project Room | `GET https://room.trydemigod.com/api/project-offers` | 11 published offers; 4 paid advertised (200, 100, 100, 100 USDC), each says `fundingStatus:"not_configured"` and `paymentStatus:"not_configured"` | no funded/payout-ready opportunity |

This table is a **point-in-time public read**, not a permanent marketplace promise. No credentials or transactions were used. Sources for the BaseBounty contract storage and Base addresses: https://www.basebounty.app/developers. BasedAgents uses a custodial funded-escrow field by default and is a different escrow/payment architecture from BaseBounty: https://github.com/maxfain/basedagents.

The fake funded BasedAgents record has a real-looking **deposit transaction hash** in the API, but explicit **"Test hire (please ignore)"** instructions make it ineligible for this commercial execution. It is intentionally excluded even at a zero-dollar threshold.

### Execution code and trust layers

1. `scripts/provider-escrow-readiness.mjs`: validates three canonical public JSON provider schemas and economic claim state. Threshold defaults to **100 USDC**. Suspicious test hires and pay-to-earn/paid-cycle offers fail closed. A task with `escrow.status=funded` and provider-declared deposit tx is **PROVISIONAL ONLY**; the matching onchain transfer and owner authorization must be independently verified.
2. `scripts/gxeon-provider-truth.mjs`: CLI with network disabled by default. `--live-read` performs only three unauthenticated GETs and prints a JSON report. `claimReady`, `independentlyVerifiedEscrow`, and `confirmedRevenueUsdc` remain zero until separate verification.
3. `scripts/payout-proof-gate.mjs`: pure, conservative reconciliation of an **accepted and settled** BasedAgents task with an independently verified Base USDC ERC-20 transfer from the recorded escrow wallet to the operator's **authorized recipient**, including chain ID, token contract, exact USDC atomic units, tx hash and at least 12 confirmations. It does NOT fetch the chain itself and cannot assert ownership or transfer receipt if those inputs come from an untrusted party.
4. `scripts/tests/provider-escrow-readiness.test.mjs` and `scripts/tests/payout-proof-gate.test.mjs`: synthetic/mock positive and negative cases. Passing tests **do not prove money received** or an external provider account is authenticated.

The independently authenticated chain reader must be used to populate `chainTransfer`; **do not set `verifiedByIndependentChainReader=true` yourself** or interpret the flag as cryptographic verification. During this mission the Blockscout connector returned **HTTP 402, PRO API credits exhausted**, so direct explorer corroboration was **not available**. Do not top up, sign or buy access automatically.

### Developer commands

```bash
node scripts/gxeon-demand-scan.mjs                 # default 0 network
node scripts/gxeon-provider-truth.mjs               # default 0 network
node scripts/gxeon-demand-scan.mjs --live-read     # GitHub public issues
node scripts/gxeon-provider-truth.mjs --live-read   # BasedAgents, BaseBounty, Project Room
node --test scripts/tests/gxeon-demand-intelligence.test.mjs
node --test scripts/tests/provider-escrow-readiness.test.mjs
node --test scripts/tests/payout-proof-gate.test.mjs
```

### Remaining blockers to "executar → receber"

- A canonical **genuinely funded, unclaimed, executable** paid task above floor must appear and remain open long enough to claim legitimately; this run found **none** from the three dedicated providers.
- Verify the funding transaction/contract on Base with a live independent explorer and check whether it belongs to the **specific task**. Provider `payment_verified=1` alone is not authoritative.
- Verify operator/agent ownership, payout wallet, claim eligibility and necessary provider identity authentication without publishing any secret. For claim/write, obtain explicit per-task approval if new permissions, wallet signatures, bonds or spending are involved.
- Only then run a bounded solution, review/tests, publish proof, request independent acceptance and reconcile **real** USDC onchain payment.
- The core GXEON OS Typecheck/Build on main currently reports unrelated API server TypeScript errors (e.g. `r100Truth.ts` and audit services). This PR does not claim production release readiness until those baseline errors are fixed in separate review.

**No task was claimed, submitted, paid or released. No customer contacted. No money spent or earned.** The deliverable is an **existing-demand-to-provider-truth-to-payout-proof pipeline** in a draft PR.
