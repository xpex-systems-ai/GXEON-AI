# GXEON Paid Work Command Center

## Scope
Dedicated operator surface for **ENCONTRAR → COMPROVAR → EXECUTAR → RECEBER**.

Route: `/ops/paid-work`

## Economic truth model
- Advertised reward is discovery data only.
- Funded signal is not revenue.
- Claim-ready requires conservative provider funding/payment signals and excludes obvious tests.
- Revenue is recognized only after accepted work, settlement and independent proof.
- No claim, wallet signing, payment capture or provider write is implemented by this panel.

## Sources
The browser performs public read-only GETs to BasedAgents, BaseBounty and Project Room. If CORS or a provider blocks browser reads, the provider is shown as unavailable and the UI makes no economic inference. GitHub demand reuses the existing backend module.

## Release
This surface is intentionally stacked on PR #450 and should remain under review until its focused dashboard quality gate passes. The monorepo-wide API TypeScript baseline is tracked separately and must not be hidden or disabled.
