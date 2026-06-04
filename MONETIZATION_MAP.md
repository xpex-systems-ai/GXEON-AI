# MONETIZATION MAP — GXEON ACTIVATION SURFACE

## Direct money endpoints

| Endpoint | Product | Buyer | Pricing primitive | Production state |
| --- | --- | --- | --- | --- |
| `POST /api/v1/runtime/payments/create` | PIX payment | End customer / agent | BRL amount | Ready after live secrets and DB |
| `POST /api/v1/revenue-engine/checkout` | Generic checkout | End customer | SKU/catalog price | Ready after auth + catalog hardening |
| `POST /api/v1/revenue-engine/subscriptions/sale` | Subscription | Agent/customer | Monthly plan | Ready after billing reconciliation |
| `POST /api/v1/revenue-engine/credits/packs/sale` | Credit pack | API consumer | Credit bundle | Ready after wallet auth/tenant boundary |
| `POST /api/v1/revenue-engine/radar/checkout` | Radar intelligence | Trader/operator/API buyer | Signal/report price | Ready after usage metering |
| `POST /api/v1/revenue-engine/entitlements/activate` | Paid entitlement | Subscriber | Entitlement tier | Needs strict admin/service auth |

## Monetizable data/API surfaces

| Surface | Value | Required hardening |
| --- | --- | --- |
| Conversion funnels/leads/forecast | Sales analytics SaaS | Replace seeded data with tenant-scoped data; require auth for private metrics |
| Runtime readiness/health | Managed Railway/Supabase observability | Add account auth and external metrics retention |
| Financial ledger/wallets | Finance admin reporting | Require financial read auth and audit logging |
| x-radar signals | Premium intelligence feed | Credit metering, freshness SLA, refunds for failed signals |
| Autonomous task queue | Paid execution network | Durable queue, worker heartbeat, retry policy and settlement ledger |

## Activation recommendation

Start with **Credits + Radar Signals** because the code already has wallet, signal generation, signal consumption, checkout, credit pack sale and entitlement activation primitives. The minimum safe SaaS version should require:

1. authenticated account/project identity,
2. credit balance checks before paid API use,
3. ledger entry for every credit mutation,
4. signed webhooks for every external payment event,
5. customer-visible receipt/status endpoint with no sensitive internals.
