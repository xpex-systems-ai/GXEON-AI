# GX-01.2 — matriz de aceite

Decisão atual: BLOCKED. Resultados locais não substituem o download recebido pelo usuário nem a aprovação humana independente.

| Gate | Resultado | Evidência e limite |
| --- | --- | --- |
| A — stack isolada | PASS local nativo | PostgreSQL 17.11 + API Express existente + frontend compilado, somente loopback; modo Compose coberto por novo job de CI |
| B — ciclo persistente | PASS local | 13 grupos de staging, CLOSED, hashes/IDs/referências preservados após reinício de API e banco; snapshot em evidence/acceptance.json |
| C — segurança | PASS no escopo interno | bypass legado reproduzido/corrigido; papéis, grants, rollback, integridade, logs e falha segura testados; limites em SECURITY_REVIEW.md |
| D — externos | PARCIAL / ação humana | 42 statuses + 27 check runs iniciais classificados; quatro erros de configuração comprovados; permissões/contas/Netlify exigem proprietário |
| E — download | PENDENTE | JSON/attachment/API/SQL/hashes provados; runtime do navegador indisponível, arquivo recebido não homologado; runbook manual pronto |
| F — qualidade/revisão | EM FECHAMENTO | instalação frozen, types, 11/11 PGlite, 11/11 PostgreSQL e lint aprovados localmente; build completo/novo CI em fechamento; revisão humana ausente |

Os estados finais e links de CI serão registrados em FINAL_REPORT.md e no snapshot do HEAD. Não há autorização de merge ou produção. Para READY FOR HUMAN REVIEW, resolver/justificar os externos relevantes, concluir E e confirmar todos os checks técnicos no HEAD final.
