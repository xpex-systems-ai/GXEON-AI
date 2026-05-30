# GXEON Supabase Production Binding

This directory binds the repo to the Supabase project reference `telxvphgrsvsnxvmjkce` without committing secrets.

## Non-secret project metadata

- Project URL: `https://telxvphgrsvsnxvmjkce.supabase.co`
- Project ref: `telxvphgrsvsnxvmjkce`

## Required secret configuration

Set these in Railway/Replit/CI secret storage, not in git:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` with the real database password substituted for `[YOUR-PASSWORD]`

The runtime also accepts the backend aliases above and derives web/mobile Supabase readiness from them during production activation validation.

## CLI commands

```bash
supabase login
supabase init
supabase link --project-ref telxvphgrsvsnxvmjkce
```

Do not commit `.env`, access tokens, service role keys, database passwords, or CLI auth tokens.
