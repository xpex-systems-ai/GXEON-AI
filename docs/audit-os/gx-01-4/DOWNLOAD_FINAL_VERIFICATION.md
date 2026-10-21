# GX-01.4 — download real

**BLOCKED / NÃO COMPROVADO.** Seguido o [roteiro GX-01.3](../gx-01-3/DOWNLOAD_ACCEPTANCE.md). Em 2026-10-20, cua.getState falhou antes de abrir página: failed to write kernel assets: O sistema não pode encontrar o caminho especificado. (os error 3).

Nenhum clique Exportar, novo caso UI, evento de download, caminho fornecido pelo navegador ou arquivo recebido foi observado. A restrição histórica ao gerenciador não foi contornada por filesystem, CDP ou outra interface. Artefato de API/CI não comprova recepção pelo navegador.

## Roteiro manual autorizado

Usar checkout limpo do SHA da entrega e máquina com recursos suficientes, PostgreSQL 17 local/Docker isolado e dados sintéticos. Nunca usar URL remota/produtiva. O proprietário designa a pessoa revisora e distribui duas credenciais sintéticas em canal privado; não anexar .gx012/config.json.

1. pnpm install --frozen-lockfile; pnpm run build:libs; pnpm run build:apps; pnpm run stage:audit init; pnpm run stage:audit up.
2. Abrir http://127.0.0.1:5174/audit-os em navegador permitido. Criar caso novo TEST DATA, autorização sintética, ambos checks e referência test-fixture/vercel.json. Conteúdo: {"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}.
3. Executar e conferir evidências/achados; revisar com credencial distinta e referência nominal autorizada. Revisão do caso sintético não é aprovação independente do código. Finalizar como operador, registrar CLOSED, caseId/reportId.
4. Clicar Exportar, confirmar o arquivo JSON recebido e registrar nome/caminho disponibilizados pelo navegador. Se política impedir inspeção, parar essa etapa e manter BLOCKED; não adivinhar caminho.
5. Somente com leitura e caminho autorizados: node scripts/audit-staging/verify-report.mjs "CAMINHO_ABSOLUTO_AUTORIZADO_DO_ARQUIVO.json".
6. pnpm run stage:audit restart; repetir o verificador no mesmo arquivo; pnpm run stage:audit stop.
7. Exigir JSON válido, IDs corretos, CLOSED, revisão, evidências/achados íntegros, referências válidas, hash da evidência e SHA canônico, igualdade de todo envelope e **matchesPersistedRecord=true** antes/depois do restart da API e banco. Preservar prova sanitizada segundo retenção definida.

| Campo | Preenchimento humano |
| --- | --- |
| Identidade autorizada / data / navegador / SHA completo | PENDENTE |
| Caso novo TEST DATA / papéis distintos / revisão nominal | PENDENTE |
| caseId / reportId / CLOSED | PENDENTE |
| Nome/caminho autorizado e arquivo recebido | PENDENTE |
| SHA-256 / integridade / referências | PENDENTE |
| matchesPersistedRecord antes/depois do restart | PENDENTE |
| Evidência, decisão e assinatura | PENDENTE |

Responsável pela designação: xpex-systems-ai. Pessoa revisora independente ainda não designada. Codex não assina esses campos.
