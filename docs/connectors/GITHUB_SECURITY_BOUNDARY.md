# GitHub Connector Security Boundary

## P1 boundary decision

GitHub P1 is a **read-only preparation phase**. It creates the GXEON operational command surface and type-safe connector model while keeping all external integration capabilities disabled.

## Safety flags

| Boundary | P1 value | Requirement |
| --- | --- | --- |
| OAuth enabled | `false` | No OAuth redirects, callbacks or consent flows from the frontend. |
| External API calls | `false` | No GitHub REST, GraphQL or SDK calls from this phase. |
| Frontend token storage | `false` | No token inputs, localStorage, sessionStorage, cookies or embedded credentials. |
| Repository write access | `false` | No write scopes, push, merge, delete branch, settings mutation or automation. |
| Database writes | `false` | No connector state persistence until schema/RLS review is complete. |
| Secret exposure | `false` | No secrets in source, docs, UI copy, logs or generated bundles. |

## Credential handling rule

Credentials must never be stored in frontend code or browser-accessible state. Future credentials must live only in an approved backend secret store with least-privilege scopes and audited access.

## Runtime rule

The frontend route may display readiness, empty state, counts and health flags. It must not initiate GitHub authorization, background sync, scheduled jobs or direct external network calls.

## Mutation blocklist

The connector must reject or omit capabilities that create, update or delete GitHub resources, including issue creation, PR creation, PR merge, branch deletion, commit push, repository settings mutation and workflow automation.

## Evidence integrity

The evidence timeline is operational metadata only. Future entries must be derived from read-only GitHub objects and normalized server-side before rendering. Evidence must not contain raw tokens, private URLs with credentials, secrets, webhook payload secrets or sensitive environment variables.
