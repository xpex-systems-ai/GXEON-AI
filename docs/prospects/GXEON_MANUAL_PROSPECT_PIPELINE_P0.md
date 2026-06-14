# GXEON Manual Prospect Pipeline P0

Manual Prospect Pipeline P0 is an operator-provided-only client-intake layer for the R$100 sprint. It lets the operator register a known prospect label, classify need, budget, urgency and relationship strength, then create copy-only Client Offer and Manual Payment previews.

## Flow
1. Manual Prospect Intake: operator types a label and context note manually.
2. Need Classification: operator chooses a need type; GXEON scores only the typed fields.
3. Offer Match: GXEON suggests a manual offer type and next manual action.
4. Client Offer Pack: preview creates copy-only text; GXEON does not send.
5. Manual Follow-up Status: operator updates sent, waiting, interested, accepted, declined or archived states.
6. Manual Payment Request: preview creates payment copy only; no payment provider API is called.
7. Ledger Preview: shows expected amount and real revenue as zero until external operator confirmation outside P0.

## API contracts
- `GET /api/manual-prospects/status`
- `GET /api/manual-prospects/prospects`
- `GET /api/manual-prospects/prospects/:id`
- `POST /api/manual-prospects/prospects`
- `PATCH /api/manual-prospects/prospects/:id/state`
- `POST /api/manual-prospects/prospects/:id/link-offer-pack`
- `POST /api/manual-prospects/prospects/:id/create-offer-pack-preview`
- `POST /api/manual-prospects/prospects/:id/create-manual-payment-preview`
- `POST /api/manual-prospects/prospects/:id/follow-up-preview`
- `POST /api/manual-prospects/prospects/:id/ledger-preview`

Every response includes `autoSendDisabled: true`, `externalContactDisabled: true`, `paymentProviderDisabled: true`, `realRevenueClaimed: false`, and `persistence: IN_MEMORY_P0`.

## Manual test flow
Open `/ops/prospects`, create `Contato quente R$100`, choose `WHATSAPP_MANUAL`, `AI_AUDIT`, budget `100`, create an offer preview, copy externally by hand, return and mark sent/waiting, create follow-up and payment previews, and confirm no external send/payment action occurs.

## Rollback plan
Remove the manual prospect route mount, prospect domain folder, dashboard page/service/component, sidebar route, and this documentation. Since storage is in-memory P0 only, rollback has no database migration.
