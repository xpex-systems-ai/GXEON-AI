# Radar X GitHub Opportunity Engine P0

## Purpose

Radar X GitHub Opportunity Engine P0 adds a safe, backend-only discovery preview for public GitHub opportunity signals. It helps operators identify repositories or issues that may fit GXEON OS delivery capabilities such as API integrations, deployment fixes, automation, CI, documentation and agentic workflow support.

## Safe sources

P0 uses only GitHub REST API reads against public metadata:

- Public issues returned by GitHub issue search.
- Public issue labels.
- Public repository metadata such as stars, open issues, language, pushed date and description.

The browser calls only GXEON backend routes under `/api/radar/github/*`. It does not call GitHub directly and does not receive backend GitHub tokens.

## Explicit exclusions

P0 does not:

- Scrape GitHub HTML pages.
- Persist leads, issues, owners or opportunity records.
- Contact repository owners or contributors.
- Open issues, pull requests, comments or discussions.
- Automate marketplace actions.
- Claim that a repository has budget or bounty unless explicit public metadata contains a payment-like signal.

## Runtime boundaries

Every preview response carries P0 boundary metadata:

- `persistence: PREVIEW_ONLY`
- `automation: NONE`
- `externalContact: NONE`
- `githubWrites: false`

## Scoring model

The score ranges from 0 to 100 using the GXEON GitHub Opportunity Score P0 weights:

| Dimension | Max points |
| --- | ---: |
| Relevance to GXEON stack | 25 |
| Clear problem statement | 20 |
| Recency | 15 |
| Repository activity | 15 |
| Low execution complexity | 10 |
| Maintainer signal | 10 |
| Monetization signal | 5 |

Risk flags include `no_budget_signal`, `possible_unpaid_open_source`, `unclear_requirements`, `high_complexity`, `stale_issue`, `sensitive_domain` and `external_contact_required`.

Recommended next steps are limited to manual operator actions: `manual_review`, `draft_offer`, `research_repository`, `skip_low_value` and `watch_for_updates`.

## Operator review flow

1. Operator opens Radar X and selects the GitHub Opportunity Engine tab.
2. Operator chooses a safe preset query or enters a custom GitHub issue search query.
3. Backend performs a read-only GitHub REST API search and returns up to ten preview candidates.
4. Operator reviews score explanations, risk flags and repository metadata.
5. Any follow-up, offer draft or outreach remains manual and outside P0 automation.

## Path to Home Center Agents and monetization

P0 converts connected infrastructure into opportunity discovery without unsafe automation. The preview layer can later feed Home Center Agents with operator-approved tasks, scoped delivery templates and monetization workflows after explicit future controls for persistence, consent, compliance and human approval are added.

## Validation URLs

With the API server running on port 3000:

- `GET http://localhost:3000/api/radar/status`
- `GET http://localhost:3000/api/radar/github/status`
- `POST http://localhost:3000/api/radar/github/search-preview`
- `POST http://localhost:3000/api/radar/github/score-preview`

## Production heartbeat and first opportunity search

The heartbeat route should return `GITHUB_OPPORTUNITY_PREVIEW_READY` even when `authenticated` is `false`. In unauthenticated mode, the engine still uses public GitHub REST API search but applies a stricter effective limit to reduce rate-limit pressure.

Production validation example:

```bash
curl -X POST https://gxeon-api-server-production.up.railway.app/api/radar/github/search-preview \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"label:\\\"help wanted\\\" supabase integration\",\"limit\":3}"
```

The search response includes `normalizedQuery`, `effectiveLimit`, `authenticated` and diagnostics so operators can distinguish a healthy public-mode search from token-backed higher-stability mode.
