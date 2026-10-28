# OMNIX GX-04.0 — validação e gates

## Escopo do candidato

Um único motor canônico, duas regras estáticas sobre `vercel.json` submetido, portal existente, identidade empresarial candidata e distribuição privada de leitura. Não há seis motores, scanner remoto universal, IdP ativo, cliente real, contrato ou receita comprovados. Código e fixtures não equivalem a aprovação humana.

## Execução local observada em 2026-10-28

| Comando / escopo | Resultado observado |
| --- | --- |
| `pnpm install --lockfile-only`; `pnpm install --frozen-lockfile` (10.28.1) | PASS; `jose` 6.2.13 incluído diretamente sem reduzir idade mínima1440min |
| `pnpm run lint:audit` | PASS, 74 arquivos críticos, zero erros; não é lint universal dos legados |
| `pnpm run typecheck` | PASS, bibliotecas e cinco projetos de aplicações/scripts |
| `pnpm --filter @workspace/api-server run typecheck:audit-tests` | PASS |
| `pnpm run build:libs`; builds API e dashboard | PASS; aviso existente de chunk frontend acima500KB mantido |
| Suíte TypeScript audit, dez arquivos | 41/41 PASS, zero skips; SQL/PGlite e HTTP reais locais |
| `node --test deploy/render/release-guard.test.mjs` | 2/2 PASS; aprovação ingress não aceita o modelo distinto do banco |
| `node --test deploy/self-hosted/encrypted-backup.test.mjs` | 3/3 PASS; roundtrip, adulteração, CBC, chave/destinatário incorretos, limites e ausência de plaintext em falha |
| `pnpm audit --json` completo | **FAIL, 1 HIGH e 1 LOW** em1182dependências; recibo integral preservado |
| PostgreSQL17.11 novo, loopback, `gx040-pg3` | 28/28 testes canônicos/identidade/distribuição/comercial +1/1 atestação de grants PASS, zero skips; cluster encerrado |
| Ensaio nativo HTTPS/PG17/TLS com restore cifrado | Executar no SHA final e ler recibo/artifacts; não inferir de PGlite |

Logs locais ficam fora do Git em `work/gx019-independent-evidence/gx040-*` e `work/gx040-evidence/`. A primeira tentativa simultânea excedeu memória do Windows; a validação foi repetida sequencialmente. A fixture inicial da rota de distribuição omitia a segunda identidade obrigatória; corrigida antes do41/41. Falhas anteriores foram preservadas. A prova PG17 usa cluster novo em loopback; não migra banco remoto nem apaga o compartilhado.

O primeiro helper PG local aguardou um pipe herdado no Windows ao iniciar `pg_ctl`; o cluster foi encerrado explicitamente e o helper corrigido. A segunda prova detectou que limpar o grant negativo de UPDATE da tabela também revoga grants de coluna no PostgreSQL. A fixture agora restaura somente o UPDATE(revoked_at) original; o produto e seus grants não foram relaxados. O terceiro cluster novo passou29/29. Recibos das tentativas anteriores permanecem fora do Git; não os tratar como prova aprovada.

CI `Audit OS V1` repete SQL/PGlite e PostgreSQL17, limite de grants, Compose/HTTPS/restore/restart, staging isolado e imagem rootless Render recusando configuração ausente. GX040 acrescenta **global-dependency-audit** com JSON integral e exit status original; alertas locais não são removidos ou filtrados para tornar a CI verde. Build, typecheck e saúde do monorepo continuam workflows separados. Referência de aprovação é o SHA do recibo/PR, não uma contagem de execução antiga.

## Segurança residual

Os alertas [http-cache-semantics HIGH](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) e [deepmerge LOW](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) continuam sem versão corrigida indicada nas fontes primárias consultadas. Os patches locais GX030 e `scripts/audit-staging/gx030-security.mjs` permanecem, com fixtures nos consumidores Expo reais. Isto comprova mitigação testada nos caminhos descritos, não correção upstream nem revisão independente. **SECURITY ACCEPTED continua NO-GO.** Não ignorar advisories, remover pacotes artificialmente do inventário ou renomear versões para esconder o resultado.

Correções novas: bloqueio explícito de autoaprovação mesmo após troca de papel; validação do comprimento real da senha decodificada; perfis TLS separados; DNS público candidato sem redes privadas/reservadas/documentação; cadeia pública/SNI/hostname mantidos; identidade/scopes/revogação por solicitação; corpo/concorrência delimitados e erros sem dados privados. Teste TLS negativo usa servidor local hostil com SAN correto e certificado não confiável; não é prova de uma instância Render.

Os tokens técnicos antigos continuam autoridade global do plano **sintético**. Nunca fornecê-los a tenants. Usuário/organização/papel do prompt ou de claims arbitrárias não substituem principal derivado de OIDC+SQL. Quando extensões estão desligadas, a atestação não cobre grants preexistentes de suas tabelas; antes de dados reais, revisar todos os privilégios e desativar a superfície técnica de teste conforme arquitetura aprovada.

## Infraestrutura e aceite

Inventário Render reconsultado: quatro serviços Academy Free, datas de atualização2026-09-08, nenhum PostgreSQL. Nenhum recurso OMNIX, custo novo, transferência, domínio, produção ou migração remota foram executados. Comparação A/B/C/D e pré-flight da revisão independente: `deploy/render/README.md`.

O perfil externo público é somente candidato. Sem revisor humano designado, destino real, cadeia/hostname/ACL confirmados, orçamento/franquia vigente e restore remoto, **não ativar**. Não iniciar expiração Free sem caminho viável. O pacote próprio evita dependência de Railway, mas ainda exige servidor autorizado identificado e operação demonstrada.

- CODE READY: candidato local para revisão; validar CI do commit final e suas falhas explicitamente registradas.
- DEPLOYED / INTEGRATED / E2E VERIFIED: provas locais/CI são separadas de operação remota; portal público integrado ainda NÃO COMPROVADO.
- SECURITY ACCEPTED / CUSTOMER SAFE: NO-GO; revisão humana, identidade real, retenção/exclusão, suporte e infraestrutura faltantes.
- MCP READY: candidato privado testado; publicação e interoperabilidade externa NÃO COMPROVADAS.
- COMMERCIAL READY: intake sintético testado; recebimento humano, condições e abertura a interessados reais pendentes.
- FIRST CONTRACT / FIRST REVENUE: NÃO COMPROVADOS; nenhum pagamento ou contato comercial executado.

Checklist de revisão: examinar o diff/migrações/grants; reproduzir testes; validar artifacts exatos; designar revisor independente; aceitar separadamente ingress/modelo de banco e depois provar o endpoint; configurar e testar IdP/recuperação/MFA; aprovar retenção/suporte/recebimento; autorizar ativação específica. Manter PR456 e PR45 em rascunho, sem merge nem produção.
