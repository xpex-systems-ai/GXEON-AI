# GXEON Operator Workflow Handoff Bus P2

## Purpose
Create the official, preview-only operator handoff bus for the R$100 manual workflow. Each Operator Assistant next action can become a traceable internal handoff with route, source, official step, prefill, checklist, status and safety blocks.

## Architecture
- Backend: in-memory `operatorWorkflow` modules create handoffs, compute official flow progress, aggregate module counts and expose REST endpoints.
- Frontend: the dashboard client creates handoffs from next actions, opens destination routes with `?handoffId=...`, and renders a received handoff banner with safe status buttons.
- Scope: no database migration, no background worker, no scheduler and no autonomous execution.

## API contracts
- `GET /api/operator-workflow/status`
- `GET /api/operator-workflow/summary`
- `GET /api/operator-workflow/official-flow`
- `GET /api/operator-workflow/handoffs`
- `GET /api/operator-workflow/handoffs/:id`
- `POST /api/operator-workflow/handoffs/from-next-action`
- `PATCH /api/operator-workflow/handoffs/:id/state`
- `POST /api/operator-workflow/handoffs/:id/route-opened`
- `POST /api/operator-workflow/handoffs/:id/manual-completed`
- `POST /api/operator-workflow/handoffs/:id/create-target-preview`

## Manual-first rules
The bus only stores internal previews and status events. External contact, payment provider calls, checkout creation, invoice creation, wallet actions, GitHub writes and real revenue claims remain disabled.

## Official R$100 flow
1. Sala R$100
2. Cérebro
3. Agente Executor Manual
4. Sprint de Receita
5. Perspectivas
6. Ofertas de Clientes
7. Pagamento Manual
8. Fechamento R$100
9. Livro de Contas

## How handoffId works
The Operator Assistant creates a handoff, receives an id such as `ow_handoff_000001`, and navigates to `targetRoute?handoffId=<id>`. Destination pages render `OperatorHandoffBanner`, read the in-memory handoff, mark `ROUTE_OPENED`, display safe prefill and allow manual status updates.

## How to test
Run backend and frontend builds, start the API server, call status/summary/official-flow, then create a handoff from the Operator Assistant and open the destination route with the returned handoff id.

## Rollback
Remove the `operatorWorkflow` route mount, remove the dashboard service/components, and revert page/sidebar integrations. Because storage is in-memory only, rollback has no persisted data migration.
