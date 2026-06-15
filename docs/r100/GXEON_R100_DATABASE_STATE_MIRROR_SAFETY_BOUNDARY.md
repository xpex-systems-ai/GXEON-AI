# R$100 Database Mirror Safety Boundary

The R$100 database mirror is a safe, redacted persistence-readiness mirror only.

## Preserved boundaries

- Manual-first.
- Preview-only.
- No payment provider API.
- No checkout.
- No invoice.
- No auto-send.
- No external contact.
- No GitHub runtime write.
- No scraping or browser automation.
- No background worker or scheduler.
- No marketplace automation.
- No frontend secrets or raw `DATABASE_URL` display.
- No raw manual payment links, Pix labels, phone, email, WhatsApp, tokens, API keys, secrets, or credentials in API snapshots.
- `providerVerifiedRevenueBrl` remains `0`.
- `realRevenueClaimedAutomatically` remains `false`.

This module does not verify provider revenue and must not be treated as settlement evidence.
