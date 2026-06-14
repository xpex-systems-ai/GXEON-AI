# GXEON R$100 Operator Execution Assistant P1

Camada manual-first que lê estado interno preview-only, recomenda a próxima melhor ação do fluxo R$100 e gera textos/checklists para o operador.

## Rotas backend
- `GET /api/operator-assistant/status`
- `GET /api/operator-assistant/state`
- `GET /api/operator-assistant/next-action`
- `POST /api/operator-assistant/action-preview`
- `POST /api/operator-assistant/internal-handoff`

## Rota frontend
- `/ops/operator-assistant`

## Regra central
Nada é enviado, cobrado, confirmado em provedor ou escrito no GitHub pelo agente. A execução externa é sempre manual pelo operador.
