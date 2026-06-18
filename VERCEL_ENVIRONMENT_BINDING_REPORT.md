# Vercel Environment Binding Report

## Required public variable
Set this in the Vercel dashboard project environment for the deployed dashboard:

```bash
VITE_GXEON_API_BASE_URL=https://gxeon-api-server-production.up.railway.app
```

## Safety notes
- `VITE_*` values are public and are embedded into browser JavaScript.
- Do not add Supabase service-role keys, database URLs, Railway tokens, GitHub tokens, or payment provider secrets to frontend variables.
- The dashboard now keeps same-origin fallback behavior and exposes diagnostics instead of throwing `BACKEND_URL_MISCONFIGURED` during URL construction.

## Runtime diagnostics
`getApiBaseDiagnostics()` reports whether the API base URL is configured, the effective mode (`configured-origin` or `same-origin`), and a `BACKEND_URL_MISCONFIGURED` warning code when missing.

## Manual operator action
After setting the variable, redeploy the dashboard so Vite can embed the public API origin.
