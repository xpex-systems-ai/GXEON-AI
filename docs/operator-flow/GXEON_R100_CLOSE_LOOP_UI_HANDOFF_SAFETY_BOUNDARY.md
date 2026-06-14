# R$100 Close Loop UI Handoff Safety Boundary

All handoffs are UI-only calls to existing in-memory close-loop preview routes. Prospect, Offer and Manual Payment pages can create or reuse a loop and navigate to `/ops/revenue-close-loop?loopId=<id>`.

Forbidden in this P0: payment provider API, checkout, invoice, webhook, automatic WhatsApp/email/GitHub send, scraping/contact harvesting, wallet transaction, database migration, background worker, provider-verified revenue claim, or frontend secrets.

Real revenue appears only after explicit operator confirmation in the manual confirmation panel with external proof checked by the operator outside GXEON.
