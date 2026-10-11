# GXEON 16 — OpenAI Project Billing Hard-Limit Preflight

**State:** source-only/draft, **read-only admin inspection capability**, **no project checked, no real model called, no API cost**.

## Why this mission exists

GXEON 15 (PR #447) introduced a code-level maximum of US$0.01 for one synthetic OpenAI Responses API request. This is only a *local* attempt to limit use: the provider may bill calls that time out, and a local in-process lock is not a distributed payment ceiling. The founder authorized preparation up to US$0.01 **conditionally** and expressly requested a *final confirmation before any paid call*.

The official OpenAI administration API provides an authenticated, **read-only**:
`GET /v1/organization/projects/{project_id}/spend_limit`

Official provider docs:
- https://developers.openai.com/api/docs/guides/spend-limits
- https://developers.openai.com/api/reference/typescript/resources/admin/subresources/organization/subresources/projects

## What was built

- `artifacts/api-server/src/agentos/projectBillingPreflight.ts`: detects only a provider response of `object=project.spend_limit`, `threshold_amount=1` **cent**, `currency=USD`, `interval=month`, `enforcement.status=enforcing`. Any higher limit, alert-only setting, inactive status, missing fields or invalid JSON is **BLOCKED**.
- A read-only admin transport, only called with explicit private operator consent, exact project ID format and separately provided admin API key. URL is HTTPS with an allowlisted host and `GET` method; redirects disabled, 8-second timeout, no retries.
- `scripts/gxeon16-billing-preflight.mjs`: **disabled by default**; without explicit operator configuration it reports `BLOCKED_ADMIN_READ_DISABLED` and makes no network request.
- `scripts/tests/gxeon16-project-billing-preflight.test.mjs`: contract tests with **fake** provider responses, no admin token, no real requests.
- CI `.github/workflows/gxeon16-billing-preflight.yml`: offline tests and default-disabled CLI verification.

## Operator-only read (NOT performed)

The operator would need to privately configure an **admin** API key scoped to the relevant organization, which is a highly privileged credential; keep it **out of any general-purpose/production application, customer data, PR, chat, screenshot or public log**. Prefer manual dashboard verification if the risk of administering a privileged key is not justified by a one-cent experiment.

Exact environment variables of the isolated CLI:
```
GXEON16_ADMIN_READ_ENABLED=true
GXEON16_ENVIRONMENT=synthetic-only
GXEON16_ADMIN_READ_INTENT=GXEON16_READ_PROJECT_HARD_SPEND_LIMIT_ONLY
GXEON15_OPENAI_PROJECT_ID=<private project id, proj_...>
GXEON16_OPENAI_ADMIN_KEY=<secure ephemeral admin secret; never share>
```

The CLI is **not to be enabled in this mission**. It does not run with GitHub secrets in CI. The project ID is only represented by a 12-character hash fingerprint in the report.

## Official result schema and exact authorization

Expected response example:
```json
{
  "object": "project.spend_limit",
  "threshold_amount": 1,
  "currency": "USD",
  "interval": "month",
  "enforcement": { "status": "enforcing" }
}
```
For this one user-approved US$0.01 experiment **1 cent is the only accepted project hard threshold**. Even that can slightly overshoot in real provider billing due to enforcement propagation. It does not guarantee exact billed charges <= US$0.01.

## Why a successful GET still means BLOCKED

Even if the read-only provider API reports an enforced one-cent project limit, the result stays `BLOCKED_PENDING_OPERATOR_REVIEW` because:
- actual monthly project usage and remaining provider credits **are not verified**;
- project user isolation, short-lived key, egress policy and single-process runtime are not verified;
- strict security review and stacked PR merges remain outstanding;
- provider limit propagation can overshoot;
- **the user must explicitly confirm a final GO before paid execution**.

No inference request, account/project mutation, credential import into the repository, rollout or billing action is authorized by this document.

## Next gates

1. Owner reviews actual OpenAI API **project** settings (not ChatGPT billing); set hard limit if the provider supports a one-cent threshold.
2. Verify existing spend and balance; use a project with **no competing consumers**.
3. Configure protected short-lived project key and isolated server-side one-shot environment.
4. Independent review of draft PR stack #436 → #438 → #439 → #440 → #442 → #443 → #444 → #446 → #447 → this PR.
5. Run authenticated provider hard-limit GET with separate admin permission or inspect provider dashboard, retaining **redacted** proof and current timestamp.
6. Confirm user GO/NO-GO again **before** any real Responses API request. A hard limit can overshoot, so do not proceed if zero chance of exceeding US$0.01 is required.

**Evidence First — executor does not approve its own delivery.**
