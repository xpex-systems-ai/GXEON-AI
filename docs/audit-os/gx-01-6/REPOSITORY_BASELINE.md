# GX-01.6 — baseline reconciliado

Consulta: 2026-10-24T18:17:37.808Z. Referência e HEAD remoto 5b58ead338a24ff168a43a2d71fc2639c355afb4; branch codex/gxeon-audit-os-v1-gx01; base main dbc29fff9a2c55487f85a83db597f41c493af7a8. PR456 OPEN/DRAFT, merged=false, nenhuma revisão formal. Os quatro workflows reconsultados deste SHA retornaram success; são baseline histórico para esta missão, não aprovação de um futuro commit. [Fonte](evidence/baseline.json).

O delta GX015 tem 76 arquivos e foi inspecionado: runtime/factory/config/PG, subpath de pool, testes/build/CI, overrides e mensagem UI; 14 documentos. [Diff preservado](evidence/gx015-diff.patch.gz), [entrega GX015](../gx-01-5/FINAL_DELIVERY.md). O complemento de memberships está no HEAD 5b58ead e foi distinguido do candidato 1c102b4; provas finais de 21/10 preservadas fora deste checkout.

Checkout GX016 separado criado do HEAD confirmado; nenhum reset/clean/prune/exclusão/overwrite do checkout anterior. Os checkouts GXEON-AI e GXEON-AI-gx015 e o PostgreSQL17 oficial anterior foram localizados antes do uso. Disco disponível inicial ~17.35 GB. Nenhum AGENTS.md encontrado no checkout nem ancestrais relevantes. Colisão Windows preexistente .github/PULL_REQUEST_TEMPLATE.md vs lowercase reaparece como modificação local: não incluir no commit nem alegar sourceDirty=false local. O mockup gerado do checkout GX015 e as alterações do checkout original continuam preservados.

Status combinado padrão: 30 (23 failure/7 success). Mesmo SHA com per_page=100: 42 (29 failure/13 success), 29 check-runs e 0 reviews. A diferença é paginação/truncamento, não 12 novos recursos; identidade de contexto/status também não é identidade única de projeto. [Resposta padrão](evidence/baseline-status-default.json), [completa](evidence/baseline-status-full.json).

Autorizado: correções/testes seguros na branch, documentação, consultas e pacote de revisão. Não autorizado: merge, produção, provisão paga, DNS, recursos externos, finanças, dados privados ou aprovação humana simulada. Estado inicial **BLOCKED**. Novos resultados serão vinculados a seu próprio SHA.
