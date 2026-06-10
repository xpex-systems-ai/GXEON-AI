# GXEON JSON-safe Radar X and Opportunities hotfix report

## Scope

This hotfix hardens the Radar X and Opportunity Inbox frontend/backend boundary so API failures produce explicit JSON-safe diagnostics instead of triggering `Unexpected end of JSON input` in preview deployments.

## Frontend changes

- `artifacts/gxeon-dashboard/src/services/radarService.ts`
  - Normalizes `VITE_GXEON_API_BASE_URL` by trimming whitespace and removing trailing slashes.
  - Detects Vercel `.vercel.app` hosts with an empty API base URL and throws `BACKEND_URL_MISCONFIGURED` with the deployment instruction: `Set VITE_GXEON_API_BASE_URL to Railway API public URL and redeploy Vercel`.
  - Replaces blind `response.json()` parsing with a `readJson` helper that safely reads text first, detects empty response bodies, rejects non-JSON responses with `BACKEND_NON_JSON_RESPONSE`, handles invalid JSON, and includes the route path in thrown errors.
  - Preserves successful `{ success: true, data }` payload behavior.

- `artifacts/gxeon-dashboard/src/services/opportunityService.ts`
  - Applies the same API base URL normalization and Vercel preview misconfiguration diagnostic.
  - Replaces blind `response.json()` parsing with the same safe `readJson` pattern.
  - Standardizes failed API responses as `REQUEST_FAILED_<status>` messages that include the backend message and route path.

## Backend changes

- `artifacts/api-server/src/routes/radar.ts`
  - Adds no-store cache headers for Radar routes.
  - Wraps Radar route handlers in safe JSON error handling.
  - Ensures validation, upstream, and not-found failures return JSON bodies.

- `artifacts/api-server/src/routes/opportunities.ts`
  - Adds no-store cache headers for Opportunity routes.
  - Wraps Opportunity route handlers in safe JSON error handling.
  - Ensures 400, 404, and 500-class failures return JSON bodies and never intentionally send empty responses.

## Safety constraints preserved

- Radar X remains preview-only.
- Opportunity Inbox remains manual-first.
- No autonomous agents, external outreach, checkout sessions, payment capture, external repository writes, or secret exposure were added.

## Validation performed

- `pnpm --filter @workspace/api-server run build` passed.
- `pnpm --filter @workspace/gxeon-dashboard run build` passed with existing Vite sourcemap/chunk-size warnings.
- `git diff --check` passed.
- `PORT=3000 pnpm --filter @workspace/api-server run start` started successfully on port 3000 and was stopped after curl validation.
- `curl -s http://localhost:3000/api/opportunities/status` returned a JSON success body.
- `curl -s http://localhost:3000/api/opportunities` returned a JSON success body.
- `curl -s http://localhost:3000/api/radar/github/status` returned a JSON success body.
- `curl -s -X POST http://localhost:3000/api/radar/github/search-preview -H "Content-Type: application/json" -d "{\"query\":\"label:\\\"help wanted\\\" railway deploy\",\"limit\":3}"` returned a JSON error body when the environment could not reach GitHub REST API.
