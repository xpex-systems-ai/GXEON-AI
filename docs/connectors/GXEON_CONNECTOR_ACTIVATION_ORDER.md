# GXEON Connector Activation Order

## Required sequence

1. GitHub — prepare repository, issues, pull requests, commits, and engineering evidence.
2. Vercel — prepare deployments, previews, production status, and build failure visibility.
3. Railway — review backend runtime, connector workers, jobs, logs, and cost controls.
4. Supabase — review persistence, auth, storage, connector state, and RLS boundaries.
5. Microsoft 365 — review Outlook, Calendar, Contacts, OneDrive, proposal files, and client communication.

## Gate requirements

Each connector must pass its checklist before moving from visual readiness to real activation. Activation requires approved backend storage for secrets, provider-side dashboard configuration, a runtime review, and explicit operator approval.

## P0 outcome

P0 creates the route, data model, documentation, and safe UI states. It intentionally does not activate OAuth, does not call external APIs, does not run migrations, and does not store credentials.
