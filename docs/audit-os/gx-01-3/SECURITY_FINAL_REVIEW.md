# GX-01.3 — inspeção final de segurança

Estado: correção de bypass comprovado e 14 grupos de staging nativo aprovados; regressão final Linux no novo HEAD em fechamento. A decisão global permanece BLOCKED até os gates e a revisão humana. Não há certificação SOC 2, ISO 27001 ou homologação SaaS multiempresa.

## Vulnerabilidade demonstrada e corrigida

O guard de UUID da GX-01.2 cobria caseId recebido no corpo. A rotina legada findFirstInternalAuditCase também podia inferir um caso pela referência do ativo, sem caseId. Um GX criado com a referência interna do repositório era selecionado por essa rotina depois de CLOSED. O teste PostgreSQL administrativo reproduziu POST /api/v1/audit/baseline/first-evidence-finding retornando **201**, onde deveria retornar **404**, acrescentando achado e evidência fora do fluxo governado.

A seleção por ativo e por metadata agora exclui workflow=gx01-v1. O caminho PostgreSQL usa IS DISTINCT FROM, preservando casos legados sem o campo; o fallback REST aplica a mesma exclusão ao resultado. Não há novo endpoint produtivo, schema ou migração. Todas as rotinas que usam essa descoberta compartilham a proteção. O guard de UUID anterior continua ativo.

Regressão PostgreSQL: **12/12 PASS** na primeira execução green, incluindo fechamento, tentativa legada sem caseId e contagem intacta. No staging com papel mínimo, o inventário amplo do legado também bloqueia escrita com **503 AUDIT_TABLES_MISSING**, pois apenas as cinco tabelas GX estão acessíveis à aplicação. Não foram ampliados grants. A conferência GET baseline/status deve mostrar caseConfirmed=false, provando que a descoberta exclui GX; a regressão administrativa exige 404 para testar o guard sem depender desse bloqueio de permissões. O primeiro teste do harness esperava 404 também nesse papel restrito; foi corrigido para conferir os dois limites com contratos específicos, sem aceitar um 503 genérico.

## Superfícies inspecionadas

| Superfície | Controle e prova | Limite |
| --- | --- | --- |
| UUID/rotas legadas | cinco representações, findings/evidences recusados; descoberta inferida corrigida | admin SQL é autoridade confiável |
| Escalada/papéis | operador não revisa; revisor não cria/executa/finaliza; tokens iguais e ausentes falham | tokens não provam duas identidades humanas |
| Cabeçalhos/IP | trust proxy=false; X-Forwarded-For, cabeçalho de papel/autorização alternativo e credencial em query não concedem acesso | não é autenticação por IP |
| Concorrência/rollback | advisory lock, row lock, UUID idempotente, transação e falha injetada | sem garantia de tenancy |
| Evidência/relatório | hash de conteúdo, fingerprint da revisão, contrato cruzado, hash canônico e referências; adulterações recusadas | admin que reescreve dados e hashes está fora da garantia |
| Endpoints/limites | autenticação antes de dados privados; corpos limitados; códigos JSON seguros; flags duplas de escrita | não expor o fluxo publicamente sem nova análise |
| Credenciais | configuração privada ignorada; sem VITE_* de segredo; logs/bundle conferidos pelo harness | triagem não é DLP/certificação histórica |
| Provedor REST | GX exige transação PostgreSQL; nenhuma escrita Supabase remota | exclusão JS revisada; provedor Supabase real não homologado nesta fase |

O changelog oficial Supabase foi lido por HTTP após o leitor web rejeitar text/markdown. Não foi introduzida nova API Supabase ou política RLS; somente filtro de dados do caminho já existente. A tabela public audit_* não representa isolamento por organizações.

## Dependências

O audit inicial do lockfile retornou 128 ocorrências em 125 entradas, incluindo 14 críticas. Foram atualizados proxy-addr, qs, body-parser, brace-expansion das linhas 1/5, Orval, tar e shell-quote, preservando majors compatíveis e minimumReleaseAge=1440. As versões escolhidas foram publicadas há mais de 24 horas. Uma versão intermediária shell-quote 1.9.0 expunha outro advisory; a versão final é 1.12.0. Nenhuma afirmação de zero alertas se baseia nessa etapa intermediária.

O resultado final da rodada é **91 ocorrências: 0 críticas, 61 altas, 25 moderadas e 5 baixas; 88 entradas de advisory**. Audit permanece exit 1. O snapshot completo está em evidence/dependency-after.json; cada entrada contém caminho, versão vulnerável/corrigida e fonte. Isso não equivale a 91 exploits alcançáveis no Audit OS nem a um audit aprovado.

As correções incluem [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [Orval](https://github.com/advisories/GHSA-p4cg-3328-rvfg), [brace-expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) e [shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv). O motor GX não executa geração de código de OpenAPI, shell ou rede a partir do vercel.json submetido. Não foi executado codegen com clean=true, preservando os arquivos gerados existentes; a mudança do gerador exige revisão antes de futuras regenerações.

Alertas remanescentes envolvem, entre outros, ferramentas Expo/Metro, Vite em desenvolvimento, parsers/geração e utilitários de log. Não foram classificados em massa como irrelevantes: mitigação desta fase é entrada sintética/confiável, frontend compilado, loopback, ausência de dev server público e nenhuma geração a partir de arquivo externo. **xpex-systems-ai** deve designar o revisor para avaliar alcance, plano e eventual aceite formal. Não habilitar exposição produtiva com base neste relatório.

A instalação também informa fim de suporte do ESLint 9 e deprecações transitivas. Não foi feita migração de major do tooling para esconder esses avisos; lifecycle e plano de atualização ficam no review. Nenhum audit com alertas foi marcado como verde.

## Limitações operacionais

O Windows apresentou falta de memória (inclusive PowerShell) e tsc exit 134 com heap esgotado; o Bash usado só para preinstall também falhou numa tentativa de localizar pnpm. Esses resultados locais não são PASS. O CI Linux do HEAD entregue deve confirmar tipos, build completo, PGlite, PostgreSQL, lint e staging. A tentativa de mobile Windows anterior falhou em fetch do Metro; não foi repetida em ambiente com aproximadamente 250 MiB livres. Nenhuma evidência foi apagada para contornar o limite.
