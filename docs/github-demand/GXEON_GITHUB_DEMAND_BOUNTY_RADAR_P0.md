# GXEON GitHub Demand + Bounty Radar P0

Preview-only backend layer that searches public GitHub issues through the REST `/search/issues` endpoint, scores demand/bounty/service signals, and prepares internal pipeline previews.

## Demand categories
`EXPLICIT_BOUNTY`, `PAID_WORK_HINT`, `AGENT_INTEGRATION_NEED`, `MCP_CONNECTOR_NEED`, `DATA_API_NEED`, `DEPLOY_CI_RESCUE`, `SUPABASE_RLS_OR_DATABASE`, `DOCS_TEMPLATE_REQUEST`, `BUG_FIX_LOW_COMPLEXITY`, `OPEN_SOURCE_UNPAID`, `WATCHLIST_ONLY`.

## Query packs
Static packs cover explicit bounty/reward, Agent/MCP integration, deploy/CI rescue, Supabase/database/RLS, docs/templates, and API/data connectors. Packs limit preview candidates and do not scrape HTML.

## Scoring
Scores include demand, bounty confidence, service lead, urgency, execution ease, GXEON fit, and risk. No payment is inferred when no budget/bounty signal exists.

## APIs
- `GET /api/github-demand/status`
- `GET /api/github-demand/query-packs`
- `POST /api/github-demand/search-preview`
- `POST /api/github-demand/score-preview`
- `POST /api/github-demand/pipeline-preview`
- `GET /api/github-demand/pipeline-previews`
- `GET /api/github-demand/pipeline-previews/:id`
- `POST /api/github-demand/pipeline-previews/:id/proposal-pack`
- `POST /api/github-demand/pipeline-previews/:id/create-opportunity-preview`

Next stage: GitHub Demand Submission Pack P0 for selected manual candidates.
