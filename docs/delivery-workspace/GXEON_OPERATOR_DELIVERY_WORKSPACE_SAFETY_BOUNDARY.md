# Operator Delivery Workspace Safety Boundary

All workspace records are `IN_MEMORY_P0`. Every payload preserves `PREVIEW_ONLY`, `COPY_ONLY`, `manualReviewRequired`, `githubWriteDisabled`, `externalContactDisabled`, `paymentProviderDisabled`, `rewardNotGuaranteed`, `runtimeExecutionDisabled`, `noRepoClone`, and `noExternalCodeExecution`.

The workspace does not comment on GitHub issues, open pull requests, contact maintainers/clients, send email/chat messages, create Mercado Pago links, call payment providers, mark revenue as received, clone repositories, execute candidate code, persist records in a production database, or add workers/schedulers.
