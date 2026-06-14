# Web3 Task to Task Queue Safety Boundary

The linking layer is preview-only and in-memory. It does not persist to a production database and does not create workers or schedulers.

## Disabled actions
- No wallet connection
- No seed phrase or private-key handling
- No message signing or blockchain transaction
- No reward claim
- No external task submission
- No account creation, captcha bypass, multi-account behavior, spam, or customer contact
- No GitHub issue, comment, PR, or commit from runtime app code
- No checkout session, payment provider call, invoice, or real revenue mark

## Required safety flags
Every opportunity/task preview includes `mode: PREVIEW_ONLY`, `manualExecutionRequired: true`, `externalSubmissionDisabled: true`, `walletConnectionRequired: false`, `rewardNotGuaranteed: true`, and `operatorApprovalRequired: true`.

## Rollback plan
Revert the Web3 pipeline files and route additions. Existing Web3 Task Radar imports remain independent because links are stored in a separate in-memory store.
