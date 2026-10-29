# GX-01.2 — revisão de segurança

GX-01 é um fluxo interno controlado, não um SaaS multiempresa homologado. Não há tenantId, isolamento entre organizações, identidade nominal, revogação individual ou RBAC empresarial. Portar este fluxo para clientes externos exige outra revisão, autenticação por identidade e isolamento de dados. As credenciais de papel não provam que dois humanos diferentes agiram.

## Defeitos corrigidos e prova

1. A proteção das rotas legadas comparava caseId bruto, mas o serviço removia espaços e o PostgreSQL aceitava outras representações de UUID. Um caso GX fechado podia receber achado pela rota legada: o teste nativo retornou 201 quando esperava 409. A proteção agora normaliza espaços, chaves e hífens antes da consulta parametrizada de metadata.workflow. Regressões cobrem findings e evidences com cinco representações, exigindo WORKFLOW_ROUTE_REQUIRED e contagem intacta. Evidência red/green em evidence/security-regression.json e execução de staging.
2. Exportação conferia o hash do documento, mas não validava o contrato cruzado entre envelope/caso/evidências/achados. Agora rejeita caso divergente, artefatos ausentes/duplicados, referência desconhecida e conteúdo embutido com hash incorreto. Testes incluem documento adulterado e documento semanticamente inválido com hash recalculado.
3. Checks estáticos consideravam algumas declarações condicionais como cobertura global. Agora rewrites e headers com has/missing não estabelecem cobertura incondicional. Isso evita conclusões positivas não comprovadas. Os checks continuam limitados ao vercel.json submetido; não fazem scan nem verificam deployment real.

## Controles verificados

| Área | Evidência | Limite |
| --- | --- | --- |
| Autenticação | ausente 401; inválida 403; variáveis ausentes 403; tokens iguais não aprovam | Bearer estático, uso interno; rotação pelo ambiente |
| Papéis | operador não revisa; revisor não cria/executa/finaliza; ambos leem | identidade nominal não comprovada |
| Alternativas | rotas legadas bloqueadas para GX por UUID normalizado | administrador SQL continua autoridade de confiança |
| Persistência | transações, locks, timeout, concorrência, rollback e reinício real | schema public audit_* é compartilhado com legado; não há tenancy |
| Integridade | SHA-256 do artefato, fingerprint da revisão, relatório canônico, referências cruzadas | hash sem assinatura não protege contra administrador malicioso que reescreve todo o registro |
| Privilégios | gx01_app só SELECT/INSERT em evidências/achados/relatórios; casos também UPDATE; DELETE/DDL negados | grants restritivos provados no staging; produção precisa adotar papel equivalente |
| Logs e bundle | runner procura credenciais geradas em logs e arquivos públicos; nenhuma encontrada | não é análise universal de segredos históricos do monorepo |
| Escrita | flags duplas; modo desativado recusa mutação e preserva leitura | não habilitar automaticamente em produção |
| Provedor | REST não transacional recusado para GX | PostgreSQL transacional é requisito |

Tokens não estão em VITE_* nem no bundle. A interface recebe as credenciais em campos de senha na sessão e as envia em Authorization; o usuário autorizado conhece sua credencial. Logger usa método/path sem query e redige cabeçalhos sensíveis. Referências com senha/token/query/URL autenticada são recusadas. O validador de configuração rejeita padrões de segredos, mas não é um DLP completo: exigir somente configuração sanitizada.

Os testes usam conteúdo sintético e nenhum serviço financeiro. A composição local bloqueia rotas fora do núcleo antes do app existente. O entrypoint de produção não é substituído por staging. Nenhum domínio, webhook, conta externa, migração de produção ou credencial financeira foi alterado.

## Retenção e riscos

Não há expiração/exclusão automática no produto. O responsável define retenção, exporta evidências e apaga a instância sintética após a revisão, conforme STAGING_VALIDATION.md. Relatório exportado pode conter a configuração submetida; não usar configuração real sensível. Capturas e artefatos desta fase são TEST DATA.

Nenhuma vulnerabilidade crítica conhecida permanece no núcleo limitado após estas correções e testes. Esta é revisão automatizada do executor, não pentest independente, revisão humana nem certificação enterprise. Antes de qualquer exposição pública: adotar identidade nominal, rate limiting apropriado ao ambiente, gestão de credenciais, grants mínimos, política de retenção e análise independente. O estágio local continua restrito a loopback.
