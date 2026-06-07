# GXEON Private Security Checklist

Use this checklist before operating GXEON as a private QG command center or before enabling any controlled integration.

## Repository privacy

- [ ] Confirm GitHub repository visibility is set to **Private**.
- [ ] Enable branch protection for the main branch before multi-operator work.
- [ ] Require pull request review or operator review before merging sensitive operational changes.
- [ ] Review GitHub issues, PR comments, attached screenshots, recordings, and logs for sensitive data before sharing.

## Secret handling

- [ ] Keep secrets only in provider dashboards, local ignored files, or approved secret managers.
- [ ] Do not commit `.env`, `.env.local`, `.env.production`, copied terminal exports, private keys, service credentials, or API tokens.
- [ ] Do not paste real secrets into Codex, GitHub issues, PR descriptions, docs, screenshots, or logs.
- [ ] If a secret is exposed, rotate it immediately in the provider dashboard and record only the rotation action, not the value.

## Vercel environment separation

- [ ] Keep development, preview, and production variables separated.
- [ ] Only expose browser-safe variables with the expected public prefix.
- [ ] Never place server-only secrets in frontend-accessible variables.
- [ ] Verify deployment logs do not print sensitive environment values.

## Supabase boundaries

- [ ] Never expose the Supabase service-role key to the frontend.
- [ ] Store Supabase service-role credentials only in trusted server-side provider dashboards.
- [ ] Do not run migrations, schema pushes, or production database mutations without a separate approved database mission.
- [ ] Confirm row-level security and least-privilege access before any production activation.

## Railway boundaries

- [ ] Store Railway variables only in the Railway dashboard.
- [ ] Do not commit Railway tokens, database URLs, service URLs with credentials, or generated connection strings.
- [ ] Do not provision, deploy, or mutate Railway services during documentation-only work.
- [ ] Review Railway build/deploy logs for accidental secret output before sharing them.

## Payment and external API boundaries

- [ ] Keep payment provider secret keys and webhook secrets only in provider dashboards.
- [ ] Use test keys only in local ignored files when needed, and never commit them.
- [ ] Do not claim live payment/API activation until test evidence and production approval are documented.
- [ ] Redact customer, payment, invoice, and account identifiers from repository artifacts unless explicitly approved.

## Operational review

- [ ] Run a repository secret scan before release or handoff.
- [ ] Run dashboard typecheck/build before relying on dashboard changes.
- [ ] Confirm `/ops/opportunities`, `/ops/tasks`, `/ops/execution`, `/ops/validation`, `/ops/release`, and `/ops/ledger` remain intact.
