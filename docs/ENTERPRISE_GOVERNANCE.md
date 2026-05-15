# GXEON Enterprise Governance

## Branch strategy

- `main`: stable production only. Direct commits are blocked by policy and must be protected in GitHub branch settings.
- `develop`: integration branch for validated runtime changes.
- `feature/*`: isolated feature work branched from `develop`.
- `hotfix/*`: emergency fixes branched from `main`, then back-merged into `develop`.

## Merge rules

1. No unresolved conflict markers may exist in tracked text files.
2. `package.json` and `package-lock.json` root dependency declarations must match.
3. Node runtime is pinned to Node 22 through `package.json`, `.nvmrc`, and CI workflows.
4. Pull requests into `main` or `develop` must pass the enterprise validation workflow.
5. `package-lock.json` is authoritative. Regenerate it only from the repo root with npm 10+ on Node 22.

## Deployment flow

1. Open `feature/*` or `hotfix/*` branch.
2. Run `npm run validate:enterprise`.
3. Merge through pull request after CI passes.
4. Deploy from `main` after `/api/v1/enterprise/deployment` reports `readiness_gate` as pass or documented warning.
5. Generate rollback metadata with `npm run recovery:report` before production changes.

## Runtime gates

The enterprise gate validates syntax, runtime health, providers, swarm, watchdog, monetization, Supabase health surface, build integrity, dependency integrity, merge health, and runtime compatibility.

## Recovery

Run `npm run recovery:report` to generate a structured report under `reports/recovery/`. The report includes branch status, merge health, dependency health, CI/CD status, runtime compatibility, and deployment metadata.
