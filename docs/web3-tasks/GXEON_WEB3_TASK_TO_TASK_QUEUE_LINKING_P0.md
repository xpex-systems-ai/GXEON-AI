# GXEON Web3 Task to Task Queue Linking P0

This P0 release links Web3 Task Radar previews to a safe internal monetization pipeline without performing external automation.

## Flow
Manual Web3 import → Web3 scoring → qualified preview → internal Opportunity preview → Task Queue preview → Broker preparation preview.

## Qualification rules
A Web3 task qualifies only when:
- opportunityScore >= 70
- riskScore <= 45
- no critical risk flags are present

Critical flags are `SEED_PHRASE_RISK`, `UPFRONT_FEE_REQUIRED`, `UNKNOWN_SIGNATURE_REQUEST`, `MULTI_ACCOUNT_RISK`, and `SPAM_BEHAVIOR`.

## API contracts
- `POST /api/web3-tasks/previews/:id/create-internal-task-preview` creates an in-memory pipeline link.
- `GET /api/web3-tasks/pipeline-links` lists preview links.
- `GET /api/web3-tasks/pipeline-links/:id` reads one link.
- `POST /api/web3-tasks/pipeline-links/:id/prepare-broker-preview` creates a broker preparation object only.

All generated records include `mode: PREVIEW_ONLY`, `manualExecutionRequired: true`, `externalSubmissionDisabled: true`, `walletConnectionRequired: false`, `rewardNotGuaranteed: true`, and `operatorApprovalRequired: true`.

## Urgent monetization usage
Operators should prioritize clear payout tasks worth at least US$20 or R$100, short deadlines, low risk, and AI-assisted deliverables. GXEON prepares evidence and task previews; the operator must manually review all external rules outside GXEON.

## Next stage
Submission Pack Generator P0 should create manual submission text, evidence checklist, and delivery package from a qualified Web3 pipeline link while preserving the no-external-execution boundary.
