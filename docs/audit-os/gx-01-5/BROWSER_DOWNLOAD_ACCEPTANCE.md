# Download pela interface — BLOCKED

GX-01.5 · 2026-10-21 · PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT · integração main · estado global **BLOCKED**. Implementação e testes não equivalem a aprovação humana ou autorização de deploy.

O inventário do navegador respondeu nesta execução, mas criação da aba localhost no IAB expirou esperando Browser webview attach. Nova sessão Edge expirou e resetou o kernel. Não foi possível concluir interação/autenticação/export pela UI. Nenhuma política, gerenciador de downloads, CDP ou filesystem de perfil foi contornado. **browserDownloadVerified=false**. O sucesso de Content-Disposition/artefato API/CI não fecha este gate.

O texto da UI foi corrigido para “Arquivo do relatório preparado. Confira o download recebido no navegador.” A ação link.click não prova recebimento do arquivo.

## Roteiro manual para pessoa autorizada

1. Em ambiente isolado aprovado e iniciado pelo runbook GX012, abrir http://127.0.0.1:5174/audit-os. Credenciais sintéticas locais ficam no arquivo privado .gx012/config.json; não enviar seus valores a chat/log/relatório.
2. Operador: registrar nome TEST DATA, referência do ativo, autorização explícita/reference e requestId; manter testData=true. Submeter vercel.json sanitizado. Pode usar o exemplo inseguro deliberado de rewrite global sem headers, identificado como fixture.
3. Executar somente vercel_api_routing e vercel_security_headers. Conferir escopo, uma evidência, hash e referências dos achados (fixture insegura produz dois achados; outros arquivos podem produzir resultado diferente).
4. Revisor autorizado distinto: conferir conteúdo e referências; inserir sua credencial, decisão e referência nominal da revisão. Fixture automatizada não substitui esta etapa de aceite humano.
5. Operador: encerrar, confirmar CLOSED e exportar. Conferir que o navegador recebeu audit-CASE_ID.json no caminho explicitamente escolhido. Registrar filename/caminho autorizado e data, sem credenciais.
6. Executar: node scripts/audit-staging/verify-report.mjs "CAMINHO_AUTORIZADO_DO_JSON". Exigir testData=true, IDs, hashes/referências válidas e matchesPersistedRecord=true. Guardar saída sanitizada e SHA256do arquivo recebido.
7. Reiniciar apenas API/banco isolados via stage:audit restart; executar o mesmo verificador no MESMO arquivo e comparar todos os IDs/hashes, matchesPersistedRecord=true. Não regenerar o arquivo pela API para suprir o download.
8. Pessoa autorizada assina resultado, identidade/data/HEAD e limitações. Se falhar, preservar arquivo/estado, registrar erro e manter BLOCKED.

Referência: [roteiro GX014](../gx-01-4/DOWNLOAD_FINAL_VERIFICATION.md). [Artefato API local](evidence/local-api-report.json), [staging após restart](evidence/local-acceptance.json), [restore](evidence/local-backup-restore.json) são provas técnicas distintas e não download.
