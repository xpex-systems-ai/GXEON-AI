# GXEON Broker P0 Runtime Wiring

## Runtime contract

Broker P0 is preview-only. The dashboard must read the API server for status and route previews, but the UI must keep `approvalRequired: true` and `executionDisabled: true` and must not expose install, execute, external-contact, GitHub-write, or payment actions.

Required JSON endpoints from the API server:

- `GET /api/broker/status` returns `success: true` with `data.status: "BROKER_P0_READY"`, `mode: "PREVIEW_ONLY"`, `registryAgentsAvailable > 0`, `quantumAdvisoryAvailable: true`, `approvalRequired: true`, and `executionDisabled: true`.
- `POST /api/broker/preview-route` returns `success: true` with `data.decisionId`, `recommendedAgents`, `riskEnergy`, `approvalGates`, `approvalRequired: true`, and `executionDisabled: true`.
- `GET /api/agents/home-center/status` returns the Home Center Agent registry readiness JSON.
- `GET /api/agents/home-center/quantum/status` returns the classical quantum-inspired advisory readiness JSON.
- `GET /api/tasks/status` returns the P1 task queue readiness JSON.

## Dashboard API base resolution

The dashboard resolves API URLs through `VITE_GXEON_API_BASE_URL`:

1. If `VITE_GXEON_API_BASE_URL` is set, the dashboard calls that origin plus the `/api/...` path.
2. If it is not set, the dashboard preserves same-origin `/api/...` calls for local monolith/proxy deployments.
3. On `*.vercel.app` without `VITE_GXEON_API_BASE_URL`, Broker and shared P1 services surface a safe misconfiguration diagnostic instead of silently treating the Vercel SPA HTML fallback as an API response.

Do not store tokens in frontend storage and do not put credentials in `VITE_GXEON_API_BASE_URL`; it must be only the public API origin, for example `https://<api-service-domain>`.

## Local development

Run the API server and dashboard on separate ports:

```bash
pnpm --filter @workspace/api-server run build
PORT=3000 pnpm --filter @workspace/api-server run start
VITE_GXEON_API_BASE_URL=http://localhost:3000 pnpm --filter @workspace/gxeon-dashboard run dev
```

The dashboard dev server defaults to port `5173` so it can run beside the API server on port `3000`. If `VITE_GXEON_API_BASE_URL` is omitted locally, Vite proxies `/api` to `VITE_GXEON_API_PROXY_TARGET` or `http://localhost:3000` by default.

## Vercel deployment notes

The repository-level Vercel config builds the static dashboard and rewrites all paths to `/index.html`. That is correct for the SPA, but it does not host the Express API. When the dashboard is deployed separately from the API server, configure these Vercel environment variables for Preview and Production before redeploying:

```text
VITE_GXEON_API_BASE_URL=https://<live-api-public-origin>
```

Alternative deployment option: keep `VITE_GXEON_API_BASE_URL` unset only if the hosting layer has a real same-origin `/api/*` rewrite/proxy to the Express API server before the SPA fallback rewrite.

## Failure behavior

When the backend is unreachable or misconfigured, Broker P0 must remain in safe fallback mode:

- `status: "BROKER_P0_FALLBACK"`
- `mode: "PREVIEW_ONLY"`
- `approvalRequired: true`
- `executionDisabled: true`
- no install, execution, external contact, GitHub write, or payment behavior
- a non-secret diagnostic showing the attempted API base, route, and failure class
