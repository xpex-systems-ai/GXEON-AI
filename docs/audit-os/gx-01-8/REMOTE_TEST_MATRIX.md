# GX-01.8 — matriz de testes remotos preparada

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

**Todos os testes abaixo: NOT TESTED remotamente / BLOCKED — AUTHORIZATION REQUIRED.** Nenhum PASS local os encerra. Executar somente em recursos dedicados nomeados na autorização; fixtures e dados sintéticos. Prova deve incluir timestamp UTC, SHA/digest, conta/projeto/região, comando sanitizado, status/corpo esperado, hash de artefato e identidade do executor/revisor. Nunca anexar env/dump privado.

| ID | Objeto | Procedimento preparado | Critério de PASS remoto |
| --- | --- | --- | --- |
| R01 | ID do projeto/owner/SHA/digest | ler metadata e comparar aprovação | correspondência exata; sem drift |
| R02 | TLS API+PG | validar cadeia, CA, SAN/hostname e expiração; caso inválido próprio controlado | conexão válida e rejeição rígida; nunca relaxar TLS |
| R03 | Rede privada | inspecionar exposição/rotas e conexão do serviço autorizado | PG sem endpoint público; ambiente segregado |
| R04 | Autenticação/papéis/CORS | fixtures sem token/errado/papel oposto/origem não permitida | 401/403 JSON; sem segredo em resposta/log |
| R05 | Parser/limites | JSON inválido, artifact excessivo, encoding, métodos, rate/concurrency | 400/413/415/405/429/503 delimitados; sem carga invasiva |
| R06 | Grants | transação de teste do app, negar DDL/DELETE/UPDATE evidence | preflight e negativa reais; owner ausente no runtime |
| R07 | Lifecycle/idempotência | um vercel.json sanitizado,2 checks, review fixture, CLOSED | um registro de evidência,2 achados com refs; reuso sem duplicar |
| R08 | Browser export | baixar link real e verificar arquivo recebido | IDs/hash canônico/ref e SHA256 do arquivo conferem; não substituir por API |
| R09 | Restart | reiniciar somente serviço/PG dedicados na janela autorizada | mesmo arquivo/relatório/estado, nenhuma mutação |
| R10 | Recovery | falha própria controlada do PG e reconexão | 503 sem detalhe/segredo; recuperação documentada |
| R11 | Backup/restore | backup criptografado e restore em NOVO banco separado | counts/hashes/relatório equivalentes; origem intacta |
| R12 | Logs/retention/incidente/custos | revisar amostra sanitizada, responsáveis, alertas e consumo | sem payload/token; retenção e custo dentro da aprovação |
| R13 | Revisor/aceite | reproduzir evidências no SHA exato | parecer independente e decisão humana registrada |

Dependências: R01 antes de qualquer escrita; R02–R06 antes de lifecycle; R08–R11 sem mutar o caso CLOSED; R12 durante toda janela; R13 após evidências e risco. Em falha, registrar FAIL, manter recibos anteriores, suspender intake e aplicar somente rollback aprovado. Ações que possam alterar volume/config/billing requerem autorização específica. Testes de rate são fixtures limitadas, não stress/pentest de provedor.

Modelo de recibo por teste: ID; estado; ambiente; autorização Ref; SHA/digest; Project ID; início/fim; comando sem segredos; esperado/observado; evidência SHA; falhas; responsável; próximo passo; parecer. Campos de decisão ficam vazios até preenchimento humano. [Plano](REMOTE_HOMOLOGATION_BLUEPRINT.md), [autorização](REMOTE_EXECUTION_AUTHORIZATION_REQUEST.md), [continuidade](BUSINESS_CONTINUITY_AND_RECOVERY.md).
