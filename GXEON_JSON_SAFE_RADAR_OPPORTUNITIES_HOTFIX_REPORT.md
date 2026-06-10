# GXEON JSON-Safe Radar X and Opportunities Hotfix Report

## Mission
GXEON_FRONTEND_BACKEND_JSON_SAFETY_HOTFIX v1.0

## Summary
- Hardened Radar X frontend API parsing so responses are read as text first, empty bodies are reported with route/status context, non-JSON responses surface `BACKEND_NON_JSON_RESPONSE`, and malformed JSON no longer produces browser `Unexpected end of JSON input` errors.
- Hardened Opportunity Inbox frontend API parsing with the same JSON-safe behavior and route-aware `REQUEST_FAILED` diagnostics.
- Added explicit Vercel preview backend URL diagnostics: when `VITE_GXEON_API_BASE_URL` is empty on a `.vercel.app` host, calls fail with `BACKEND_URL_MISCONFIGURED: Set VITE_GXEON_API_BASE_URL to Railway API public URL and redeploy Vercel`.
- Wrapped Radar X and Opportunity backend route handlers with JSON-safe error responses where missing, preserving `no-store` headers and preview/manual-first behavior.

## Changed Files
- `artifacts/gxeon-dashboard/src/services/radarService.ts`
- `artifacts/gxeon-dashboard/src/services/opportunityService.ts`
- `artifacts/api-server/src/routes/radar.ts`
- `artifacts/api-server/src/routes/opportunities.ts`
- `GXEON_JSON_SAFE_RADAR_OPPORTUNITIES_HOTFIX_REPORT.md`

## Validation
- `pnpm --filter @workspace/api-server run build` passed.
- `pnpm --filter @workspace/gxeon-dashboard run build` passed with existing sourcemap/chunk-size warnings.
- `git diff --check` passed.
- `PORT=3000 pnpm --filter @workspace/api-server run start` started successfully on port 3000.
- Opportunity status/list and Radar GitHub status curls returned JSON bodies.
- Radar GitHub search preview returned a JSON-safe `NETWORK_ERROR` body instead of an empty/non-JSON response when GitHub REST API was unavailable from the environment.
