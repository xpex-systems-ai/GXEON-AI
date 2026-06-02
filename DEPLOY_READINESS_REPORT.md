# GXEON Deploy Readiness Report

Generated: 2026-06-02T02:46:51.624Z

## GitHub Pages

- Candidate: `artifacts/gxeon-dashboard`.
- Build command: `npm run pages:build`.
- Output directory: `artifacts/gxeon-dashboard/dist/public`.
- SPA routing: READY via generated `404.html` fallback copied from `index.html`.
- Base path: dynamic through `BASE_PATH`; GitHub Actions computes the repository-name base path automatically.

## Must Remain on Railway or Equivalent Runtime

- `artifacts/api-server`: Express/API server requires Node process hosting.
- Runtime payment/provider/database scripts: require server-side secrets and must not be deployed to GitHub Pages.
- Supabase and Mercado Pago integrations: intentionally not connected by this mission.

## Executive Answers

- Production-ready modules: dashboard static frontend, API build artifact, workspace libraries.
- Technical debt: runtime services still need hosted environment validation outside GitHub Pages.
- Dependency risk: Expo, Supabase, database, and payment packages are runtime-sensitive and must remain isolated from static deploy.
- GitHub Pages migration candidates: Vite dashboard only.
- Railway-required services: API server, database-backed runtime, financial/webhook providers.
