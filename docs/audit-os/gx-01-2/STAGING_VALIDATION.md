# GX-01.2 — homologação isolada

O harness compõe o frontend React/Vite compilado e a API Express existentes com o schema audit_* existente. Não há nova implementação do motor de auditoria. O banco usa PostgreSQL 17, credenciais aleatórias locais e papel gx01_app sem superuser, criação de banco ou criação de papel. O entrypoint auditStagingServer.ts é exclusivo de teste e não é importado pelo servidor de produção.

## Reproduzir

Requisitos: Node 24, pnpm 10.28.1, Git, Docker com Compose e portas locais livres 55432, 3479 e 5174. O Compose contém somente PostgreSQL; os dois aplicativos Node rodam no host. Rede do banco é interna e a porta publicada fica em 127.0.0.1. O volume persiste entre reinícios.

```sh
pnpm install --frozen-lockfile
pnpm run build:libs
pnpm run build:apps
pnpm run stage:audit init
pnpm run stage:audit up
pnpm run stage:audit status
pnpm run verify:audit-staging
pnpm run stage:audit stop
```

init cria .gx012/config.json, admin-password e credenciais aleatórias. Não imprimir esses arquivos, anexá-los nem versioná-los. São ignorados por Git. O ambiente dos filhos é construído por allowlist e não herda credenciais financeiras, provedores ou produção. Arquivos recebem permissões 0600/0700 onde suportado; no Windows prevalecem também as ACLs da conta local. Não usar máquinas compartilhadas sem ACL adequada.

Portas: PostgreSQL 127.0.0.1:55432, API 127.0.0.1:3479, frontend/proxy 127.0.0.1:5174. Health público /api/healthz; health de staging autenticado /api/staging/health; frontend /__stage/health. Controle de desligamento exige credencial independente e fica apenas no staging. Toda criação de caso requer testData=true. Rotas fora do escopo recebem STAGING_SCOPE_ONLY.

Na máquina Windows sem Docker foi utilizado o modo nativo equivalente: definir GXEON_STAGING_PG_BIN com o caminho absoluto de bin do PostgreSQL 17 antes de init. Nenhum serviço Windows foi instalado. PostgreSQL 17.11 veio do pacote binário EDB, SHA-256 conferido `80379b2c04d51c30225532e0ae04509899141e9957ed096fe749d7fd9df8f82f`. Fonte: [binários EDB](https://www.enterprisedb.com/download-postgresql-binaries), [checksum publicado pelo fornecedor](https://github.com/EnterpriseDB/edb-installers/issues/731). Docker será exercitado pelo job isolated-staging, separadamente da prova nativa local.

No Windows deste workspace, os overrides existentes de dependências nativas privilegiam Linux. Para esbuild/rollup foram usados executáveis/pacotes Windows em diretório privado externo, por ESBUILD_BINARY_PATH e NODE_PATH, sem alterar a política minimumReleaseAge nem commitar binários. O preinstall existente requer Bash: npm_config_script_shell aponta para Git Bash somente no processo de instalação. O wrapper local de pnpm tentou reinstalar automaticamente e falhou sem TTY; a CLI pnpm 10.28.1 invocada diretamente executou a instalação frozen com sucesso. As mesmas tarefas padrão rodam em Linux no CI.

## O que é provado

verify.mjs faz chamadas HTTP pela origem do frontend, passando pelo proxy e pela API real até o banco. São 13 grupos: saúde, autenticação/escopo, idempotência concorrente, execução concorrente, revisão e relatório, bypass legado, privilégios SQL, rollback, referências/revisão obsoleta, adulteração de relatório, escrita desativada, reinício de backend+banco e ausência de credenciais em logs/bundle público.

São verificados o novo PID da API, a nova hora de início do PostgreSQL, mesmo caso CLOSED, mesmo reportId, conteúdo, hashes e referências após reinício. api-report.json é artefato obtido pela API; não é evidência de download por navegador. A revisão do fixture é automatizada com credenciais distintas, explicitamente identificada como TEST DATA, e não equivale a aprovação humana da PR.

O teste de rollback adiciona uma constraint NOT VALID exclusiva ao banco sintético e a remove em finally. Não executa migração destrutiva nem toca banco remoto. Casos negativos de integridade são alterados somente pelo administrador do staging e o relatório de aceite é restaurado em finally.

## Retenção, desligamento e exclusão

stop encerra somente as instâncias identificadas pelo config/controle e preserva banco, volume e evidências para revisão. restart reinicia API, frontend e banco e preserva conteúdo. Não há expiração automática nem endpoint de exclusão no GX-01; o operador local é responsável pela retenção.

Manter somente dados sintéticos até a revisão. Depois da aprovação e do prazo definido pelo responsável, parar o staging, exportar evidências necessárias e excluir somente o volume gxeon-gx012_gx012_data ou o diretório .gx012/pgdata da instância conferida. Essa limpeza é manual: confirmar caminho absoluto/instanceId e ausência de dados reais antes de remover. Nunca apontar os scripts para outro banco, serviço ou volume. Credenciais em .gx012 devem ser descartadas junto com a instância. Nenhuma limpeza foi executada nos diretórios temporários cuja remoção foi rejeitada pela política da ferramenta; continuam sob responsabilidade local.

## Evidência

O runner grava .gx012/evidence/acceptance.json com sourceCommit, sourceDirty, IDs, horários, 13 resultados e chamadas sem Authorization/body/segredos. O snapshot sanitizado correspondente será versionado em evidence/. O CI publica apenas .gx012/evidence, nunca a configuração ou logs completos.
