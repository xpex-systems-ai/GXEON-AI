# GX-01.2 — snapshot anterior às alterações

Data de referência do cliente: 2026-10-20, America/Sao_Paulo. Repositório GXEON-AI, PR #456.

- HEAD remoto e local: `25931726ca4c264d918248ac1ee52a2dbd6e20f6`.
- Branch: `codex/gxeon-audit-os-v1-gx01`; base: `main`, `dbc29fff9a2c55487f85a83db597f41c493af7a8`.
- PR aberta, draft=true, merged=false. Nenhum commit posterior ao SHA de referência.
- Checkout limpo antes do reconhecimento. Diff da PR: 75 arquivos, 5503 adições e 90 remoções; inclui documentos/evidências históricos e arquivos binários de captura.
- Quatro workflows de engenharia no HEAD: Typecheck, Build, Monorepo Health e Audit OS V1 concluídos com success.
- O endpoint GitHub consultado com per_page=100 retorna 42 commit statuses (29 failure, 13 success). A consulta limitada anterior mostrava somente 30; não era inventário completo.
- Há também 27 check runs: quatro Actions e checks de integrações Vercel, Netlify e Supabase. Supabase Preview está skipped por não existir branch associada.
- Oito comentários, todos de bots; nenhuma submissão de review e nenhuma thread de revisão. Isso não comprova revisão humana.

## Reconhecimento

Foram recuperados o diff contra a base, contratos, serviços, autorização, testes, scripts e documentos de docs/audit-os/gx-01 e docs/omnix-ai. Os resultados antigos permanecem snapshots históricos, não novos testes executados.

O núcleo usa Express, React/Vite, Zod e tabelas audit_* PostgreSQL existentes. A demo anterior usa PGlite descartável; não comprova reinício de PostgreSQL nativo e backend. Não foi localizado Docker Compose existente. Docker/Podman/PostgreSQL CLI não estão disponíveis no PATH nem nos locais de instalação padrão inspecionados.

## Estado inicial dos gates

| Gate | Estado inicial | Próxima prova necessária |
| --- | --- | --- |
| A | PENDENTE | Stack isolada com PostgreSQL 17, API e frontend existentes |
| B | PARCIAL | Reinício real do backend e banco, concorrência e negativos adicionais |
| C | EM REVISÃO | Testar possível bypass de caseId com espaços nas rotas legadas; rever privilégios e logs |
| D | PARCIAL | Classificar os 42 statuses e 27 check runs, inclusive limites de acesso |
| E | PENDENTE | Download por navegador; se a política impedir inspeção, manter conferência manual pendente |
| F | PARCIAL | Repetir qualidade no novo commit e propor lint semântico mínimo |

A hipótese de bypass vem de normalização inconsistente: a proteção de rota verifica o caseId bruto, enquanto o serviço legado remove espaços. Ainda não foi declarada reproduzida neste snapshot.

## Estratégia controlada

Reutilizar os aplicativos e schema; criar somente scripts de homologação com PostgreSQL 17 em container no CI e dados sintéticos, sem provisionar serviços externos. Host/container/banco produtivos não serão utilizados. A homologação deve registrar portas, health, reinício, desligamento e limpeza explícita. A máquina local tem pouco espaço; instalação de Docker não será improvisada.

GX-01 é um fluxo interno controlado, não um SaaS multiempresa homologado. Tokens de papel não comprovam identidade nominal. Não serão iniciados módulos comerciais, integrações pagas, merge ou produção.
