# GXEON Home Center Agents P0 Report

## Mission result

Implemented Home Center Agents P0 as a non-autonomous preparation layer for the future Grok Builder agent installation flow.

## Backend

- Added Home Center Agent domain types.
- Added registry for eight target Home Center Agents.
- Added permission matrix and Grok Builder readiness helpers.
- Added read-only JSON endpoints under `/api/agents/home-center/*`.
- Added no-store cache headers for Home Center Agents endpoints.
- Did not add install or execution endpoints.

## Frontend

- Upgraded Agent Conectou page into the Home Center Agents dashboard.
- Preserved Agent Conectou identity as the connector/agent bridge.
- Added registry cards, capability lists, forbidden actions, connector requirements and manual approval gates.
- Added Grok Builder readiness panel and permission matrix.
- Added safe frontend fallback data for backend-unavailable mode.
- Added navigation wording for Home Agents while preserving the `/ops/agent-conectou` route.

## Safety confirmation

- Autonomous execution: disabled.
- External contact: disabled.
- GitHub writes: disabled.
- Payment actions: disabled.
- Frontend secrets: not added.
- Credential forms: not added.

## Files changed

- `artifacts/api-server/src/agents/homeCenterAgentTypes.ts`
- `artifacts/api-server/src/agents/homeCenterAgentRegistry.ts`
- `artifacts/api-server/src/routes/agents.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/gxeon-dashboard/src/services/homeCenterAgentsService.ts`
- `artifacts/gxeon-dashboard/src/pages/AgentConectouPage.tsx`
- `artifacts/gxeon-dashboard/src/components/layout/Sidebar.tsx`
- `docs/agents/HOME_CENTER_AGENTS_P0.md`
- `docs/agents/HOME_CENTER_AGENTS_PERMISSION_MODEL.md`
- `docs/agents/GROK_BUILDER_AGENT_INSTALLATION_PLAN.md`
- `GXEON_HOME_CENTER_AGENTS_P0_REPORT.md`
