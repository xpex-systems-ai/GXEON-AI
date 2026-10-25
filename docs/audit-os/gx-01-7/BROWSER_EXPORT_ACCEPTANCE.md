# GX-01.7 — aceite da exportação no navegador

**TESTADO PASS local** em24/10/2026, IAB, http://127.0.0.1:5174/audit-os. A interface agora prepara um Blob validado e oferece link persistente acessível **Baixar relatório JSON**. Revoga a URL no unmount/substituição e retira link ao trocar papel/caso. A mensagem pede conferência do arquivo; não declara recebimento por um clique.

O link visível foi entregue pela capacidade suportada downloadMedia, sem varrer Downloads/perfis e sem substituir por resposta capturada da API. O caminho de retorno foi usado para ler somente esse arquivo. Nome audit-716e50a9-9e27-4847-b254-3b525ad7055c.json;4185 bytes. SHA256 do arquivo7481d153021c6eb87e634e867893206250422dfcd35e9b83216e6e7682029fea. SHA canônico do relatório ba854b50c2b78e439e190b911752a6669971e860e3240802033b43afe4f4d899. Hash do arquivo formatado difere do hash canônico por definição.

Caso716e50a9-9e27-4847-b254-3b525ad7055c; relatório39beda61-e40b-4307-a735-6015a2e03d77; CLOSED; testData=true;1 evidência/2 achados. verify-report.mjs validou hash canônico, hash de conteúdo e evidenceIds; igualdade integral com envelope persistido **antes e depois** de reiniciar API+PG. O mesmo arquivo recebido foi reutilizado; nenhum novo download substituiu a prova após restart.

[Recibo antes](evidence/browser-before-restart.json), [depois](evidence/browser-after-restart.json), [captura](evidence/browser-export.png). Prova local não cobre navegador/infra remoto nem parecer humano. Duas tentativas iniciais tiveram timeout de UI/health, preservadas no registro; não foram contadas como PASS. O GX016 sem recibo continua sendo histórico BLOCKED; somente a nova prova encerra o gate local GX017.

Reprodução humana: subir fixture própria por README staging; carregar caso com token operador; ExportarJSON→Baixar relatório JSON; executar node scripts/audit-staging/verify-report.mjs <arquivo_recebido>; reiniciar instância própria e repetir com o mesmo arquivo. Nunca usar credenciais/dados de cliente ou fazer review automatizado de um caso real.
