# GXEON Web3 Task Radar P0

Web3 Task Radar P0 is a safe, manual-first preview layer for public Web3, bounty, quest, grant, audit, community and microtask opportunities.

## Role

- Maintain a static source registry for Superteam Earn, Zealy, Galxe, Layer3, Gitcoin and Manual Import.
- Allow the operator to paste public task links and metadata.
- Score opportunities deterministically for urgency, reward clarity, difficulty, evidence burden and risk.
- Create internal previews only with `mode: PREVIEW_ONLY`.

## API contracts

- `GET /api/web3-tasks/status`
- `GET /api/web3-tasks/sources`
- `GET /api/web3-tasks/previews`
- `GET /api/web3-tasks/previews/:id`
- `POST /api/web3-tasks/manual-import`
- `POST /api/web3-tasks/previews/:id/create-internal-task-preview`

Every task preview includes `manualExecutionRequired: true`, `walletConnectionRequired: false`, `externalSubmissionDisabled: true`, `rewardNotGuaranteed: true` and `operatorApprovalRequired: true`.

## Operator flow

1. Open `/ops/web3-tasks`.
2. Review source cards.
3. Paste a public task link and metadata.
4. Review opportunity score, risk score, evidence checklist and blocked actions.
5. Manually decide whether to prepare a deliverable outside the runtime.

## Future stage

A future stage may add read-only platform connectors if explicitly allowed. The P0 release does not scrape, log in, create accounts, connect wallets, submit work, claim rewards or persist database records.
