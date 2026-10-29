# GX-01.6 — pacote de decisão independente

**BLOCKED — INDEPENDENT REVIEWER NOT ASSIGNED.** Zero review formal na consulta inicial. Codex é implementador e não pode aprovar a própria mudança. A fixture reviewer de testes comprova separação de papel técnico, não revisão humana independente.

Ler nesta ordem: REPOSITORY_BASELINE, DEPENDENCY_REMEDIATION_MATRIX + JSON integral, RESIDUAL_SECURITY_RISKS, DEDICATED_RUNTIME_SECURITY, BROWSER_EXPORT_EVIDENCE, RECOVERY_INTEGRITY_VERIFICATION, TLS_NETWORK_DATABASE_GATES, EXTERNAL_STATUS_RECONCILIATION, FIRST_PILOT_QUALIFICATION, ACCEPTANCE_MATRIX e FINAL_DELIVERY. Evidências CI devem apontar ao SHA completo examinado, não ao último commit de outra fase.

Modelo de ameaças: operador malicioso/credencial roubada, reviewer sem independência, artifact hostil com segredo/JSON inválido ou grande, chamada sem autorização, DoS/carga/pool, rotas fora de escopo, vazamento em log, corrupção de DB/hash e supply chain em CI. Fronteiras: navegador→API autenticada, API→DB privado, papéis separados e pipeline→artefato. Escopo é um vercel.json sanitizado por caso, sem fetch de URL nem execução de comandos fornecidos.

Checklist do revisor (sem marcar como aprovado):

- Confirmar diff/HEAD/branch/base e integridade de evidências; distinguir fixture de aprovação humana.
- Verificar surface dedicada/boundary, auth/write gates, CORS/admissão, payload/encoding/timeouts e logs; testar bypasses com credenciais próprias de homologação.
- Examinar cada advisory/cadeia, Zod em runtime, correções/mitigações e residual sem waiver implícito; exigir follow-up/migração ou aceite nominal com prazo.
- Reproduzir CLOSED/transação/rollback/idempotência/hash/reference; verificar que hash não é assinatura independente.
- Executar gate de arquivo REAL recebido pela UI antes/depois do restart.
- Reproduzir stop API/PG e restore em banco novo; não tocar produção ou excluir provas.
- Homologar TLS/hostname/rede/grants remotos quando autorizado; conferir segredo/isolamento e orçamento real.
- Revisar retenção/support/scope/preço proposto e todas as limitações; não afirmar certificação/compliance.

Formulário exclusivamente humano (não preenchido):

| Campo | Valor |
|---|---|
| Revisor GitHub / nome / vínculo | |
| Declaração de independência / autorização | |
| SHA completo / base / URL da PR | |
| Data / ambiente / evidências reproduzidas | |
| Decisão: APPROVED / APPROVED WITH CONDITIONS / CHANGES REQUESTED / REJECTED | |
| Condições, riscos aceitos nominalmente e vencimento | |
| Gates ainda fechados / responsável / prazo | |
| Assinatura ou review verificável | |

Mesmo APPROVED não autoriza merge, provisão paga ou produção. Piloto exige autorização específica de escopo/orçamento e fechamento dos gates pertinentes.
