# GXEON Broker P0 Safety Boundary

Broker P0 is constrained to preview-only routing.

## Always true

- `mode: PREVIEW_ONLY`
- `approvalRequired: true`
- `executionDisabled: true`
- `autonomousExecution: false`
- `externalContact: false`
- `githubWrites: false`
- `paymentAction: false`

## Explicitly absent

Broker P0 does not add routes for agent install, activation, execution, approval execution, external contact, GitHub writes, checkout sessions, payment capture, infrastructure deployment, or database mutation.

## Storage boundary

Broker P0 creates in-memory decision previews only. No database writes are performed.

## Operator boundary

The operator may inspect recommended agents, risk energy, safety grade, blocked actions, and manual gates. The operator cannot execute a Broker decision from P0 UI or API.

## Registry boundary

Broker P0 reads the Home Center Agent Registry and permission matrix. It preserves registry-level disabled flags and treats manual approval gates as required.
