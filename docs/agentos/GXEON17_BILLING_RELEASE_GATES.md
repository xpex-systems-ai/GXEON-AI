# GXEON 17 — One-path provider-billing release gates

**Status: SOURCE IN DRAFT PR / STRICTLY DISABLED IN CI / NO REAL PAID API CALL.**

GXEON 15 provides an operator-only one-shot OpenAI Responses API client (fixed synthetic data); GXEON 16 provides a *read-only* OpenAI project hard-spend check (one-cent, monthly, enforcing). This mission connects these **in a single operator CLI** and adds an OpenAI **organization costs** read, filtered to the exact project before even constructing the paid request.

## Required operator path

```
PRIVATE OPERATOR CLI (NOT DEPLOYED)
  ├─ final per-call human GO self-attestation (separate from prior conditional consent)
  ├─ private API key, project ID and model access supplied by secure operator context
  ├─ private organization-admin read credential (never passed to the model)
  ├─ GET /v1/organization/projects/{project_id}/spend_limit
  │   MUST equal project.spend_limit; USD, month, 1 cent, enforcing
  ├─ GET /v1/organization/costs
  │   start at UTC month start, filtered and grouped by project
  │   must be complete, valid, and report ZERO project costs
  ├─ one Responses API request, fixed model and synthetic-only data
  │   no tools, no retries, max 256 output tokens, 15s timeout
  └─ result: independent verifier + provider usage COST ESTIMATE ONLY
```

The CLI now calls `verifyProjectBillingBeforePaidCall` **before** `createApprovedOneShotSandbox(config).run()`. The admin GET requests cannot cause inference charges and are performed only when their own explicit gate and administrative key are present.

## Offline verification

```bash
node --experimental-strip-types --test scripts/tests/gxeon17-unified-billing-release.test.mjs
node --experimental-strip-types --test scripts/tests/gxeon16-project-billing-preflight.test.mjs
node --experimental-strip-types --test scripts/tests/agentos-real-provider-contracts.test.mjs
# Must exit nonzero, without network:
node --experimental-strip-types scripts/agentos-real-model-once.mjs
```

CI injects **fake** read-only admin responses and does not have access to the real admin or project keys. No external inference endpoint is ever called in CI.

## What is still NOT verified

- Actual OpenAI API **project ID, model access, funded billing, existing spend** and account ownership.
- True hard-limit enforcement at the provider and impact of propagation delays. **Hard limits can overshoot, even at US$0.01.**
- Usage APIs may lag; a current zero-cost response can be incomplete or late. Even if it returns a valid, complete project-scoped page with zero cost, it **does not guarantee** zero unbilled/in-flight requests.
- Isolated network-egress controls, one-time key scopes, token revocation, durable audit trail, code/release human independent approval and G0–G7.
- User's **final** explicit GO in chat immediately before a paid run.

A privileged admin API key is especially sensitive. It should NEVER be pasted into GitHub PRs, system logs or this conversation. Prefer a private ephemeral operator environment; for such a small test, manual billing dashboard verification can be safer than placing an admin key into a service.

**The single-process one-shot lock is not a distributed monetary cap.** This code does not configure provider spending limits or perform checkout, invoice collection, Stripe/PIX transactions or financial settlement.

## Release status: BLOCKED

User's conditional spend authorization: **one** synthetic call, up to **US$0.01**. It is not consent to change an OpenAI billing account or automatically start paid operations. Because spend-limit enforcement can overshoot and final GO was expressly required, user confirmation plus direct account/billing verification are mandatory.

Even after a successful technical preflight, **the operator must not claim provider-invoiced cost is known** from token estimates, and must reconcile actual project usage later.

## Official references
- Project hard spend limit: https://developers.openai.com/api/docs/guides/spend-limits
- Project hard limit GET: https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/projects
- Organization costs API: https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/usage/methods/costs
- GPT-5.6 Luna: https://developers.openai.com/api/docs/models/gpt-5.6-luna

Evidence First. The executor does not approve its own delivery.
