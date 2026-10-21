# GX-01 — contrato operacional e reprodução

## Escopo V1

Auditoria estática de um `vercel.json` enviado explicitamente pelo operador. Dois checks delimitados: padrão específico de rewrite SPA que captura `/api`; presença de declarações globais não vazias de CSP e X-Content-Type-Options. Ausência no arquivo não prova vulnerabilidade no runtime. Nenhum URL de ativo é acessado, comando executado ou conector acionado. O arquivo deve ser redigido antes do envio. A triagem de padrões de segredo é defesa adicional, não garantia de detecção de todo segredo possível.

UI: `/audit-os` ou `/ops/audit-os/workflow`. O catálogo histórico continua em `/ops/audit-os`; seus placeholders degraded-safe não são resultados de auditoria. A UI V1 mostra somente respostas confirmadas pela API. Tokens ficam apenas em memória da página.

## Arquitetura e dados

Express em `artifacts/api-server`, React/Vite em `artifacts/gxeon-dashboard`, contratos Zod em `lib/api-zod/src/auditWorkflow.ts`, PostgreSQL nas tabelas `audit_assets`, `audit_cases`, `audit_evidences`, `audit_findings` e `audit_reports` já existentes. Nenhuma migração de produção é executada por esta entrega. O provider Supabase REST legado não atende às transações deste fluxo: a V1 falha com `TRANSACTIONAL_PROVIDER_REQUIRED` quando ele é selecionado explicitamente.

Cada intake inclui UUID de requisição, referência de autorização, ativo, checks permitidos e marcação obrigatória de dados de teste. Inserts são atômicos. Repetir o UUID com o mesmo conteúdo reutiliza o caso; conteúdo diferente retorna 409. Row locks serializam execução, revisão e fechamento. Evidência tem SHA-256 do texto recebido; achados apontam IDs e hash dessa evidência. A revisão grava um fingerprint dos dados; mudanças posteriores exigem nova validação e bloqueiam fechamento. O relatório possui hash de JSON canônico, validado na exportação. O estado CLOSED e o relatório são gravados na mesma transação.

Estados: DRAFT → IN_REVIEW → READY_FOR_REPORT → CLOSED. Rejeição permanece IN_REVIEW. Execução e fechamento são idempotentes. O escopo/evidência de um caso são imutáveis pela API V1; para corrigir o arquivo, criar outro caso. Rotas legadas de mutação não podem alterar um caso GX-01.

## Autorização

Modelo de operador interno único, sem promessa de isolamento multitenant ou autenticação nominal. Operador pode criar/executar/finalizar e ler; revisor distinto pode ler/aprovar/rejeitar. Ambos os tokens devem ser diferentes. A revisão registra o atestado de revisão humana do detentor da credencial; a aplicação não prova a identidade humana por esse atestado. Não distribuir tokens administrativos a clientes.

As leituras privadas do namespace v1 também exigem token. Somente health, catálogo de módulos, mapa estático de schema e catálogo de ofertas permanecem públicos. Bootstrap e runner antigos preservam seus gates próprios. Integrações existentes que dependiam de leitura pública de dados precisarão fornecer a credencial.

## Ambiente (somente nomes)

Backend: `DATABASE_URL`, `PORT`, `GXEON_AUDIT_DB_PROVIDER`, `GXEON_AUDIT_WRITE_MODE`, `GXEON_AUDIT_ALLOW_DB_WRITES`, `GXEON_AUDIT_OPERATOR_TOKEN`, `GXEON_AUDIT_REVIEWER_TOKEN`.

Frontend: `VITE_GXEON_API_BASE_URL`; desenvolvimento local pode usar `VITE_GXEON_API_PROXY_TARGET`. As variáveis de origem não contêm tokens. Nunca colocar credenciais em variáveis VITE.

