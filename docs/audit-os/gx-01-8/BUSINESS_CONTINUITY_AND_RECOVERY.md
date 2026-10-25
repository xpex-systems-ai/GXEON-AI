# GX-01.8 — continuidade, recuperação e operação proposta

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

**PASS local; remoto NOT TESTED.** PG 17.11 nativo isolado, novos bancos GX018, nenhuma exclusão/overwrite. [Recovery](evidence/local-recovery-failures.json): parada API e recuperação; parada PG com API viva; 503; reconexão sem reiniciar API; três leituras repetidas; counts antes/depois 3 casos/3 evidências/6 achados/2 relatórios iguais; noRecordMutation=true.

[Backup/restore](evidence/local-backup-restore.json): dump privado 49.837 bytes, SHA25644 e 2 c 267097 cb 20 b 51 ceacbd 16 f 6 b 42045 a 69927 d 7747 dca 05577 be 0 c 12249 f 6; destino NOVO gx01_restore_55d91a90d7db4eaa9cd7d364b19eda4e; targetCreatedNew=true, existingDatabaseOverwritten=false. Cinco tabelas tiveram counts/hashes iguais; relatório CLOSED conferido no destino antes/depois de restart; relatório da API de origem inalterado. Tempo local do procedimento 20.995 ms; isso não é RTO remoto. Dump permanece privado em .gx 012/backups, fora do Git e sem upload; banco restaurado/volume foram preservados.

Atomicidade/idempotência/races: integração testa falha injetada com rollback completo, intake/run/finalize concorrentes, referência inválida/stale review e imutabilidade CLOSED. Limites dedicado: pool 4, connection Timeout 5 s, statement_timeout5s, idle 30 s; admission 4; replicas 1 proposta. Não houve prova de failover HA, kill no meio de cada commit SQL ou restore produtivo. Não prometer disponibilidade contínua.

| Objetivo/política proposta | Valor/ação para decisão | Situação |
| --- | --- | --- |
| RPO de homologação | até 24 h com backup diário e antes de mudança aprovada | alvo proposto, não medido/aprovado remotamente |
| RTO de homologação | até 4 h com owner disponível, backup/CA/digest acessíveis e restore separado ensaiado | alvo proposto, sem SLA/garantia; disponibilidade humana e custo pendentes |
| Dados sintéticos remotos | janela 30 dias; revisão ao fim; retenção de evidência operacional 90 dias proposta | sem execução de purge; owner/jurídico decidem prazos e preservação de incidentes |
| Logs | categorias event/request Id/method/route/status; sem headers/body/queries/param IDs; acesso mínimo; retenção 30 dias proposta | logger dedicado testado; sink/alertas remotos não configurados |
| Backups | diário+pré-mudança; criptografia, acesso segregado, cópia separada; 7 diários+4 semanais propostos | destino/keys/rotina/restores e custo não aprovados |
| Incidentes | suspender intake; preservar recibos/logs/hashes; registrar UTC, impacto/escopo; notificar owner via canal por ele definido | canal/plantão/autoridade e obrigações legais pendentes; sem envio automático |
| Suporte | janela comercial e contato responsável a definir; registrar ticket/repro/SHA | sem SLA, on-call ou promessa contratual |

Runbook futuro: confirmar autorização/ambiente correto; coletar diagnóstico de health/ready e IDs sem segredos; bloquear novos casos se integridade falhar; manter origem e criar destino novo; obter backup por canal seguro; restaurar com role apropriada; validar cinco tabelas/hashes/grants/relatório; conectar API só após parecer do responsável; testar arquivo remoto real; registrar duração/RPO observado/custo e decisão. Não restaurar sobre origem, nem apagar volume/dump para economizar. Em vazamento, isolar e preparar rotação pelo owner; não publicar payload/credencial no incidente. Gatilhos de parada e orçamento em [modelo](HOMOLOGATION_COST_MODEL.md). [Formulário de acesso/retention/backup](REMOTE_EXECUTION_AUTHORIZATION_REQUEST.md).
