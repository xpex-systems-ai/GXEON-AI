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
4. `scripts/tests/provider-escrow-readiness.test.mjs`, `scripts/tests/base-usdc-escrow-chain.test.mjs` and `scripts/tests/payout-proof-gate.test.mjs`: synthetic/mock positive and negative cases. Passing tests **do not prove money received** or an external provider account is authenticated.

The independently authenticated chain reader must be used to populate `chainTransfer`; **do not set `verifiedByIndependentChainReader=true` yourself** or interpret the flag as cryptographic verification. During this mission the Blockscout connector returned **HTTP 402, PRO API credits exhausted**, so direct explorer corroboration was **not available**. Do not top up, sign or buy access automatically.

### Developer commands

```bash
node scripts/gxeon-demand-scan.mjs                 # default 0 network
node scripts/gxeon-provider-truth.mjs               # default 0 network
node scripts/gxeon-demand-scan.mjs --live-read     # GitHub public issues
node scripts/gxeon-provider-truth.mjs --live-read   # BasedAgents, BaseBounty, Project Room
node scripts/gxeon-chain-proof.mjs --live-read --task-id=task_ILI16I1DYjTOabbUBRvV9  # test escrow only, NOT claimable commercial work
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

## Independent no-key onchain confirmation — safe example

The public explorer APIs are readable without the Blockscout PRO MCP key:
- `GET https://base.blockscout.com/api/v2/transactions/{txHash}`
- `GET https://base.blockscout.com/api/v2/transactions/{txHash}/token-transfers`

