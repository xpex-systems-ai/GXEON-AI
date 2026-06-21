# GXEON OS Architecture Map

- Frontend: `artifacts/gxeon-dashboard`, com módulos visuais isolados em `src/modules`.
- API: `artifacts/api-server`, com rotas read-only e contratos de módulo.
- DB: esquemas existentes preservados; nenhuma migration nesta missão.
- Contracts: `packages/gxeon-contracts` para manifesto e política de segurança tipados.
- Connectors: read-only por padrão; writes exigem ativação explícita.
- Reports/Revenue/Marketplace/SaaS: camadas planejadas após Audit OS e Proposal Engine.
