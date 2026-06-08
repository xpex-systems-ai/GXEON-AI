# GXEON Microtask Monetization Runtime P0

## Purpose

This P0 runtime prepares GXEON OS to sell small operator-approved services while keeping all money movement disabled until a payment provider is intentionally connected on the backend.

## Microtask model

The runtime exposes safe offer templates for services such as landing pages, deploy fixes, analytics setup, checkout readiness, simple dashboards and automation flows. Templates include price ranges, delivery windows, evidence requirements and a mandatory manual approval gate.

The runtime starts with an empty real-data registry. There are no customer records, no revenue records and no persisted opportunities added by this change.

## Flow

1. **Microdata**: An operator submits opportunity context through Radar X manual intake.
2. **Microtask**: The operator maps qualified context to one of the approved offer templates.
3. **Microtransaction**: A future checkout provider can create a customer-facing payment session only after backend credentials and webhooks are configured.
4. **Ledger**: A future confirmed webhook can create a ledger-ready preview for operator review.
5. **Delivery**: Delivery starts after payment confirmation and evidence requirements are attached.

## No-payment-capture boundary

P0 does not create checkout sessions, does not charge cards, does not create PIX payments and does not write ledger entries from provider events. Mercado Pago and Stripe are reported as `NOT_CONNECTED`.

## Next connector step

For Brazil-first monetization, connect **Mercado Pago** next because PIX and local card rails reduce friction for BRL microtasks. Stripe remains the recommended second connector for international card checkout and SaaS-style future subscriptions.
