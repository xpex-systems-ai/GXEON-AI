# GX-01.2 — pacote de revisão

PR oficial: [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456), branch codex/gxeon-audit-os-v1-gx01, base main. Preservar draft, sem merge ou deploy de produção.

Decisão: BLOCKED por evidências insuficientes do download e pendências de acesso/classificação operacional externa. O fluxo interno técnico foi homologado localmente; não é aprovação enterprise ou revisão humana independente.

## Mudanças

- Normalização de UUID na proteção das rotas legadas fecha mutação de casos GX por representações equivalentes.
- Contrato e exportação verificam envelope, evidências, referências e hashes; checks condicionais não comprovam cobertura global.
- Harness reproduzível usa aplicativos existentes, PostgreSQL 17 persistente, papel mínimo, tokens distintos e somente TEST DATA. Inclui negativos, concorrência, rollback, adulteração e reinício real.
- Novo job isolated-staging exercita Compose; lint ESLint mínimo no núcleo e ferramentas, typecheck dedicado dos testes. Nenhuma reformatacão em massa.
- O build mobile passou a invocar a CLI do package manager via Node/npm_execpath, corrigindo spawn pnpm ENOENT no Windows.
- Inventário de 69 resultados iniciais e runbooks de staging, segurança, download e aceite.

## Estado das provas

| Verificação | Resultado local |
| --- | --- |
| pnpm install --frozen-lockfile | PASS, CLI 10.28.1, lock atualizado sem nova resolução |
| pnpm run typecheck | PASS em todos os pacotes previstos pelo comando |
| typecheck:audit-tests | PASS, sem excluir testes do novo check |
| lint:audit | PASS, 19 arquivos críticos, zero erros; não é cobertura de todo legado |
| test:audit com PGlite | 11/11 PASS |
| test:audit com PostgreSQL 17 | 11/11 PASS |
| verify:audit-staging | 13 grupos PASS local nativo; repetição vinculada ao commit no snapshot |
| Monorepo Health | comando executado com exit 0; é radar documental, não certificação |
| build completo | Em fechamento; primeira tentativa encontrou spawn pnpm ENOENT mobile no Windows, correção aplicada |
| navegador/arquivo baixado | PENDENTE, runtime indisponível; não contornada política |

O SHA de origem testado e o indicador sourceDirty ficam em evidence/acceptance.json. O HEAD entregue deve ser obtido com git rev-parse HEAD e conferido com a PR; snapshots antigos têm seu próprio SHA e não certificam outro commit. Os resultados de Actions do novo HEAD serão anexados antes da entrega final.

## Externos e ações humanas

CI_EXTERNAL_STATUS.md e seus JSONs registram todos os resultados recuperados. Quatro Vercel xpex-neural falham por public ausente após build; o proprietário deve confirmar aplicativo/root/output/runtime corretos. Outros projetos retornam account blocked ou não permitem leitura do escopo. As duas falhas Netlify não têm log acessível nesta sessão. Não desativar checks e não presumir irrelevância. Regras de main retornaram lista vazia; proteção clássica retornou HTTP 404, que sozinho não prova ausência de regra ou concede poder administrativo. Mantenedor deve confirmar o conjunto obrigatório.

O revisor humano deve executar DOWNLOAD_VALIDATION.md e confirmar arquivo, identidade e integridade, definir quais projetos externos compõem o produto, resolver/justificar seus bloqueios e revisar o diff. Credenciais do staging não podem ser anexadas. Os dados são sintéticos e a revisão automatizada com dois tokens é somente fixture.

## Variáveis e impacto

Somente nomes: DATABASE_URL, NODE_ENV, GXEON_AUDIT_OPERATOR_TOKEN, GXEON_AUDIT_REVIEWER_TOKEN, GXEON_AUDIT_DB_PROVIDER, GXEON_AUDIT_WRITE_MODE, GXEON_AUDIT_ALLOW_DB_WRITES, GXEON_AUDIT_AUTO_RUN_MISSION_006, GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL. Staging gera também GXEON_AUDIT_STAGING, GXEON_STAGING_INSTANCE, GXEON_STAGING_CONTROL_TOKEN; GXEON_STAGING_PG_BIN é opcional no modo nativo. Testes dedicados usam TEST_AUDIT_DATABASE_URL, GXEON_AUDIT_TEST_REUSE_SCHEMA e GXEON_AUDIT_TEST_EVIDENCE_DIR. Overrides locais Windows: ESBUILD_BINARY_PATH, NODE_PATH e npm_config_script_shell.

Não há nova migração de produção, ativação de escrita produtiva, publicação de plugin, conta financeira, domínio ou webhook alterados. O novo entrypoint/harness é apenas de teste. Mudanças de runtime no núcleo endurecem contratos e guardas; consumidores de relatório inválido passarão a receber erro 409 seguro. O build completo e CI devem ser conferidos no HEAD final. A configuração de deploy externa não foi modificada.

## Checklist

- [x] Autorização e escopo sintético registrados; verificações delimitadas.
- [x] Persistência, evidências, achados, revisão por papel e CLOSED provados.
- [x] Integridade e bloqueios de mutação/rollback testados.
- [x] Limites de identidade, retenção e ausência de multi-tenancy documentados.
- [x] Inventário completo inicial de externos, com causas ou bloqueios explícitos.
- [ ] Bloqueios externos relevantes resolvidos/justificados pelo proprietário.
- [ ] Download real inspecionado e assinado por revisor.
- [ ] Todos os checks de engenharia confirmados no HEAD final.
- [ ] Revisão humana independente.
- [x] Sem merge e sem produção.
