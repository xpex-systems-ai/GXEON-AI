# Dependências — audit ainda falha

GX-01.5 · 2026-10-21 · PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT · integração main · estado global **BLOCKED**. Implementação e testes não equivalem a aprovação humana ou autorização de deploy.

pnpm10.28.1, instalação frozen, minimumReleaseAge1440 preservado. Histórico GX014:74 ocorrências/51altas. Snapshot GX015 antes:76 (52altas/19moderadas/5baixas/0críticas),75advisories; depois:58 (38altas/16moderadas/4baixas/0críticas),57advisories. O feed incluiu dois novos alertas de markdown-it; contagens históricas não foram reaproveitadas. **pnpm audit --json exit1: BLOCKED**, não PASS.

| Override restrito ao pai | Versão anterior → corrigida | Justificativa |
| --- | --- | --- |
| typedoc>markdown-it | 14.1.1 →14.3.3 | correções de DoS/HTML/smartquotes; mesma major |
| markdown-it>linkify-it | 5.0.0 →5.0.2 | parser de links; mesma major |
| orval>js-yaml | 4.2.0 →4.3.2 | parsing YAML de codegen; mesma major; 4.3.2 já existia em outro caminho |
| ajv>fast-uri | 3.1.2 →3.1.8 | referências URI em validação/codegen; mesma major |

As versões anteriores devem ser conferidas no diff do lockfile, que é a fonte autoritativa. [Datas oficiais de publicação](evidence/package-release-ages.json) foram verificadas antes de adotar. Não houve override global de js-yaml3 nem atualização cega do Expo, XML ou linha0.x. A geração usa fixture YAML local com referência interna, markdown real da toolchain e compilação do cliente em diretório novo; clean:false; fontes geradas do repo preservadas. [Prova codegen](evidence/local-codegen-smoke.json). Typecheck/build/API/PG/staging regredidos. Correções não demonstram ausência de todos os exploits possíveis.

## Registro completo e encaminhamento

[Registro por advisory/versão com todos os caminhos](evidence/dependency-risk-register.json), [antes comprimido](evidence/dependency-before.json.gz), [depois comprimido](evidence/dependency-after.json.gz). Há 38 linhas altas, cada uma com versão, direta/transitiva, paths, uso, alcance inferido, patch, compatibilidade, mitigação, risco, responsável proposto e prazo. Metadata de ocorrências não deve ser confundida com quantidade de paths. A classificação runtime/dev deriva do caminho e do grafo, não somente do campo dev do audit.

Nenhuma dependência alta desse snapshot aparece nos inputs retidos do bundle dedicado; isso delimita alcance de requisição, **não aceita risco do build/mobile**. Restam undici, ws, brace-expansion, js-yaml3, tar, @xmldom/xmldom, image-size, node-forge, http-cache-semantics, braces e compression principalmente no Expo/Metro. O build geral ainda executa ferramentas desses caminhos. Usar apenas fontes/fixtures confiáveis e CI isolado sem segredos de produção; não expor Metro/túneis. Esbuild0.x e postcss-selector-parser6→7 exigem revisão própria; sem patch no feed permanece aberto.

Responsável ainda a designar por xpex-systems-ai; prazo proposto para altas2026-10-28, restantes2026-11-04. Não são compromissos aceitos. Antes do piloto: responsável revisar cada linha, corrigir com regressão ou documentar aceite formal específico de advisory/versão/path/escopo/prazo/controle compensatório e evidência. accepted=false em todas as linhas. Não remover checks nem maquiar exit1.
