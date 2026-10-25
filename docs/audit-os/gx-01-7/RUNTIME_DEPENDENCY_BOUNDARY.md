# GX-01.7 — fronteira de runtime

CONFIRMADO: artifacts/api-server/src/audit-pilot.ts é um entrypoint separado. Importa configuração fail-closed, app dedicado, validação do banco, serviço workflow e pool; não importa app.ts/index.ts/índice de rotas, runners ou módulos financeiros. O build produz audit-pilot.mjs e audit-pilot-boundary.json com **inputs retidos bytesInOutput>0**, não apenas o grafo de dependências instalado.

TESTADO: build local identifica Zod4.6.6 e nenhum input zod/v3 retido no bundle dedicado. O build recusa import proibido, Zod divergente e ausência de v4. A evidência JSON registra inputs e forbiddenImports. O processo geral index.mjs continua contendo outros módulos/versões: essa fronteira **não** se estende a todo o monorepo.

| Camada | Evidência | Estado |
|---|---|---|
| Contrato dedicado | api-zod4.6.6, preflight<=2checks, body limitado | TESTADO |
| HTTP dedicado | allowlist de origens, token por papel, deny default, rate/limites, erros sanitizados | TESTADO em suíte auditPilot |
| Banco | grants exatos, sem superuser/DDL, cinco tabelas audit; rejectUnauthorized TLS no entrypoint | grants TESTADO; TLS remoto BLOCKED |
| Staging loopback | helper executa API existente com fixture PG17 e frontendproxy | TESTADO; não equivale à implantação TLS do entrypoint dedicado |
| Mobile/build tools | forge/cache/Zod3/decoder vulneráveis ainda instalados | BLOCKED para aceite global; não retidos no output dedicado |

Threat boundary: arquivo de configuração autorizado→validação→transação→evidência hash→achados→revisão→relatório. Nenhuma navegação/scanner de rede/shell arbitrário é oferecida pelo Audit OS. Uma exclusão estática no bundle reduz superfície; não comprova isolamento de container, firewall, TLS ou ausência de falhas desconhecidas. Antes de piloto, repetir testes no runtime remoto aprovado, confirmar comando de início audit-pilot.mjs e verificar artefato imutável correspondente ao SHA final.
