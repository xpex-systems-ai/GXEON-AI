# GX-01.8 — cadeia de evidências local verificada

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

**LOCAL VERIFIED. REMOTE: NOT TESTED, BLOCKED — AUTHORIZATION REQUIRED.** Nova execução 25/10; os IDs abaixo são novos, não o arquivo GX 017. O fixture mantém rótulos históricos GX 01.3/GX016 e versiongx 01.5 nos scripts; timestamps e recibos identificam a execução GX 018. São dados de teste, com revisão de credencial automatizada; nenhum cliente/revisor humano é representado.

| Identificador/propriedade | Valor observado |
| --- | --- |
| Caso | 95826906-5906-4560-9 e 78-e 8 f 6 f 442856 e |
| Relatório | 5 d 8 b 4941-4 f 89-4 be 7-a 594-624 c 51 d 9 f 618 |
| Estado / dados | CLOSED / test Data=true /1 evidência/2 achados |
| Arquivo recebido por IAB download Media | audit-95826906-5906-4560-9 e 78-e 8 f 6 f 442856 e.json /4.185 bytes |
| SHA256 dos bytes do arquivo | 86c87f8f879615afe538d4f567af96a9c26b95b7648dc37ca2bf4214d3b6dff2 |
| Hash canônico do conteúdo do relatório | 91866d2d8b7a5b5f2a6d002b9ff298307c37ab34c2a92ba871042f3926e353b7 |
| Antes/restart/restore | Mesmo arquivo recebido, mesmos bytes/hash/IDs/estado; matchesPersistedRecord=true e browserDownloadVerified=true nos três recibos |

Provas: [browser-before-restart.json](evidence/browser-before-restart.json), [browser-after-restart.json](evidence/browser-after-restart.json), [browser-after-restore.json](evidence/browser-after-restore.json), [browser-export.png](evidence/browser-export.png), [browser-received-report.json](evidence/browser-received-report.json). A cópia publicada do arquivo é sintética; hash do arquivo preservado. [local-api-report.json](evidence/local-api-report.json) é prova auxiliar, não substitui download do browser. Os scripts HTTP de CI/falha/restore mantêm browserDownloadVerified=false corretamente; a evidência do browser é separada.

Procedimento executado: abrir /audit-os no IAB com app própria loopback; carregar o caso CLOSED com token sintético; Exportar JSON; usar o link persistente Baixar relatório JSON; obter caminho retornado pelo download Media (sem enumerar Downloads); ler exatamente esse arquivo; executar scripts/audit-staging/verify-report.mjs; comparar IDs/hash canônico/evidenceIds e linha persistida; reiniciar API+PG; verificar o mesmo arquivo; realizar recovery e restore separado; verificar novamente o mesmo arquivo e origem. A restauração em novo banco também verificou o relatório por SQL e depois de restart do PG.

Hash do texto registra integridade dos bytes submetidos; hash canônico detecta alteração no relatório. Não são assinatura independente, prova da origem do vercel.json, cadeia notarial ou certificação. Um administrador com acesso suficiente poderia alterar dados e hashes; backup/controle de acesso/revisão independente continuam necessários. UUIDs e reviewedAt automáticos não provam uma revisão humana. sourceDirty=true local e correspondência do candidato estão explicitados em [candidate-binding.json](evidence/candidate-binding.json).
