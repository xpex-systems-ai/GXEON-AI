# Microsoft 365 Connector Readiness

## Future use

Microsoft 365 may support Outlook mailbox metadata, Calendar scheduling metadata, Contacts context, OneDrive proposal files, and operator-reviewed client communication.

## Decisions required before activation

- Which tenant and app registration will be used by the operator.
- Which mailbox, calendar, contact, and OneDrive scopes are required.
- Whether the first activation is read-only metadata or includes document metadata.
- Where backend-only secrets will be stored.
- What data may be persisted in GXEON state storage.
- Which operator must approve proposal drafts and email sending.

## Permission posture

Use least-privilege permissions. Avoid broad mailbox or tenant-wide access unless a later security review explicitly approves it.

## Manual-send rule

No automated email is allowed in P0. Future email workflows must require manual review and explicit operator approval before sending.

## Exclusions

This checklist intentionally includes no credentials, no tenant IDs, no client secrets, no refresh tokens, and no access tokens.
