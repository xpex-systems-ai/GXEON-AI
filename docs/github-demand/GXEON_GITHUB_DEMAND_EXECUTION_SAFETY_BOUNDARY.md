# GitHub Demand Execution Safety Boundary

The execution layer is manual-first and preview-only. It prepares internal drafts for operator review and does not perform external delivery.

## Disabled capabilities

- No GitHub write, comment or pull request.
- No external contact automation, email, WhatsApp or SMS.
- No Mercado Pago/payment provider API call.
- No bounty/reward claim.
- No revenue received marking.
- No repository clone or external code execution.
- No production database persistence.
- No workers or schedulers.

## Required flags

Every execution pack includes `mode: PREVIEW_ONLY`, `manualReviewRequired: true`, `githubWriteDisabled: true`, `externalContactDisabled: true`, `paymentProviderDisabled: true`, `rewardNotGuaranteed: true` and `runtimeExecutionDisabled: true`.
