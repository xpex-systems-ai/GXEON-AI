# GXEON Release Gate P0 Runtime Preview

## Role

Release Gate P0 is a preview-only, manual-first runtime layer between Delivery Validation P0 and future Ledger/Monetization work. It accepts Delivery Validation preview-like records or direct safe preview input and creates internal in-memory release preview records.

## Relationship to Delivery Validation P0

Delivery Validation P0 owns evidence state, acceptance criteria, approval state, revision/rejection state and the next manual validation gate. Release Gate P0 consumes those preview fields and calculates:

- release readiness score;
- evidence completeness;
- operator approval state;
- financial readiness preview;
- blocked release reasons;
- next manual action.

## API contracts

All Release Gate P0 responses include `success` and `data` envelopes. All records preserve these safety flags:

- `mode: PREVIEW_ONLY`
- `releaseDisabled: true`
- `paymentDisabled: true`
- `ledgerWriteDisabled: true`
- `approvalRequired: true`
- `evidenceRequired: true`
- `revenueClaimed: false`
- `externalContact: false`
- `githubWrites: false`
- `paymentAction: false`
- `autonomousExecution: false`

### `GET /api/release/status`

Returns `RELEASE_GATE_P0_READY`, in-memory record count, allowed manual-safe states and safety boundaries.

### `GET /api/release/previews`

Returns all in-memory release preview records.

### `GET /api/release/previews/:id`

Returns one release preview record or `RELEASE_PREVIEW_NOT_FOUND`.

### `POST /api/release/previews`

Creates a release preview from validation-like input. Example input:

```json
{
  "validationPreviewId": "validation_preview_000001",
  "executionPreviewId": "execution_preview_000001",
  "taskId": "task_preview_001",
  "title": "Fix Supabase RLS for dashboard",
  "approvalState": "PENDING_REVIEW",
  "evidenceState": "READY_FOR_REVIEW",
  "blockedActions": ["external_contact", "payment_action", "github_write"],
  "acceptanceCriteria": ["Operator reviewed execution preview", "Evidence accounted for"],
  "estimatedRevenueBrl": 499
}
```

### `PATCH /api/release/previews/:id/state`

Allows safe manual state updates only. Real release, invoiced, paid or authorized-real states are rejected.

## Future work

- Ledger P0 runtime preview.
- Monetization P0 runtime preview.
- Any production persistence or real financial action must be designed separately and must not inherit P0 preview endpoints as real execution endpoints.