**Observed public, confirmed Base USDC deposit** (2026-10-11):
- BasedAgents task ID: `task_ILI16I1DYjTOabbUBRvV9`
- Title: **Test hire (please ignore)**; task description explicitly says *"This task will be cancelled."*
- Provider states escrow funded, amount 1,000,000 atomic units, 1 USDC, Base network.
- Public Base transaction: [0x21cc4089…af29bd03](https://base.blockscout.com/tx/0x21cc40895706a82b087093276a3064cb914d7c4e0fdaf067560e27fcaf29bd03)
- Public explorer reported transaction `status:"ok"`, `result:"success"`, 171712 confirmations when checked.
- ERC-20 transfer found: 1,000,000 USDC atomic units, 6 decimals, from the poster wallet `0x16d4479a4dfbdd6231b5ce686d2eedd04809e7e8` to the BasedAgents escrow wallet `0x0440383B02A10BE0Dea587c5b5Fbb622dBf4719D` using canonical Base USDC token `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.

This **proves a real deposited USDC transaction**. It **does not** establish a legitimate paid job, because the poster told workers to ignore it. The verifier specifically returns `FUNDED_BUT_INELIGIBLE_TEST`; it never claims, submits, signs or records income. The tool's first-party Blockscout PRO connector was credit-exhausted, so the corroboration used the **public explorer endpoints** rather than paid PRO access. Fresh confirmation counts and task availability can change.

Additions:
- `scripts/base-usdc-escrow-chain.mjs`: strict proof comparison against transaction status, >=12 confirmations, exact transfer USDC/chain, poster wallet, escrow wallet, and atomic amount. Rejects paginated/incomplete ERC-20 transfer reads.
- `scripts/gxeon-chain-proof.mjs`: no-network default; explicit `--live-read --task-id=...` performs only public GETs for this canonical task plus chain receipt.
- `scripts/tests/base-usdc-escrow-chain.test.mjs`: 10 fake HTTP and proof-gate tests, no network required.
- `scripts/payout-proof-gate.mjs`: separate acceptance-and-**payout** proof, comparing a final released Base USDC transfer to the operator's approved wallet.

**Use the 4-way safeguard:** (a) published task is legitimate and currently available; (b) actual funded escrow transaction independently matches; (c) worker identity, required permissions and clear acceptance criteria authorized; (d) payout transfer finally settles to our verified wallet. The stage (b) passed for a known test task but fails (a): it is **not a commercial opportunity**.

### Chain-proof read preflight (2026-10-11 follow-up)

The earlier live GitHub Actions step `gxeon-chain-proof.mjs --live-read --task-id=task_ILI16I1DYjTOabbUBRvV9` attempted an explorer read for a known ineligible fake/test task and received `GXEON_CHAIN_HTTP_UNAVAILABLE`. This is a provider HTTP failure, **not evidence that escrow is unfunded**. Its failure had been masked by `continue-on-error: true` in a best-effort job.

To avoid unnecessary external requests, `verifyEligibleBaseEscrowDeposit` now first checks task status, creator intent, min 100 USDC, on-platform escrow flag and consistent reward fields using the same canonical BasedAgents validation. It returns `INELIGIBLE_NO_EXPLORER_CALL` without any explorer GET for test hires, payout-on-revenue tasks, no escrow, inconsistent amounts or subfloor bounties. Only conditionally eligible, **still untrusted** provider records proceed to independent explorer reads.

Five additional fake-provider tests assert zero network for blocked tasks and two read-only explorer GETs for a synthetic conditionally eligible task. This is a **source integration / test contract**, not verified live money, and does not make a task claimed or paid.

Known baseline limitations remain: core monorepo Build/Typecheck errors in unrelated API server modules and PR #450 unmerged, so the 6-hour CI schedule in this workflow is NOT active on main until merge.

## End-to-end payout reconciliation — GXEON follow-up (2026-10-11)

The missing read-only **provider acceptance → Base USDC payout receipt → beneficiary proof** adapter has been added:

- `scripts/base-usdc-payout-chain.mjs`: operator-authorized read-only `verifyBasedAgentsPayoutOnChain()` checks provider's `verified` task, `settled` payment and `released` escrow before making network requests, then fetches exactly two public Blockscout `GET`s for the **release** transaction and ERC20 transfers.
- `scripts/tests/base-usdc-payout-chain.test.mjs`: 11 tests cover matching, source escrow wallet, authorized recipient, exact token contract and atomic amount, minimum 12 confirmations, rejecting paginated/overflow reports, wrongly assigned agent, forged release hashes, HTTP 402/429 and secret-free network calls. Passes are **synthetic** and not proof of real user earnings.
- Only a verified transfer from the provider escrow wallet to the approved owner wallet with a signed-off provider settlement can become `revenueBookable:true`. A completed GitHub issue, submitted PR, escrow **deposit**, or a user-supplied `verifiedByIndependentChainReader` flag cannot on its own count as revenue.
- The helper `verifyBasedAgentsPayout` remains a **pure contract validator**; use the network-bound `verifyBasedAgentsPayoutOnChain()` for any future receipt claim so independent evidence is fetched and checked by the same operation.
- This read-only proof verifies a *transfer*, **not wallet custody**, withdrawals, fiat settlement or merchant revenue accounting. Receipt uniqueness and payout ownership still require protected operator confirmation and operational ledger deduplication.

### Exact CI evidence

At commit `e2ea1790440c4e96e28481cd45a18b4254243399`:
- [Existing Demand Integration workflow #38179061104](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/38179061104): 17/17 GitHub bounty intake, 22/22 provider escrow, 9/9 pure payout, 15/15 funded deposit, 11/11 network-bound final payout integration — **74/74 targeted PASS**.
- Live external-source audit: 31 provider tasks/offers examined, **0 independently verified, claim-ready tasks**, **0 claimed**, **0 verified receipts**. Known test hire is rejected BEFORE explorer call, so no paid chain credits are wasted.
- [Monorepo Health #38179061222](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/38179061222): SUCCESS.
- Full Typecheck/Build remain blocked by existing unrelated API server TypeScript errors. Files `src/routes/operatorWorkflow.ts`, `src/routes/r100Truth.ts`, `src/services/auditProposalService.ts` have identical content SHA on `main` and this branch. Existing blocking issue: [#437](https://github.com/xpex-systems-ai/GXEON-AI/issues/437).

### External escrow example corroborated in this run

Using separate public Blockscout HTTP reads (not the exhausted PRO connector), the transfer for **the intentionally excluded test task** matched:
- 1,000,000 atomic USDC, canonical Base contract, sender `0x16d4479a4dfbdd6231b5ce686d2eedd04809e7e8`, escrow recipient `0x0440383B02A10BE0Dea587c5b5Fbb622dBf4719D`, tx `0x21cc40895706a82b087093276a3064cb914d7c4e0fdaf067560e27fcaf29bd03`.
- Confirmations were above 12 and the transaction succeeded.
- This is evidence of **someone else's escrow deposit to a test task**, NOT XPeX income or a bounty that should be claimed.

The GXEON workflow does **not** authorize claims or payments, does **not** connect private wallets, and is unmerged. The 6-hour scan schedule defined in this branch is **inactive on the default branch until independently reviewed and merged**.

### Hardened proof of actual income (2026-10-11 follow-up)

An ordinary JSON object containing `verifiedByIndependentChainReader:true` is **NOT** an acceptable attestation that the user has received USDC. The previous pure-value guard could be fed such a fabricated object; it is now fail-closed.

`scripts/payout-proof-gate.mjs` has `readVerifiedBaseUsdcPayout({transactionHash,from,to,amountAtomic})`: two allowlisted public Base Blockscout read-only GETs for the transaction and ERC-20 event log, requiring a successful tx, at least 12 confirmations, exactly one matching canonical USDC token transfer from the stored escrow wallet to the operator-approved recipient, and correct six-decimal atomic units.

The validator internally brands its returned immutable proof using a non-exported `WeakSet`. The payout booking function `verifyBasedAgentsPayout` now *rejects arbitrary caller-supplied JSON*, even when its self-declared `verifiedByIndependentChainReader` field is true. A branded proof is **in-memory only**; after a restart or serialization it must be independently verified again.

This is code tested using simulated provider/explorer data, **not actual received money**. Blockscout connectivity may still be unavailable or require paid credits. On HTTP errors, do NOT synthesize an accepted receipt or infer payout; record provider unavailability and retry later through a permitted independent explorer. No explorer GET is made for a known ineligible bounty.
