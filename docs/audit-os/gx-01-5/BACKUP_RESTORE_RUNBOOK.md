# Backup, restore e recuperação isolada

GX-01.5 · 2026-10-21 · PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT · integração main · estado global **BLOCKED**. Implementação e testes não equivalem a aprovação humana ou autorização de deploy.

**TESTADO localmente:** PG17 nativo em loopback, somente dados sintéticos; backup custom com pg_dump; restore em banco NOVO gx01_restore_77f5984056824692b9e01134dc892ab9; nenhuma base existente sobrescrita. Hashes/contagens de todas as cinco tabelas, relatório CLOSED, conteúdo, IDs e referências iguais; PG reiniciado e dados revalidados; API de origem reiniciada e relatório inalterado. matchesPersistedRecord=true. Dump49845bytes, SHA256 ca2bbbccb0709459a82c4ec3912f3efc858dc2481a9d9b5fd05e8bb45b208c0f; duração observada47447ms. [Evidência completa](evidence/local-backup-restore.json). Não é teste de disaster recovery do provedor ou RTO homologado.

## Reprodução segura

Usar checkout novo com espaço, Node24/pnpm10.28.1 e Docker PG17, ou distribuição PG17 oficial já disponível indicada por GXEON_STAGING_PG_BIN. Nunca remover/limpar cache, volumes, checkout ou evidência anterior para liberar espaço. Não executar em banco compartilhado/produtivo.

1. pnpm install --frozen-lockfile; pnpm run build:libs; pnpm run build:apps.
2. pnpm run stage:audit init; pnpm run stage:audit up; pnpm run verify:audit-staging.
3. node scripts/audit-staging/backup-restore.mjs.
4. Conferir .gx012/evidence/backup-restore.json: targetCreatedNew=true, existingDatabaseOverwritten=false, restoredRecordVerified=true, afterPostgreSQLRestart=true e sourceApiReportUnchanged=true. Artefato só é escrito após todas as asserções.

O script autentica identidade da instância, recusa casos não sintéticos, pausa aplicações próprias, tira snapshot/hashes, dump, prova origem estável e restaura em identificador UUID validado. Não usa --clean/DROP, não substitui base existente. Senha só no ambiente do subprocesso, sem URI em argv; stderr não é publicado. O dump privado e banco restaurado são retidos; nenhuma exclusão automática. A comparação usa todas as linhas das cinco tabelas, não apenas contagens.

O backup não inclui credenciais, roles ou ACLs (--no-owner --no-acl). Para recuperação futura do piloto, owner cria banco NOVO, revisa migration/schema, restaura, recria grants mínimos com aprovação, valida startup/TLS/hash/export e somente então autoriza trocar conexão. O teste local faz validação do restore como administrador isolado; **não comprova cutover remoto com role mínima**. Não aplicar grants ou mudar DATABASE_URL de produção nesta fase.

## Incidentes e rollback

| Incidente | Resposta proposta |
| --- | --- |
| API falha / deploy inválido | manter escritas desabilitadas, validar DB, voltar artefato conhecido; auth/readiness/export antes de reabrir |
| PG reinicia / rede cai | falha503sem concluir caso; restaurar conectividade privada/TLS; retentar requestId idempotente após readiness |
| Migração incompatível | não down-migrate destrutivamente; novo banco restaurado, revisão de compatibilidade e cutover autorizado |
| Corrupção sintética | preservar origem, hash/forense, restore NOVO, verificar evidências/referências e relatório antes de cutover |
| Perda de evidências | restaurar tabela/conjunto transacional em banco novo, comparar hashes completos; divergência mantém bloqueio |

Proposta não homologada: RPO24h com backup diário antes da janela e antes de mudança; RTO60min para volume pequeno; retenção7diários+4semanais em armazenamento privado cifrado e acesso mínimo. Dump local NÃO prova criptografia/backup fora da máquina nem agendamento automático. Titular deve aprovar custo/storage/chaves/retention, executar restore independente e medir RPO/RTO em infra dedicada. Não remover evidências protegidas por retenção proposta.

Fontes: [PG17 SQL dump](https://www.postgresql.org/docs/17/backup-dump.html), [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html). [CI isolado](evidence/ci-validation.json) registra execução Linux quando concluída.
