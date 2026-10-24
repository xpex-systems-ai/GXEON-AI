# GX-01.6 — fronteira de provas de infraestrutura

| Controle | Estado | Prova / condição faltante |
|---|---|---|
| PG17, roles e grants isolados | LOCAL VERIFIED | Native PG17 e CI service17; grants/membership negatives; sem usar DB de produção |
| Config rejeita DB público/tokens fracos e SSL bypass | LOCAL VERIFIED | auditPilot.test.ts e código rejectUnauthorized=true |
| TLS/hostname/CA remotos | NOT TESTED | Sem endpoint/CA autorizado; configuração de código não estabelece handshake |
| Rede .railway.internal, sem listener público DB | NOT TESTED | Não provisionado; URL interna exigida é validação de entrada apenas |
| Credenciais e permissões na conta real | BLOCKED — AUTHORIZATION REQUIRED | Proprietário deve confirmar titularidade e escopo; não publicar valores |
| HTTPS frontend/API real | NOT TESTED | UI loopback usa HTTP deliberadamente; nenhum transporte remoto validado |
| Falha de autenticação/role | LOCAL VERIFIED | Token ausente/inválido, papel errado e startup PG rejeitado nos testes |
| Falha de conectividade e reinício | LOCAL VERIFIED | recovery-failures: DB parado, API503 e volta sem reiniciar API |
| Backup/restore/hash/grants reais | LOCAL VERIFIED | Restore de fixture em banco novo e hashes canônicos iguais; ACL remoto pendente |
| Rollback e retenção remotos | BLOCKED — AUTHORIZATION REQUIRED | Ensaio e prazo aprovados em ambiente dedicado |
| REMOTE VERIFIED | Nenhum controle de runtime | Inventário read-only acessível não é homologação de TLS/rede/API |

Critérios remotos adicionais: chain confiável, certificado correspondente ao hostname e validade atual; falhar com CA incorreta/hostname incorreto/sem credencial/role elevada; medir statement timeout e reconnect; provar que não há proxy TCP público. Se TLS verificado não existir no serviço escolhido, manter gate fechado e apresentar alternativa para aprovação. Não criar túnel, relaxar SSL ou reutilizar segredo de outro produto.
