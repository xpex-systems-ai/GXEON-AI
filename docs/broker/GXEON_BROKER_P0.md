# GXEON Broker P0

Broker P0 is the preview-only routing brain between the P1 Task Queue, the quantum-inspired advisory layer, and the Home Center Agent Registry.

## Role

Broker P0 reads a task-like input and returns a `BrokerDecisionPreview`. It recommends planning, drafting, review, security-review, and operator-approval candidates. It does not execute any recommended route.

## Source of truth

The backend routing engine imports `getHomeCenterAgentRegistry()` and `getHomeCenterAgentPermissions()` from `artifacts/api-server/src/agents/homeCenterAgentRegistry.ts`. The Broker does not keep a reduced local agent registry.

## Quantum advisory relationship

Broker P0 imports `computeRiskEnergy()` from the existing quantum-inspired advisory layer. The risk energy and safety grade are classical advisory numbers used to explain route safety and approval gates.

## P1 Task Queue relationship

P1 Task Queue records can request a Broker route preview from the dashboard. This preview does not mutate task status and does not approve manual execution.

## API contracts

- `GET /api/broker/status` returns Broker readiness, `mode: PREVIEW_ONLY`, and all disabled-action flags.
- `GET /api/broker/decisions` returns in-memory decision previews.
- `GET /api/broker/decisions/:id` returns one in-memory preview.
- `POST /api/broker/preview-route` creates one in-memory preview from task-like input.

Every response includes a `success` boolean and a `data` object. Every decision includes `approvalRequired: true`, `executionDisabled: true`, `autonomousExecution: false`, `externalContact: false`, `githubWrites: false`, and `paymentAction: false`.

## Future Execution Center

Execution Center remains future work. Broker P0 prepares the shape of a safe handoff but does not expose execute, install, approve, run, activate, payment, or external-contact actions.

## Known limitations

- Decision storage is in-memory only.
- Scoring is deterministic and intentionally simple for P0.
- Backend-unavailable frontend fallback is safe but cannot verify live registry contents.
