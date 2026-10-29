# GX-01.7 — persistência e recuperação

TESTADO com PostgreSQL17.11 dedicado em loopback e dados sintéticos. Nenhuma migração destrutiva remota, cluster anterior ou volume existente foi alterado. Scripts exigem credencial de controle da instância local e nomes de destino isolados; dumps privados permanecem fora do Git.

| Verificação | Resultado |
|---|---|
| Integração workflow+pilot nativo |17/17 PASS |
| Grants mínimos de pilot |1/1 PASS |
| Staging14 grupos |PASS, contratos JSON/roles/transações/restart |
| Falha controlada |primeira execução timeout em health antes da sequência; repetição PASS após restart próprio |
| API parada/reiniciada |registros preservados |
| DB parado com API viva |503JSON sem segredos, recupera sem restart da API |
| Leitura após recuperação |3leituras idênticas, contagens antes/depois3casos/3evidências/6achados/2relatórios |
| Arquivo browser após restart |mesmo hash e envelope persistido |
| Backup/restore |ver recibo backup-restore.json; teste em DB auxiliar exclusivo, sem substituir origem |

[Provas](evidence/manifest.json). Os helpers herdados ainda usam rótulos textuais GX016/GX013 nos fixtures; o recibo identifica o checkout GX017 e data, sem renomear evidência histórica. Um teste local de restore não prova backup offsite, retenção, criptografia, RTO/RPO contratado ou disaster recovery de produção. Esses gates permanecem BLOCKED no [plano remoto](REMOTE_INFRASTRUCTURE_APPROVAL_PLAN.md).

Reprodução sequencial: node scripts/audit-staging/recovery-failures.mjs; node scripts/audit-staging/backup-restore.mjs. Não sobrepor testes que param o mesmo banco. Preservar dumps/logs; acesso restrito; nunca registrar DATABASE_URL/senhas. Backup remoto proposto: RPO24h/RTO4h como alvos sujeitos a aprovação e medição, não garantias observadas.
