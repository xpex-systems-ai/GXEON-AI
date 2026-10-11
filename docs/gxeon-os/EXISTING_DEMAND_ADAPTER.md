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
- `scripts/tests/gxeon-demand-intelligence.test.mjs` — 14 negative and positive mock-fetch tests.
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
