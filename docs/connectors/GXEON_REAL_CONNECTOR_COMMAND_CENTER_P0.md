# GXEON Real Connector Command Center P0

P0 adds a manual-first connector hub for GitHub, Google, Microsoft 365, Mercado Pago, Mercado Livre, MetaMask, WalletConnect, OpenRouter, Hugging Face, Anthropic, OpenAI, Vercel, Railway, Supabase, and manual Web3 task platforms.

The model is OAuth launch, CLI copy/paste, or manual provider setup. GXEON may show readiness, missing server env var names, safe next actions, and provider pages. GXEON does not exchange or store OAuth tokens in P0 unless a future server-side secure store exists.

Secrets belong only in server/runtime environment variables. The frontend has no token input and must not use localStorage, sessionStorage, or cookies for provider secrets.

Future path: P1 can add read-only status checks; P2 can add transactional actions only with explicit approvals, audit logs, secure secret storage, and provider-specific controls.
