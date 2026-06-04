# BACKEND ROUTE MAP — GXEON API SERVER

- **Base path:** `/api`
- **Router composition:** health, governance, conversion, phase8, runtime and financial routers are all mounted by `artifacts/api-server/src/routes/index.ts`.
- **Auth legend:** `OPEN` = no route-level auth; `GOVERNANCE_TOKEN` = governance middleware; `FINANCIAL_MUTATION` = financial auth + scope + rate limit + idempotency where configured.

## Health

| Method | Full path | Source | Auth | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/api/healthz` | `routes/health.ts:6` | OPEN | Railway/API healthcheck |

## Governance

All `/api/v1/governance/**` routes pass through `governanceAuth`.

| Method | Full path | Source | Auth | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/governance/merge` | `routes/governance.ts:21` | GOVERNANCE_TOKEN | Merge governance snapshot |
| GET | `/api/v1/governance/branches` | `routes/governance.ts:49` | GOVERNANCE_TOKEN | Branch overview |
| GET | `/api/v1/governance/deployments` | `routes/governance.ts:83` | GOVERNANCE_TOKEN | Deployment status |
| GET | `/api/v1/governance/conflicts` | `routes/governance.ts:114` | GOVERNANCE_TOKEN | Conflict detection report |
| GET | `/api/v1/governance/recovery` | `routes/governance.ts:153` | GOVERNANCE_TOKEN | Recovery strategy |
| GET | `/api/v1/governance/runtime-sync` | `routes/governance.ts:184` | GOVERNANCE_TOKEN | Runtime sync status |
| POST | `/api/v1/governance/reports` | `routes/governance.ts:217` | GOVERNANCE_TOKEN | Governance report creation |

## Conversion and revenue intelligence

| Method | Full path | Source | Auth | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/conversion/funnels` | `routes/conversion.ts:94` | OPEN | Funnel metrics |
| GET | `/api/v1/conversion/leads` | `routes/conversion.ts:108` | OPEN | Lead list/filter |
| POST | `/api/v1/leads/capture` | `routes/conversion.ts:129` | OPEN | Lead capture |
| GET | `/api/v1/conversion/telemetry` | `routes/conversion.ts:147` | OPEN | Conversion telemetry |
| GET | `/api/v1/conversion/forecast` | `routes/conversion.ts:167` | OPEN | Revenue forecast |
| GET | `/api/v1/conversion/opportunities` | `routes/conversion.ts:179` | OPEN | Opportunity list |
| GET | `/api/v1/conversion/runtime` | `routes/conversion.ts:200` | OPEN | Conversion runtime |
| GET | `/api/v1/revenue/live` | `routes/conversion.ts:224` | OPEN | Live revenue snapshot |

## Phase 8 observability/UI runtime

| Method | Full path | Source | Auth | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/observability/metrics` | `routes/phase8.ts:168` | OPEN | Observability metrics |
| GET | `/api/v1/revenue/forecast` | `routes/phase8.ts:186` | OPEN | Forecast data |
| GET | `/api/v1/telemetry/live` | `routes/phase8.ts:219` | OPEN | Live telemetry |
| POST | `/api/v1/mobile/runtime` | `routes/phase8.ts:248` | OPEN | Mobile runtime event intake |
| GET | `/api/v1/mobile/telemetry` | `routes/phase8.ts:264` | OPEN | Mobile telemetry |
| GET | `/api/v1/conversion/live` | `routes/phase8.ts:287` | OPEN | Live conversion data |
| GET | `/api/v1/growth/runtime` | `routes/phase8.ts:312` | OPEN | Growth runtime |
| GET | `/api/v1/runtime/production` | `routes/phase8.ts:335` and `routes/runtime.ts:115` | OPEN | Duplicate route; Phase8 may shadow runtime router because it mounts earlier |
| GET | `/api/v1/runtime/activation` | `routes/phase8.ts:356` | OPEN | Runtime activation |
| GET | `/api/v1/runtime/health` | `routes/phase8.ts:383` | OPEN | Runtime health |
| GET | `/api/v1/runtime/alerts` | `routes/phase8.ts:406` and `routes/runtime.ts:180` | OPEN | Duplicate route; Phase8 may shadow runtime router |
| GET | `/api/v1/reports` | `routes/phase8.ts:423` | OPEN | Reports list |

## Runtime, payments, workers and monetization

| Method | Full path | Source | Auth | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/runtime/sync` | `routes/runtime.ts:107` | OPEN | Runtime sync |
| GET | `/api/v1/runtime/recovery` | `routes/runtime.ts:111` | OPEN | Recovery status |
| GET | `/api/v1/runtime/database` | `routes/runtime.ts:119` | OPEN | DB health |
| GET | `/api/v1/runtime/deployment` | `routes/runtime.ts:128` | OPEN | Deployment integrity |
| GET | `/api/v1/runtime/snapshots` | `routes/runtime.ts:132` | OPEN | Runtime snapshots |
| GET | `/api/v1/runtime/railway` | `routes/runtime.ts:136` | OPEN | Railway runtime state |
| GET | `/api/v1/runtime/radar` | `routes/runtime.ts:140` | OPEN | Radar continuity |
| GET | `/api/v1/runtime/providers` | `routes/runtime.ts:144` | OPEN | Provider status |
| GET | `/api/v1/runtime/memory` | `routes/runtime.ts:148` | OPEN | Local/Supabase memory state |
| GET | `/api/v1/runtime/supabase` | `routes/runtime.ts:152` | OPEN | Supabase config/status |
| GET | `/api/v1/runtime/provider-logs` | `routes/runtime.ts:156` | OPEN | Sanitized provider logs |
| POST | `/api/v1/runtime/log-sanitize` | `routes/runtime.ts:163` | OPEN | Runtime log sanitization |
| GET | `/api/v1/runtime/railway-core` | `routes/runtime.ts:168` | OPEN | Railway core status |
| GET | `/api/v1/runtime/signals` | `routes/runtime.ts:172` | OPEN | Signal intelligence |
| GET | `/api/v1/runtime/conversion-dna` | `routes/runtime.ts:176` | OPEN | Conversion/monetization DNA |
| GET | `/api/v1/runtime/payments` | `routes/runtime.ts:184` | OPEN | Payments runtime |
| POST | `/api/v1/runtime/payments/create` | `routes/runtime.ts:192` | FINANCIAL_MUTATION | Create PIX payment |
| POST | `/api/v1/runtime/payments/auto` | `routes/runtime.ts:204` | FINANCIAL_MUTATION | Autonomous PIX run |
| POST | `/api/v1/webhooks/mercado-pago` | `routes/runtime.ts:216` | WEBHOOK_SIGNATURE | Mercado Pago webhook |
| GET | `/api/v1/runtime/monetization` | `routes/runtime.ts:239` | OPEN | Monetization DNA |
| GET | `/api/v1/runtime/revenue` | `routes/runtime.ts:243` | OPEN | Revenue telemetry |
| GET | `/api/v1/runtime/financial-core` | `routes/runtime.ts:247` | OPEN | Financial core status |
| GET | `/api/v1/runtime/monetization-audit` | `routes/runtime.ts:251` | OPEN | Monetization audit |
| GET | `/api/v1/runtime/credits` | `routes/runtime.ts:255` | FINANCIAL_MUTATION | Credit runtime |
| POST | `/api/v1/runtime/credits/wallet` | `routes/runtime.ts:259` | FINANCIAL_MUTATION | Upsert wallet |
| POST | `/api/v1/runtime/credits/transfer` | `routes/runtime.ts:271` | FINANCIAL_MUTATION | Transfer credits |
| GET | `/api/v1/runtime/commissions` | `routes/runtime.ts:284` | FINANCIAL_MUTATION | Commission runtime |
| POST | `/api/v1/runtime/commissions/settle` | `routes/runtime.ts:288` | FINANCIAL_MUTATION | Settle commission |
| GET | `/api/v1/runtime/autonomous-revenue` | `routes/runtime.ts:310` | FINANCIAL_MUTATION | Queue state |
| POST | `/api/v1/runtime/tasks/enqueue` | `routes/runtime.ts:314` | FINANCIAL_MUTATION | Enqueue monetized task |
| POST | `/api/v1/runtime/tasks/run-cycle` | `routes/runtime.ts:322` | FINANCIAL_MUTATION | Run scheduler cycle |
| POST | `/api/v1/runtime/credits/auto-topup` | `routes/runtime.ts:334` | FINANCIAL_MUTATION | PIX credit top-up |
| POST | `/api/v1/runtime/tasks/generate-from-radar` | `routes/runtime.ts:346` | FINANCIAL_MUTATION | Create sellable radar tasks |
| GET | `/api/v1/x-radar/metrics` | `routes/runtime.ts:354` | FINANCIAL_MUTATION | x-radar metrics |
| POST | `/api/v1/x-radar/signals/generate` | `routes/runtime.ts:358` | FINANCIAL_MUTATION | Generate paid signal |
| POST | `/api/v1/x-radar/signals/consume` | `routes/runtime.ts:366` | FINANCIAL_MUTATION | Consume premium signal |
| POST | `/api/v1/x-radar/scan-cycle` | `routes/runtime.ts:375` | FINANCIAL_MUTATION | Manual scan cycle |
| POST | `/api/v1/x-radar/revenue-cycle` | `routes/runtime.ts:383` | FINANCIAL_MUTATION | Manual revenue cycle |
| GET | `/api/v1/monetization/subscriptions/catalog` | `routes/runtime.ts:395` | FINANCIAL_MUTATION | Subscription catalog |
| POST | `/api/v1/monetization/subscriptions/subscribe` | `routes/runtime.ts:399` | FINANCIAL_MUTATION | Subscribe agent |
| POST | `/api/v1/runtime/pix/followups/process` | `routes/runtime.ts:411` | FINANCIAL_MUTATION | Process PIX followups |
| GET | `/api/v1/runtime/revenue-dashboard` | `routes/runtime.ts:419` | OPEN | Revenue dashboard metrics |
| GET | `/api/v1/revenue-engine/catalog` | `routes/runtime.ts:423` | OPEN | Revenue catalog |
| GET | `/api/v1/revenue-engine/analytics` | `routes/runtime.ts:427` | FINANCIAL_MUTATION | Revenue analytics |
| POST | `/api/v1/revenue-engine/checkout` | `routes/runtime.ts:431` | FINANCIAL_MUTATION | Create checkout |
| GET | `/api/v1/revenue-engine/checkout/:id/status` | `routes/runtime.ts:443` | OPEN | Checkout status |
| POST | `/api/v1/revenue-engine/recovery/process` | `routes/runtime.ts:451` | FINANCIAL_MUTATION | Cart recovery |
| POST | `/api/v1/revenue-engine/subscriptions/sale` | `routes/runtime.ts:463` | FINANCIAL_MUTATION | Sell subscription |
| POST | `/api/v1/revenue-engine/credits/packs/sale` | `routes/runtime.ts:475` | FINANCIAL_MUTATION | Sell credit pack |
| POST | `/api/v1/revenue-engine/radar/checkout` | `routes/runtime.ts:487` | FINANCIAL_MUTATION | Radar checkout |
| POST | `/api/v1/revenue-engine/entitlements/activate` | `routes/runtime.ts:501` | FINANCIAL_MUTATION | Activate entitlement |
| GET | `/api/v1/runtime/readiness` | `routes/runtime.ts:513` | OPEN | Readiness summary |
| GET | `/api/v1/dashboard/runtime` | `routes/runtime.ts:531` | OPEN | Dashboard runtime |

## Financial database read APIs

| Method | Full path | Source | Auth | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/financial/health` | `routes/financial.ts:17` | OPEN | Financial DB health |
| GET | `/api/v1/financial/wallets` | `routes/financial.ts:26` | OPEN | Wallet list |
| GET | `/api/v1/financial/transactions` | `routes/financial.ts:41` | OPEN | Transaction and ledger list |

## Orphan/duplication findings

| Finding | Severity | Details |
| --- | --- | --- |
| Duplicate `/api/v1/runtime/production` | HIGH | Defined in both `phase8.ts` and `runtime.ts`; route order means `phase8.ts` responds first. |
| Duplicate `/api/v1/runtime/alerts` | HIGH | Defined in both `phase8.ts` and `runtime.ts`; route order means `phase8.ts` responds first. |
| Open financial reads | CRITICAL | Wallet and transaction data are exposed as unauthenticated GET routes. |
| Open checkout status | MEDIUM | Checkout status lookup is open; acceptable only with unguessable IDs and no sensitive payload. |
