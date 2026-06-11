# GXEON Execution Center P0

Execution Center P0 is a preview-only, manual-first runtime layer that turns Broker P0 decision previews into internal execution preview records. It is designed to give the operator a safe checklist and evidence plan without executing code, deploying services, writing to GitHub, contacting users, mutating databases, installing agents, or triggering payments.

## Role

Execution Center P0 is responsible for:

- Reading or accepting Broker decision preview data.
- Creating in-memory execution preview records.
- Tracking preview/manual statuses only.
- Tracking checklist items, required evidence, blockers, and rollback notes.
- Exposing a read-only/manual-preview API.
- Rendering records in `/ops/execution`.

Execution Center P0 is not responsible for real delivery, autonomous execution, background work, persistence, credentials, external calls, or payment activity.

## Relationship to Broker P0

Broker P0 remains the routing source for recommended agents, approval gates, blocked actions, risk energy, and operator next action. Execution Center P0 accepts Broker-like input through `POST /api/execution/previews` and creates a derived manual preview. The builder never mutates the Broker decision and never calls external APIs.

## Relationship to Validation, Release, and Ledger

Execution Center P0 prepares records for future manual gates:

1. Manual checklist completion.
2. Evidence collection.
3. Validation Center review.
4. Release gate review.
5. Ledger recording.

P0 does not mark real delivery complete. It only records what evidence will be required before any future validation or release stage can trust the work.

## API contracts

All responses include a `success` boolean and a `data` object. Preview safety flags are preserved in all status and preview responses.

### `GET /api/execution/status`

Returns `EXECUTION_CENTER_P0_READY` with:

- `mode: PREVIEW_ONLY`
- `approvalRequired: true`
- `executionDisabled: true`
- `evidenceRequired: true`
- `autonomousExecution: false`
- `externalContact: false`
- `githubWrites: false`
- `paymentAction: false`

### `GET /api/execution/previews`

Returns all in-memory execution previews as `executionPreviews`.

### `GET /api/execution/previews/:id`

Returns one execution preview as `executionPreview` or `EXECUTION_PREVIEW_NOT_FOUND`.

### `POST /api/execution/previews`

Accepts Broker decision-like input:

```json
{
  "brokerDecisionId": "broker_preview_123",
  "title": "Fix Supabase RLS for dashboard",
  "taskId": "task_preview_001",
  "recommendedAgentIds": ["security_agent", "task_agent", "operator_copilot"],
  "riskEnergy": 90,
  "blockedActions": ["external_contact", "payment_action", "change_database"],
  "approvalGates": ["operator_review_required"]
}
```

Returns `executionPreview` plus safety flags.

### `PATCH /api/execution/previews/:id/status`

Allows only preview/manual statuses:

- `NOT_STARTED`
- `READY_FOR_OPERATOR`
- `BLOCKED`
- `IN_MANUAL_PROGRESS`
- `READY_FOR_REVIEW`
- `CANCELLED`

No `EXECUTING`, `DONE_REAL`, deploy, run, execute, payment, GitHub-write, or external-action route exists.

## Frontend

`/ops/execution` now reads backend previews when the API is available and falls back to a safe empty/manual state when it is unavailable. The page displays:

- PREVIEW_ONLY, MANUAL_FIRST, EXECUTION_DISABLED, and EVIDENCE_REQUIRED badges.
- Status cards from API data.
- Execution preview cards.
- Checklist items.
- Evidence requirements.
- Blocked actions.
- Rollback plan.
- Operator next action.

Broker P0 shows a `Create Execution Preview · manual only` action after a Broker decision exists. This calls the preview API only and links the operator to `/ops/execution`.

## Future work

- Delivery Validation P0 runtime linking, still preview/manual-first.
- Manual evidence upload or linking after a safety review.
- Persistence only after the safety boundary is approved.
- Release and Ledger integrations after explicit operator validation.
