# GX-01.6 — superfície dedicada

**LOCAL VERIFIED** para factory HTTP, config e boundary. Não é deploy remoto. Entrada proposta src/audit-pilot.ts; não carrega app.ts/índice de rotas/autorunners. [Boundary atual](evidence/local-pilot-build-boundary.json): forbiddenImports vazio. Módulos originais não foram removidos; start padrão legado não foi substituído. Build dedicado proposto: pnpm --filter @workspace/api-server run start:audit-pilot (script confirmado no package.json; execução remota não autorizada).

| Controle | Comportamento e prova |
|---|---|
| Rotas | GET /api/healthz público; GET /api/readyz autenticado; /api/v1/audit/workflow/cases e ações create/detail/run/review/finalize/report. Rotas financeiras, admin, conectores e autorunners respondem JSON 404 no dedicado. Testes negativos auditPilot.test.ts. |
| Autorização | Bearer distinto por operator/reviewer; check antes do parser. Reviewer não cria/roda/finaliza; operator não revisa. Ausente 401; token inválido ou papel errado 403. Write exige os dois gates; piloto exige testData=true. Não há identidade de pessoa ou multi-tenant. |
| CORS | Origins HTTPS exatas (máximo cinco), sem wildcard; origem desconhecida 403. Preflight só workflow, GET/POST e authorization/content-type. Sem origin também exige Bearer. trust proxy=false. |
| Admissão nova | 60 requisições/minuto por papel autenticado e quatro respostas ativas/processo. 429/503 com Retry-After. X-Forwarded-For não cria buckets. Readiness ocupa slot; liveness não consulta DB. Regressões de saturação, liberação e virada de janela PASS. Apenas uma réplica qualificada. |
| Entrada | JSON estrito 32 KiB; artifact.content<=16000 caracteres, checks<=2 antes do Zod. Content-Encoding não identity retorna 415; inflate=false. Gzip válido com trailing bytes foi rejeitado, processo continuou saudável. |
| Tempo/pool | requestTimeout 15s, headersTimeout 10s, keepAlive 5s, maxRequestsPerSocket=100; pool4, connectionTimeout5s, statement_timeout5s, idle30s. Valores de código, não SLA ou teste remoto de carga. |
| Erros/logs | Contrato JSON 400/401/403/404/405/413/415/429/503; nunca HTML do SPA. Logs dedicados usam categorias fixas e requestId aleatório, sem body/query/headers/path params/stack. Erro de pool usa evento estático. |
| Integridade | Transações e lock de caso, rollback, idempotência por requestId, vínculos case/evidence/finding/report, hash canônico. CLOSED bloqueia mutações HTTP; PG role sem UPDATE/DELETE de evidência/achado/relatório. Backup/recovery revalida hashes. |
| Infra/config | Recusa habilitação implícita, DB público/outro nome/outro usuário/query na URL, tokens iguais/fracos, writes incoerentes e autorunners. TLS exige rejectUnauthorized=true; CA opcional, nunca false. Grants/memberships testados localmente com PG17. |

A falha controlada expôs um defeito do pool singleton usado pelo staging compartilhado: erro de cliente ocioso sem listener encerrava Node e podia serializar o cliente. lib/db/src/pool.ts agora captura o evento com mensagem estática, sem raw error/client. O dedicado já tinha seu listener próprio; a correção não é apresentada como novo isolamento de produção. [Regressão](evidence/local-recovery-failures.json) demonstra 503 e recuperação sem reinício da API.

15 testes PGlite, 16 PostgreSQL HTTP e 1 grants/memberships passaram localmente. O CI do SHA final deverá confirmar a mesma superfície. Testes de factory não estabelecem TLS Railway, identidade humana ou resistência distribuída. [Riscos](RESIDUAL_SECURITY_RISKS.md).

[CI candidato verificado](evidence/candidate-validation.json): quatro workflows success, 15/15 PGlite,16/16PG,1/1grants e14grupos de staging. Checkout sintético de PR 380dec6654d0a9635146e490278b09bab2fcf177 tem pais base dbc29fff9a2c55487f85a83db597f41c493af7a8 e head 1af24f61c376225c3e94928a1f58c59b2f7e597e; sourceDirty=false. Isso é o merge de teste do GitHub, sem merge real da PR.
