# Superfície e isolamento da API

GX-01.5 · 2026-10-21 · PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT · integração main · estado global **BLOCKED**. Implementação e testes não equivalem a aprovação humana ou autorização de deploy.

O inventário AST identificou **435 declarações em 42 módulos de rotas** da API geral. [Inventário completo](evidence/api-route-inventory.json). Inclui health, auth, auditoria legada, governança/admin, conectores, propostas, finanças/Stripe, arquivos/relatórios e outros módulos. Declaração estática e middleware no arquivo não provam autorização efetiva; os caminhos montados e efeitos precisam ser revisados em cada módulo. Não expor index.mjs por inferência do nome audit.

## Menor contrato necessário

| Método / caminho | Acesso / efeito |
| --- | --- |
| GET /api/healthz | liveness fixa pública |
| GET /api/readyz | Bearer de leitura; consulta SELECT 1 |
| POST /api/v1/audit/workflow/cases | operador; escopo consentido, testData=true, vercel.json sanitizado; transação |
| GET /api/v1/audit/workflow/cases/:caseId | operador/revisor; evidências, achados e estado |
| POST .../:caseId/run | operador; dois checks estáticos determinísticos |
| POST .../:caseId/review | revisor distinto; decisão/referência explícita |
| POST .../:caseId/finalize | operador; aprovação atual/integra, relatório único e CLOSED |
| GET .../:caseId/report | operador/revisor; JSON attachment com hash e referências |

Métodos fora GET/POST/OPTIONS retornam405; rota desconhecida404 JSON; OPTIONS exige origem/método/headers permitidos. Auth precede parser32KiB; não JSON415; origin não permitida403; falta token401/papel errado403. Nenhum caminho deve cair em SPA HTML.

## Causa e correção

O servidor geral carrega index de rotas e integrações muito além do GX-01; o import original @workspace/db puxava schemas financeiros. Criado @workspace/db/pool para conexão lazy sem schemas; a API geral preserva os exports anteriores. O entrypoint audit-pilot importa apenas factory/validação/serviço workflow/PG. Build produz o runtime antigo e o dedicado; uma asserção sobre inputs efetivamente retidos impede app/index/rotas e serviços fora do workflow no output dedicado. [Grafo real esbuild](evidence/pilot-build-boundary.json); forbiddenImports=[] no build observado. Não é sandbox contra futuras alterações arbitrárias de código.

As respostas HTML/404 históricas vinham da separação frontend estático/backend e fallback incorreto, não de uma API comprovada no domínio. A raiz Vercel existente gera dashboard estático; nomes api-server não provam runtime Node. O modelo dedicado explicita origem API/saída/fallback. O staging atual prova proxy → Express → PG; configuração externa permanece não aplicada.

Sem shell/scan ativo/URL fetch nos dois checks; entrada é texto vercel.json autorizado. Arquivos: runtime não abre caminhos enviados; verificadores locais recebem caminho explícito do arquivo JSON; backup usa binários PG17 e identificador de banco aleatório validado. Cinco tabelas em transações; UUID alternativo e seletor legado possuem regressões preservadas. Não alterado Stripe/webhooks/carteiras/autorunners do runtime geral; eles simplesmente não integram o dedicado.

## Ameaças e limites

Roubo de Bearer: segredo restrito, HTTPS, rotação/revogação, no-store, sessão em memória. Origem hostil: CORS exato + auth; clientes sem Origin ainda precisam Bearer. Autopromoção: papel vem somente do token, nunca query/headers auxiliares. Mutação CLOSED/legado: guardas e testes409/404. Alteração de evidência/referências/revisão obsoleta: hashes e bloqueios de export/finalize. Privilégio DB excessivo ou dados reais: recusa de startup. Vazamento de log: categorias fixas e teste de ausência de marcadores/credenciais. Disponibilidade: limites de parser/pool/timeouts, mas teste de carga/rate limiter remoto pendentes; nenhuma alegação de proteção universal.

[Testes locais](evidence/local-validation.json), [staging14](evidence/local-acceptance.json), [autorização](IDENTITY_AND_ACCESS_GATE.md), [CI atual](evidence/ci-validation.json). TLS/rede privada remota, identidade nominal, segregação multiempresa e revisão independente continuam gates abertos.

## Complemento de fronteira no fechamento

A atestação também passou a recusar associação da role de aplicação a qualquer outro papel, inclusive NOINHERIT que permita SET ROLE. Acrescentada regressão PG17 específica e mesma pré-condição no exemplo de grants. Lint28/0 e typecheck de testes passaram; este delta exige o CI do próprio commit, reconsultado na PR/entrega final. [Hashes e escopo do complemento](evidence/final-boundary-followup.json). A evidência CI já versionada pertence ao candidato anterior1c102b4 e não é aprovação deste complemento.
