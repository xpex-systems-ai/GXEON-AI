# Release Gate P0 Safety Boundary

Release Gate P0 is intentionally incapable of real-world release or financial side effects.

## Disabled in P0

- No real release.
- No invoice or receipt creation.
- No checkout session creation.
- No payment provider calls.
- No payment capture.
- No ledger writes.
- No GitHub writes.
- No external evidence fetching.
- No external user contact.
- No email sending.
- No database persistence.
- No background workers or schedulers.
- No credential forms or secret exposure.
- No claimed real revenue.

## Required flags

Every status and preview response carries the same hard safety boundary:

```ts
mode: "PREVIEW_ONLY"
releaseDisabled: true
paymentDisabled: true
ledgerWriteDisabled: true
approvalRequired: true
evidenceRequired: true
revenueClaimed: false
externalContact: false
githubWrites: false
paymentAction: false
autonomousExecution: false
```

## Manual-first workflow

1. Delivery Validation P0 produces or displays a validation preview.
2. The operator can create a Release Gate P0 preview from that validation record.
3. Release Gate P0 calculates readiness and blocked reasons.
4. The operator reviews evidence and financial readiness manually.
5. Future Ledger and Monetization previews may be introduced later, still preview/manual-first.

## Rollback plan

Remove the release router mount from `artifacts/api-server/src/routes/index.ts`, remove the Release Gate service from the dashboard, and revert the `/ops/release` page to static safe empty-state data. Because the store is in-memory only, rollback has no database migration or persistence cleanup.
