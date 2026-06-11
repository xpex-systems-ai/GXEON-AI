# GXEON Broker P0 Runtime Validation Report

Date: 2026-06-11
Branch: `fix/broker-p0-runtime-api-wiring`

## Root cause

The API server already mounted `brokerRouter` under `/api` and local API endpoints returned valid JSON. The dashboard Broker service could call an optional `VITE_GXEON_API_BASE_URL`, but it lacked the shared Vercel/static-host misconfiguration guard and fallback diagnostics already present in adjacent P1 services. In a Vercel static dashboard deployment with only the SPA rewrite, same-origin `/api/broker/*` requests are rewritten to `/index.html`, producing non-JSON responses and causing Broker P0 fallback.

A secondary local-development issue was that both the API server and Vite dashboard defaulted to port `3000`, making the requested local API + dashboard runtime validation awkward unless a separate dashboard port was supplied manually.

## Files changed

- `artifacts/gxeon-dashboard/src/services/apiBase.ts` centralizes non-secret API base URL resolution and Vercel misconfiguration diagnostics.
- `artifacts/gxeon-dashboard/src/services/brokerService.ts` uses the shared API helper, classifies fallback failures, preserves safe fallback, and keeps Broker P0 preview-only.
- `artifacts/gxeon-dashboard/src/services/homeCenterAgentsService.ts` and `artifacts/gxeon-dashboard/src/services/taskQueueService.ts` use the shared API helper for consistent dashboard-to-API resolution.
- `artifacts/gxeon-dashboard/src/pages/BrokerPage.tsx` shows a safe fallback diagnostic with API base, attempted route, and failure type when the backend is unavailable.
- `artifacts/gxeon-dashboard/vite.config.ts` defaults dashboard dev to port `5173` and proxies local `/api` calls to `http://localhost:3000` unless overridden by `VITE_GXEON_API_PROXY_TARGET`.
- `docs/broker/GXEON_BROKER_RUNTIME_WIRING.md` documents local and deployment wiring.

## Local API validation results

Validated with API server on `PORT=3000`:

- `GET /api/broker/status` returned `BROKER_P0_READY`, `PREVIEW_ONLY`, `registryAgentsAvailable: 8`, `quantumAdvisoryAvailable: true`, `approvalRequired: true`, and `executionDisabled: true`.
- `POST /api/broker/preview-route` returned a `decisionId`, recommended agents, risk energy, approval gates, `approvalRequired: true`, and `executionDisabled: true`.
- `GET /api/agents/home-center/status` returned `HOME_CENTER_AGENTS_READY`.
- `GET /api/agents/home-center/quantum/status` returned `QUANTUM_INSPIRED_ADVISORY_READY`.
- `GET /api/tasks/status` returned `P1_TASK_QUEUE_READY`.

## Dashboard-to-API wiring validation

- Production/preview dashboard builds now share API base behavior across Broker, Home Center Agent, and P1 Task Queue services.
- Local dashboard dev starts on `http://localhost:5173` while API remains on `http://localhost:3000`.
- `curl http://localhost:5173/api/broker/status` validated the local Vite dev proxy returns real Broker API JSON.
- When `VITE_GXEON_API_BASE_URL=http://localhost:3000`, dashboard runtime can call the API server directly.

## Deployment/env configuration notes

For a static Vercel dashboard that is separate from the Express API server, set this Vercel environment variable in Preview and Production and redeploy:

```text
VITE_GXEON_API_BASE_URL=https://<live-api-public-origin>
```

Leave it unset only when the deployment has a real same-origin `/api/*` proxy to the Express API server before the SPA fallback rewrite.

## Safety confirmation

No execution center, autonomous execution, install endpoint, agent execution endpoint, email sending, GitHub write, payment provider, checkout, credential form, token storage, database persistence, or external-contact behavior was added. Broker remains preview-only with `approvalRequired: true` and `executionDisabled: true` in both ready and fallback paths.

## Rollback plan

Revert this commit to restore previous dashboard service-local API URL handling and Vite dev port behavior. If rollback is needed only for deployment configuration, remove or update `VITE_GXEON_API_BASE_URL` in the hosting environment and redeploy without changing runtime code.
