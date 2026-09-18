# GXEON Clawlancer Hub — Official Migration Pack

Source: Lovable project `014b8d4a-3908-4276-972e-988995c4abac` (GXEON Clawlancer Hub)
Target: `xpex-systems-ai/GXEON-AI`

This import is isolated under `imports/lovable/` so it cannot alter the live pnpm workspace, Railway services, Vercel build, or production dashboard by accident.

## Truth boundary
- Current UI data is DEMO unless a real backend snapshot is configured.
- Revenue must never be marked verified without release + transaction hash/on-chain evidence.
- Provider credentials, API keys, private keys and seed phrases remain backend-only.

## Integration target
Port the reviewed pieces into:
- `artifacts/gxeon-dashboard/src/modules/clawlancer/`
- a read-only backend adapter under `artifacts/api-server`

The external Lovable-linked repository `XPEXOS86/gxeon-clawlancer-hub` is not accessible through the currently authenticated GitHub connector, so this migration is sourced directly from Lovable instead.
