# GXEON 14 — Model Sandbox P2 (OFFLINE MOCK ONLY)

**State:** draft-source model adapter and policy boundary; **no real OpenAI/Agents API connection, no provider calls, no live agent**.

## Purpose
Advance GXEON 12/13's deterministic synthetic audit into a **model-compatible workflow** without authorizing paid inference, credentials, unrestricted tool calling or any external effects.

## Implemented
- Model provider *interface seam*: `callOfflineFixtureModel(FIXTURE_MODEL_DRIVER, findings)` yields a typed `ModelProposal` with finding codes, human-approval flag and execution disabled.
- Request preview `previewResponsesRequest()`: OpenAI Responses-like schema with `store:false`, `tools:[]`, `tool_choice:"none"`, maximum output 128 and fixed synthetic catalog only. **This object is never sent.** Provider and model are placeholders.
- Strict fail-closed policy: only an identity-checked, locally frozen mock driver accepted; no network/model provider execution; no secrets, payments, GitHub writes, wallet signatures, customers or deploys.
- Independent, deterministic validation: verifier re-reads the original frozen Systems Command-shaped test catalog and rejects invented, missing or duplicate codes, unknown fields, attempts to enable execution, false provenance or falsified usage.
- `Genesis` mission records auditor observation, engineering draft and independently verified proof; terminal `AWAITING_HUMAN_APPROVAL` or `REJECTED`.
- Input-free read-only endpoint `GET /api/agentos/genesis/model-sandbox-demo` *exists only on this draft branch*. It does not connect to OpenAI or Systems Command.
- Offline negative tests and runnable demo:
```bash
node --experimental-strip-types --test scripts/tests/agentos-model-sandbox.test.mjs
node --experimental-strip-types scripts/agentos-model-sandbox-demo.mjs
```

## Security boundaries
- Budget: **US$0 real provider budget**, no live calls. `simulatedOutputTokens` is NOT real billed usage.
- Request preview has **no tools** or automatic function execution.
- The mock is a deterministic stand-in, **not AI reasoning**. Thus test success does NOT imply any paid/real model's capability, robustness or pricing.
- Test actor IDs are not authenticated; in-memory digests are not signed nor durable. No tenancy and no sandbox at the OS/VM boundary yet.
- The proposed output contract validates *the report*, not the truth of arbitrary real-world source data. G0–G7 not approved.

## Follow-up required before an actual model-powered agent
1. Independently review/merge stack of draft PRs; no deployment yet.
2. Build a server-only real provider adapter in a dedicated sandbox and obtain explicit separate authorization and budget. Never expose API keys to frontend.
3. Choose and verify model and API against current provider documentation; structured outputs must be validated regardless of model claims.
4. Enforce tool allowlist, quotas, max duration/output/tokens, abort, trace redaction and abuse/SSRF/prompt-injection tests.
5. Implement tenant-specific verified identity, durable mission journal and independently signed evidentiary provenance.
6. Authorized staging E2E with Synthetic Command bridge, independent approver and G0–G7 gates.

GXEON Evidence First — no production or financial autonomy without verified consent.
