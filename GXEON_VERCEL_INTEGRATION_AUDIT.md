# GXEON Vercel Integration Audit

**Mission:** GXEON_VERCEL_INTEGRATION_AUDIT  
**Mode:** DIAGNOSTIC_ONLY  
**Date:** 2026-06-06  
**Status:** READY

## Safety boundaries confirmed

- No application code was modified.
- No database commands, migrations, or Supabase mutations were run.
- No secrets were printed or requested.
- No Vercel project was created.
- No manual production deployment was triggered.
- This audit only validates repository configuration for GitHub-driven Vercel preview deployments.

## Executive summary

The repository is configured for Vercel preview deployments of the GXEON dashboard from GitHub. The root `vercel.json` declares Vite, uses pnpm with a frozen lockfile, injects the required dashboard runtime build variables, points to the dashboard Vite output directory, and rewrites SPA routes to `index.html`.

The frontend Supabase policy is clear: future browser-side Supabase access should use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The frontend must not require or expose `SUPABASE_SERVICE_ROLE_KEY`.

## Check results

| Check | Result | Evidence |
|---|---:|---|
| `vercel.json` exists at repository root | PASS | `vercel.json` |
| Framework is Vite | PASS | `"framework": "vite"` |
| Install command uses pnpm frozen lockfile | PASS | `"installCommand": "pnpm install --frozen-lockfile"` |
| Build command injects `PORT=3000` and `BASE_PATH=/` | PASS | `"buildCommand": "PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build"` |
| Output directory is dashboard Vite output | PASS | `"outputDirectory": "artifacts/gxeon-dashboard/dist/public"` |
| SPA rewrite exists | PASS | `/(.*)` rewrites to `/index.html` |
| Dashboard package has build script | PASS | `"build": "vite build --config vite.config.ts"` |
| Dashboard Vite config requires `PORT` | PASS | `process.env.PORT` is required and validated |
| Dashboard Vite config requires `BASE_PATH` | PASS | `process.env.BASE_PATH` is required and used as Vite `base` |
| Vite build output matches Vercel output directory | PASS | Vite `outDir` resolves to `dist/public` under `artifacts/gxeon-dashboard` |
| Frontend Supabase env names identified | PASS | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Frontend service-role key requirement | PASS | No runtime frontend code reads `SUPABASE_SERVICE_ROLE_KEY`; do not configure it for browser exposure |

## Root Vercel configuration

The current root Vercel configuration is preview-ready:

```json
{
  "framework": "vite",
  "installCommand": "pnpm install --frozen-lockfile",
  "buildCommand": "PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build",
  "outputDirectory": "artifacts/gxeon-dashboard/dist/public"
}
```

The SPA rewrite is also present, so direct route access such as `/radar-x`, `/settings`, or `/placeholder/task_engine/workflow-queue` should be served by the dashboard app rather than returning a static-hosting 404.

## Dashboard build configuration

The dashboard package exposes:

```json
{
  "build": "vite build --config vite.config.ts"
}
```

The dashboard Vite config requires:

- `PORT` — required, numeric, positive.
- `BASE_PATH` — required and used as Vite `base`.

The Vercel build command already sets both values:

```bash
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build
```

## Future Supabase frontend environment policy

When the operator is ready to connect browser-side Supabase reads, configure only these frontend-safe Vercel variables:

| Variable | Required for future frontend Supabase? | Secret policy |
|---|---:|---|
| `VITE_SUPABASE_URL` | Yes | Public project URL; safe for frontend |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key; safe for frontend when RLS is correct |
| `VITE_API_BASE` | Optional | Public API base URL if frontend calls an API server |

Do **not** configure these in Vercel frontend environment variables:

| Variable | Reason |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key; never expose to browser bundles |
| `DIRECT_URL` | Database connection URL; server-only |
| `DATABASE_URL` | Database connection URL; server-only |

### Note about visual deployment data

Some dashboard visual/deploy-engine data files mention provider/server environment names as labels for operator education. This audit found no evidence that the browser runtime requires `SUPABASE_SERVICE_ROLE_KEY` through `import.meta.env` or direct Supabase client initialization. The operator must still avoid adding service-role secrets to Vercel frontend variables.

## Vercel setup checklist for operator

1. In Vercel, import the GitHub repository.
2. Confirm Vercel detects/uses the root `vercel.json`.
3. Confirm framework preset is **Vite**.
4. Confirm install command is:
   ```bash
   pnpm install --frozen-lockfile
   ```
5. Confirm build command is:
   ```bash
   PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build
   ```
6. Confirm output directory is:
   ```text
   artifacts/gxeon-dashboard/dist/public
   ```
7. For preview deployments, leave production deploy manual/controlled by branch policy.
8. Do not add `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or `DIRECT_URL` to frontend Vercel environment variables.
9. When Supabase frontend preview is explicitly approved, add only:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
10. Open the Vercel preview URL generated by GitHub pull requests and verify the SPA routes load.

## Final assessment

**READY** — repository configuration is ready for automatic Vercel preview deployment from GitHub, assuming the Vercel project is linked to the repository and uses the committed root `vercel.json`. No manual production deployment is required for this preview flow.
