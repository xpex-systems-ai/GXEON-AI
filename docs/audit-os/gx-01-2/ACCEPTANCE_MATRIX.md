# GX-01.2 — matriz de aceite

Decisão atual: BLOCKED. Resultados locais não substituem o download recebido pelo usuário nem a aprovação humana independente.

| Gate | Resultado | Evidência e limite |
| --- | --- | --- |
| A — stack isolada | PASS nativo e CI Compose | PostgreSQL 17.11 + API Express existente + frontend compilado, somente loopback; evidence/acceptance.json e ci-acceptance.json |
| B — ciclo persistente | PASS local | 13 grupos de staging, CLOSED, hashes/IDs/referências preservados após reinício de API e banco; snapshot em evidence/acceptance.json |
| C — segurança | PASS no escopo interno | bypass legado reproduzido/corrigido; papéis, grants, rollback, integridade, logs e falha segura testados; limites em SECURITY_REVIEW.md |
| D — externos | CLASSIFICADOS / BLOQUEIOS EXPLÍCITOS | 42 statuses + 27 check runs iniciais e 42+28 do commit de implementação classificados; causas/limites e ações por item; permissões/contas/Netlify exigem proprietário |
| E — download | PENDENTE | JSON/attachment/API/SQL/hashes provados; runtime do navegador indisponível, arquivo recebido não homologado; runbook manual pronto |
| F — qualidade/revisão | PASS técnico / revisão humana pendente | instalação frozen, types, 11/11 PGlite, 11/11 PostgreSQL, lint e 13 grupos de staging; quatro workflows aprovados no commit de implementação. Build completo Linux PASS; build mobile local Windows falha em fetch Metro, registrado como limite local |

Estados e links de CI estão em FINAL_REPORT.md e evidence/ci-source-head.json. O HEAD documental entregue será rechecado na PR. Não há autorização de merge ou produção. Para READY FOR HUMAN REVIEW, resolver/justificar os externos relevantes, concluir E e confirmar todos os checks técnicos no HEAD final.
