# GX-01.7 — fechamento de dependências

TESTADO no checkout GX017, pnpm10.28.1/Node24.19.0. O comando pnpm audit --json --registry=https://registry.npmjs.org terminou com exit1 antes e depois: **10 ocorrências (5high/4moderate/1low) → 4 (3high/1moderate)**. Zero critical em ambos. Não é aprovação de segurança nem aceite residual. Fontes completas e hashes: [evidence](evidence/manifest.json).

| Componente | Decisão e prova | Limite |
|---|---|---|
| Zod | api-zod e dashboard4.6.6; record com chave explícita; contrato de relatório GX016 preservado; gerador Orval explicitamentev4 | catálogo3.25.76 permanece no mobile e lib/db; auditoria global HIGH aberta |
| image-size | Metro1.2.1→2.0.3, override apenas metro; patch exato Metro0.83.3 para getAssetData ler bytes; fixtures Buffer+caminho+PNG real do Router | bundle iOS Windows200; build completo Linux validado no candidato de código |
| uuid | xcode e @expo/ngrok→11.1.1; require/v4 reais, buffer pequeno rejeitado | ngrok apenas importado; nenhum túnel |
| postcss-selector-parser | typography6.0.10→7.1.6; utilitário real e build dashboard | não migra todos os parsers globais |
| esbuild | override existente0.27.3→0.28.1 e dependência direta API | transformação/build testados; não há servidor esbuild exposto |
| decode-uri-component | tentativa0.5.0 rejeitada: query-string7.1.3 require retornou namespace, TypeError | override removido;0.2.2 MODERATE mantido explicitamente |

Não usamos audit fix --force, ignore-advisories ou migração indiscriminada. minimumReleaseAge1440 preservado. O resultado intermediário de3high foi obtido com decoder incompatível; **não** é o resultado retido. Ver patched-compat.log e retained-audit-groups.json. Registry release metadata registra idade/exports e versões selecionadas; uma versão mais recente não prova remediação de advisory.

Referências primárias: [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [migração Zod4](https://zod.dev/v4/changelog), [Orval](https://orval.dev/docs/guides/zod/), [esbuild0.28.1](https://github.com/evanw/esbuild/releases/tag/v0.28.1). Consulta24/10/2026 local. Atualização de lock exige nova auditoria; resultado depende do feed consultado.

Reprodução: pnpm install --frozen-lockfile; node scripts/audit-staging/security-compatibility.mjs; node scripts/audit-staging/codegen-smoke.mjs; pnpm --filter @workspace/api-server build; pnpm audit --json --registry=https://registry.npmjs.org. Ambiente e comandos integrais no recibo de execução. [Decisões residuais](RESIDUAL_RISK_DECISIONS.md).

O candidato inicial e a primeira correção móvel tiveram GXEON Build FAIL (recibo source-candidate-ci.json). A suíte inicial cobria getAssetSize(Buffer), mas getAssetData passava filename à API removida em image-size2. O patch versionado patches/metro@0.83.3.patch adapta somente esse callsite para Buffer e é verificado pelo pnpm frozen install. O fixture agora chama getAssetData com arquivo próprio e unmatched.png real do Router. Não foi ignorado o check global.

Uma falha local independente do Babel foi corrigida declarando babel-preset-expo54.0.10, já presente via Expo, como dependência direta da configuração que o referencia. O lock re-resolve alguns edges Babel para versões patch já presentes e um peer context do preset; não migra o Expo SDK. Oito grupos de compatibilidade e lint32 passaram. O script de build mostra somente identificadores limitados de erro, sem body/stack/codeframe/env. [Justificativa do patch](../../../patches/README.md).