Teste: `TEST_AUDIT_DATABASE_URL` (somente localhost e banco dedicado gx01_test), `GXEON_AUDIT_TEST_EVIDENCE_DIR`. Tokens/credenciais na suíte e no serviço PostgreSQL do CI são apenas fixtures locais explícitas.

Flags de autorunners existentes devem permanecer desativadas no ambiente de homologação: `GXEON_AUDIT_AUTO_RUN_MISSION_006` e `GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL` (não ativar rotinas legadas para demonstrar este fluxo).

## Domínios e deploy

Dashboard e API são serviços separados. O antigo catch-all de vercel.json servia index.html para `/api/*`; agora o fallback exclui `/api` e seus descendentes. Sem origem configurada, a UI mostra diagnóstico de backend; não há proxy para domínio presumido. A regra segue a sintaxe documentada em https://vercel.com/docs/routing/rewrites. A API retorna JSON também para rota inexistente e corpo inválido.

A mudança versionada só entra em produção após revisão, merge e processo de release humano. Nenhum deploy, domínio, webhook ou configuração remota é alterado nesta execução. Para homologar: confirmar serviço `artifacts/api-server`, `/api/healthz` JSON, schema e conta PostgreSQL com menor privilégio; configurar origem frontend apenas depois de comprovar backend. Revisar grants/RLS do projeto Supabase separadamente antes de expor qualquer tabela pelo Data API (https://supabase.com/docs/guides/api/securing-your-api). A suíte local não prova RLS remoto.

## Reproduzir

1. Node 24 e pnpm 10.28.1. `pnpm install --frozen-lockfile`.
2. `pnpm run typecheck:libs`; `pnpm --filter @workspace/api-server run typecheck`; `pnpm --filter @workspace/gxeon-dashboard run typecheck`.
3. `pnpm --filter @workspace/api-server run test:audit`: valida checks, HTTP e persistência em PostgreSQL WASM/PGlite com diretório descartável, inclusive reabertura do banco. Não usa mock de provedor externo.
4. O workflow `.github/workflows/audit-os-v1.yml` repete a integração em PostgreSQL 17 descartável. Nenhum teste inicializa banco remoto. Os logs distinguem motor embarcado de serviço PostgreSQL.
5. `pnpm --filter @workspace/api-server run build`; `pnpm --filter @workspace/gxeon-dashboard run build`.
6. Com banco de homologação já provisionado/aprovado, iniciar API e frontend. Abrir `/audit-os`, registrar configuração redigida e autorização. Para demonstração, usar botão de exemplo e manter `Dados de teste` marcado. Guardar ID do caso, executar, carregar evidências, trocar para credencial independente de revisor, atestar revisão, aprovar; operador finaliza e exporta JSON.

Os resultados efetivamente executados constam em VALIDATION.md e nos artefatos do CI. Não confundir este runbook com prova de execução.

## Limites de aceite

As issues #454 e #455 não são fechadas automaticamente. A jornada comercial completa, pagamento de teste, identidade nominal, isolamento de clientes, RLS/backup/retenção em staging e alcance público da API não são provados por esta V1 estática. A aprovação humana externa e a homologação remota continuam gates de lançamento.

### Demonstração local isolada (opcional)

Com as dependências de desenvolvimento instaladas, iniciar `pnpm --filter @workspace/api-server run demo:audit` com `GXEON_AUDIT_DEMO` explicitamente habilitado num processo não produtivo. Esse entrypoint cria somente um banco PGlite descartável e escuta em 127.0.0.1:3478. Credenciais de fixture públicas: `test-only-operator-credential` e `test-only-reviewer-credential`; jamais usá-las em staging/produção. A demo exige testData=true e não é importada pelo servidor de produção.

Iniciar dashboard dev com `VITE_GXEON_API_PROXY_TARGET` apontando para esse loopback e abrir `/audit-os`. As flags definidas pela demo existem somente nesse processo. Encerrar os processos ao terminar. Esta demonstração não configura nem acessa banco remoto.
