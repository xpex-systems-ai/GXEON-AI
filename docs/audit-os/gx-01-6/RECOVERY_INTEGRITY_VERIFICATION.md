# GX-01.6 — recuperação local comprovada

**LOCAL VERIFIED / TEST DATA.** Apenas processos loopback autenticados desta nova instância e cluster PG17 local próprio. Não foi parado/reconfigurado recurso externo nem apagado banco/volume anterior.

O primeiro ensaio falhou: singleton pg sem listener de erro ocioso encerrou Node durante stop do banco; proxy retornou indisponibilidade em vez do contrato esperado da API. O registro de exceção podia incluir objeto client. A correção captura o evento com mensagem estática. Regressão nova scripts/audit-staging/recovery-failures.mjs entrou no CI antes do restore; erro esperado não imprime segredo. Há recuperação best effort da própria fixture no finally.

Ensaio corrigido: status PASS, API parada e recuperada; banco parado com API viva → 503 JSON sanitizado; banco voltou e API recuperou **sem reinício**; 3 leituras idênticas; contagens antes/depois {"cases":"3","evidences":"3","findings":"6","reports":"2"}. matchesPersistedRecord=true; noRecordMutation=true. [Resultado completo](evidence/local-recovery-failures.json).

Restore: PASS; dump 49865 bytes, SHA256 6903d66500ecc969897241f3622914e2f7c375b9acb7638cced9331e09b3a565; banco novo gx01_restore_1f50bc1bbbe94da4bbf45eaa590456c0; existingDatabaseOverwritten=false. Cinco tabelas comparadas por contagem e hash canônico, relatório/evidência/referências revalidados no restore e após restart do PostgreSQL. Arquivo privado de dump e banco restaurado preservados, sem upload nem exclusão. [Resultado](evidence/local-backup-restore.json).

Relatório sintético: caso b1466091-e285-45c2-bed2-df0f50447133; relatório 706bf5bb-38cf-4a4b-9788-25a0a08059c0; SHA256 581b5661b3edbed378c95cfac8e45ee2b369af8f72f29dea61fce8b5fb5bb286; CLOSED, uma evidência, dois achados. browserDownloadVerified=false: a origem deste JSON é a API, não recibo do navegador.

Falha de orquestração registrada: primeira execução dos testes PG ocorreu em paralelo ao verify que reiniciava o MESMO cluster e falhou 57P03 antes de criar schema. Após conferir schema ausente, testes rodaram sequencialmente sem reset/limpeza e passaram 16/16. Não atribuir essa falha ao produto nem escondê-la. Não rodar testes de restart/restore/failure concorrentes com outros consumidores desse cluster.

RPO/RTO de provider, backup remoto criptografado, recuperação de zona e restauração de dados de clientes: NOT TESTED. Não há promessa de disponibilidade baseada neste ensaio.

Reprodução Linux/PG17 CI candidato: recovery/restore PASS,14gruposPASS, sourceDirty=false, PostgreSQL server_version_num=170011; caso fefdc05f-00a3-41b9-bcf1-9b4ba20a4243, relatório 3f15ead6-13cd-41cf-aafb-5a510efb7b62, SHA256 d32f352ec1f607972c7a34be769fb11253ebdf5afca7d4ed9be22c3dc922bf55. [Recovery CI](evidence/ci-candidate-candidate-gx012-isolated-staging--recovery-failures.json), [restore CI](evidence/ci-candidate-candidate-gx012-isolated-staging--backup-restore.json), [manifest de artefatos](evidence/ci-candidate-artifact-manifest.json). JSON recebido via API/CI, nunca rotulado como download pelo navegador.
