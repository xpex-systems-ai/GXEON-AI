# GXEON 15 — Real Model Sandbox P3 (provider-capable, disabled by default)

**Status:** Draft source in PR #447 (update PR reference if number differs).
**No live OpenAI API request has been made by this mission.**
**No backend/public route invokes the provider.**
**Only approved isolated synthetic requests may be sent in the future.**

## Architecture

- Existing GXEON 12/13/14 remains unchanged: in-memory mission ledger; frozen Systems Command-shaped synthetic fixtures; independent logical auditor/engineer/verifier.
- `artifacts/api-server/src/agentos/realModelSandbox.ts` implements a **real HTTP transport** for a single OpenAI Responses API `POST https://api.openai.com/v1/responses`. This is **not** the OpenAI Agents API/SDK, though it creates a future integration seam.
- The only model is `gpt-5.6-luna`, with exactly three fake catalog rows and strict JSON schema. Model receives **zero tools**, `store:false`, and no actual XPeX/company data or customer material.
- CLI: `node --experimental-strip-types scripts/agentos-real-model-once.mjs`. Disabled unless all gate values are explicitly satisfied, including a real API key, per-request operator cap and pricing review timestamp within 24 hours.
- A hard-coded endpoint, disabled redirects, 15-second abort signal, 1 provider call and no retries. There is **no Express route** to invoke it remotely.
- Response accepted only when `status:"completed"`, usable token counts, full structured findings, no hallucinations/duplicates/extra fields and source independent re-read pass. Last mission state is `AWAITING_HUMAN_APPROVAL`; never auto-approval.
- Provider usage `input_tokens`, `input_tokens_details.cached_tokens`, `output_tokens` is parsed, and resulting token cost **estimated** using published standard text input/cached/output prices. Only provider billing can confirm charges.

## Provider and pricing evidence

Official model: https://developers.openai.com/api/docs/models/gpt-5.6-luna
Official Responses API: https://developers.openai.com/api/reference/resources/responses/methods/create
Official structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs

Price recorded on 2026-10-10 for the model's **standard text tier**:
- input US$0.20 / million tokens
- cached input US$0.02 / million tokens
- output US$1.20 / million tokens

**Prices must be checked against the current provider page within 24h BEFORE the first live call.** Different modes, regional processing, other fees or later pricing can invalidate the estimate. Source code is pinned to the standard text tier; regional or fast features are disabled by design.

## Operator approval (NOT currently granted)

This sandbox requires all of the following environment variables in a PRIVATE server-side session:

```
GXEON15_ENABLE_REAL_MODEL=true
GXEON15_ENVIRONMENT=synthetic-only
GXEON15_APPROVAL_ACK=I_APPROVE_ONE_PAID_GXEON15_SANDBOX_CALL
GXEON15_APPROVED_CAP_USD=0.01
GXEON15_PRICING_REVIEWED_AT=<fresh ISO UTC timestamp, within 24h>
GXEON15_OPENAI_PROJECT_ID=<dedicated API project ID, proj_...>
OPENAI_API_KEY=<privately stored real provider API key>
```

**No one should set these variables until the operator explicitly approves a US$ amount and a private isolated environment has been reviewed.** Never commit the key or paste it in PRs, Slack, screenshots or chat. Prefer a secret store limited to a single short-lived sandbox process.

### Budget control truth

- The *preflight reservation estimate* conservatively assumes up to 2,000 text input tokens, 256 output tokens and applies a 2x safety multiplier. Minimum gate threshold is the resulting estimate. This is **not a provider-side reserved balance**.
- Operator per-call cap is at most **US$0.01** in source; below cap plus more restrictive preflight limit. The code checks reported usage **after** the call. If response usage exceeds cap, result is rejected, but **the provider may still bill**.
- Aborting / losing network doesn't guarantee no charge. `max_output_tokens` and timeout limit service-side computation/latency but cannot cap all unexpected charges.
- One-shot lock is **per process**, not shared across replicas or executions. Require an isolated provider project with a **hard** spend limit, a single short-lived API key, key revocation after use, and billing reconciliation. Provider hard-limit enforcement can lag and allow a small overshoot; US$0.01 is an authorization maximum, not an exact guaranteed final invoice cap.
- The request sets the `OpenAI-Project` header to the required explicit project ID. This does not by itself prove the project has hard limits or available API funds.
- User requested final confirmation BEFORE execution. Approval of a planning cap does not authorize activating the CLI while account billing and isolation are unverified.
- This is a developer test, not a financial operation on a user's bank/wallet. A paid API request still uses funds from the API billing account, so prior operator approval remains mandatory.
- Provider returns no invoice/settlement with a Responses API payload. All computed amounts are labeled `estimatedCostUsd` and `providerInvoiceReconciled:false`.

## Safety and verification

```bash
node --experimental-strip-types --test scripts/tests/agentos-real-provider-contracts.test.mjs
# This next command MUST fail when approval and key are absent:
node --experimental-strip-types scripts/agentos-real-model-once.mjs
```

CI uses a **fake injected fetch**, never makes real network calls, and never contains secrets. Negative tests cover:
- missing/forged approval, missing key, wrong environment, stale price review;
- budgets too low and too high, no tools/no storage/one endpoint/no redirect;
- provider hallucination and extra instructions, missing, duplicate, incomplete findings;
- missing/invalid usage, fake costs, HTTP error redaction, repeated/concurrent calls;
- aborts and attempts to access disallowed endpoints.

## Before staging/live admission

- Independent security/code review and orderly merge of #436 → #438 → #439 → #440 → #442 → #443 → #444 → #446 → this PR; do not skip gates.
- Dedicated billed project with independently checked model access, existing spend, **hard enforced project spend limit** and explicit operator confirmation immediately before the call.
- Proper identity/RBAC and tenant isolation; test data only until a verified Systems Command server-to-server read contract is approved.
- Durable, independently authenticated evidence trail, idempotent orchestration and incident/kill switch.
- Network-egress restrictions external to this code, tracing/cost reconciliation and approved staging smoke.
- G0–G7 still apply. No deploy, commercial claims or customer activity under this PR.

**Evidence First — no automatic financial transactions, no made-up revenue.**

## Current operator preflight status

- Approved *conditional* amount: **one synthetic call, maximum US$0.01**.
- Model/pricing/structured-output support: public documentation verified on 2026-10-10.
- API project ID, account billing funds, effective **hard limit**, dedicated key and isolated runtime: **NOT VERIFIED**.
- No spend can occur until the user confirms once more after verifying these conditions.

For the provider-side gate, the project Owner should open OpenAI API Platform **Project settings → Limits → Spend → Edit spend limit** and enable **Enforce a hard limit**. A spending alert alone is insufficient. See https://developers.openai.com/api/docs/guides/spend-limits. A ChatGPT subscription is not proof of API billing.
