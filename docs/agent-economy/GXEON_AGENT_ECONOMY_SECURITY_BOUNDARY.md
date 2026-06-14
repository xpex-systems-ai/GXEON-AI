# Agent Economy Security Boundary

P0 is `PREVIEW_ONLY`. Every integration candidate includes `manualApprovalRequired`, `installDisabled`, `executionDisabled`, `secretStorageDisabled`, `externalApiCallsDisabled` and `monetizationNotGuaranteed` set to true.

The module does not install third-party code, execute repository scripts, clone arbitrary repositories at runtime, store provider secrets, scrape platforms, call paid APIs, mutate production databases, write to GitHub, create payments, schedule workers or contact maintainers.

Risk flags include unknown license, no maintenance signal, shell execution, curl-bash install, secret/token requirement, private key requirement, browser-control risk, GitHub write risk, payment action risk, database write risk, unknown owner, unsafe install script, prompt-injection surface, tool-poisoning risk and external API cost risk.
