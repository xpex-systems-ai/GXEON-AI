# GXEON OS Environment Policy

Status: Active policy. Scope: local development, preview deploys, CI, docs, and future production integrations.

## Core rule

Never commit real environment values, private URLs, tokens, database URLs, service role keys, payment credentials, customer data, or screenshots that expose secrets.

## Local placeholder example

Use ignored local files such as `.env.local` and placeholders only in documentation:

```env
NODE_ENV=development
PORT=3000
SUPABASE_URL=placeholder_project_url
SUPABASE_ANON_KEY=placeholder_anon_key
GXEON_AUDIT_DB_PROVIDER=supabase_rest
GXEON_AUDIT_WRITE_MODE=preview_only
GXEON_AUDIT_ALLOW_DB_WRITES=false
GXEON_AUDIT_OPERATOR_TOKEN=placeholder_operator_token
GXEON_AUDIT_MISSION_RUNNER_TOKEN=placeholder_runner_token
```

## Handling rules

- Store real values only in approved secret managers or local ignored files.
- Do not paste secrets into issues, pull requests, READMEs, demos, screenshots, or launch assets.
- Do not place privileged keys in frontend code.
- Rotate any value that is accidentally exposed.
- Keep connector writes disabled unless a mission explicitly approves scope, environment, and rollback plan.
- Keep public launch content free of private deployment URLs and customer data.
