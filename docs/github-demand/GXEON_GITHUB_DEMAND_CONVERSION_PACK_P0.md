# GXEON GitHub Demand Conversion Pack P0

GitHub Demand Conversion Pack P0 converts an in-memory GitHub Demand pipeline preview into a readable, manual-first commercial pack. It produces PT-BR and EN-US copy, diagnosis, offer title, suggested BRL/USD tiers, scope boundaries, technical plan, evidence checklist, delivery checklist, risk warnings, ledger preview and Brain Revenue Sprint recommendation.

## API contracts

- `POST /api/github-demand/pipeline-previews/:id/conversion-pack` creates or returns an in-memory conversion pack.
- `GET /api/github-demand/conversion-packs` lists packs.
- `GET /api/github-demand/conversion-packs/:id` reads one pack.
- `POST /api/github-demand/conversion-packs/:id/create-opportunity-preview` returns an internal opportunity preview; records are created only with `operatorConfirmed: true`.
- `POST /api/github-demand/conversion-packs/:id/create-task-preview` returns a task preview only.
- `POST /api/github-demand/conversion-packs/:id/brain-revenue-sprint-preview` returns a Brain Sprint preview only.

Every response preserves `PREVIEW_ONLY`, `manualReviewRequired`, `githubWriteDisabled`, `externalContactDisabled`, and `rewardNotGuaranteed`.

## Price suggestion logic

- Low-complexity docs/profile/template: R$50-R$100.
- Repo audit/debug: R$100-R$250.
- Deploy or CI rescue: R$150-R$450.
- Agent/MCP integration or connector: R$250-R$900.
- Explicit bounty: use the bounty amount only after manual verification; otherwise use a service fallback and do not claim value.

## Validation commands

Run API and dashboard builds, `git diff --check`, route curl checks, and safety regex scans for GitHub write, auto-contact, payment provider and secret persistence patterns.

## Next stage

After merge, the next stage is GitHub Demand Execution/Submission Pack P0 for operator-approved manual submission preparation.
