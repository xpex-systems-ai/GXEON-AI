# GX-01.6 — decisões de dependências

Audit em 24/10/2026: **64 → 10 ocorrências**, **40 → 5 altas**; 18 → 4 moderadas, 6 → 1 baixa, 0 críticas. Exit 1 antes/depois: **FAIL**, sem waiver. São 64 registros por advisory/versão e 53 IDs GHSA distintos; caminhos alternativos estão preservados. [Registro completo](evidence/dependency-triage.json), [antes](evidence/baseline-audit.json.gz), [depois](evidence/remediated-audit.json.gz).

P0 indica superfície de runtime; P1 dependência relevante de produção/pipeline; P2 caminho de ferramenta sem exposição demonstrada no piloto. Severidade do feed fica inalterada. Classificação não equivale a aceite. Dono da implementação: Codex; dono do risco: segurança/revisor ainda não designado. Data de revisão: 24/10/2026. Prazo proposto de reavaliação: antes de qualquer autorização de piloto.

| Módulo | Antes | Depois | Prioridade | Justificativa e compatibilidade |
|---|---|---|---|---|
| body-parser | 2.3.0 | 2.4.0 | P0 | Parser HTTP de runtime; gzip com bytes finais pode encerrar processo. Patch na mesma major e recusa de compressão no piloto. |
| undici | 6.25.0 | 6.29.1 | P1 | Cliente HTTP/WebSocket da CLI Expo no pipeline; respostas hostis podem injetar headers, confundir cookies/filas ou consumir recursos. Ausente do bundle dedicado. |
| ws | 6.2.3 / 7.5.10 | 6.2.6 / 7.5.13 | P1 | Servidores dev Metro/middleware; frames fragmentados hostis. Sem WebSocket na API dedicada. |
| js-yaml | 3.14.2 | 3.15.2 | P1 | Configuração de cobertura Babel/Jest; YAML com aliases/merges/omap pode exaurir CPU. Somente fontes confiáveis no CI. |
| brace-expansion | 2.1.0 | 2.1.7 | P1 | Minimatch da CLI; padrões de glob podem exaurir CPU, memória ou pilha. Nenhum glob fornecido ao Audit OS. |
| @xmldom/xmldom | 0.8.13 / 0.9.10 | 0.8.15 / 0.9.12 | P1 | Configuração plist/XML do Expo; nomes/instruções/doctype podem injetar XML ou provocar consumo quadrático. Backports separados por linha 0.x. |
| compression | 1.8.1 | 1.8.2 | P1 | Servidor da CLI Expo; encerramento prematuro pode vazar memória. Não usado no dedicado. Override apenas @expo/cli>compression. |
| tar | 7.5.19 | 7.5.21 | P1 | Extração/seleção de arquivos da CLI; caminho longo malicioso provoca recursão. Patch na mesma major; arquivo fixture próprio. |
| fast-uri | 3.1.8 | 3.1.9 | P1 | Resolução OpenAPI via Orval/Ajv; esquema/host/caminho malformado pode confundir referências. Override apenas ajv>fast-uri. |

Onze resoluções em nove módulos. ws e XML preservam duas linhas de compatibilidade, sem forçar majors. minimumReleaseAge=1440 preservado; [versões/datas oficiais](evidence/package-release-candidates.json). O lock foi resolvido e a instalação congelada executada, sem editar o lock manualmente.

Testes: fixture HTTP local Undici/compression, echo WebSocket 6/7, roundtrip YAML/brace/plist XML 0.8/0.9, tar create/extract próprios; sete grupos e onze versões PASS. Codegen isolado via Orval/Ajv/fast-uri PASS; nenhuma fonte gerada sobrescrita. A primeira fixture falhou ao resolver @expo/metro sem main export; o resolver foi corrigido para package.json pelas search paths e passou. Nenhum payload destrutivo de DoS foi executado. Build Linux do commit deve ser conferido em FINAL_DELIVERY; build Windows monorepo falhou no timeout de Metro e permanece registrado.

Cada advisory/versão é explícito abaixo. O título é a descrição do vetor do feed, não afirmação de exploração local. A exposição e teste ficam no JSON e nos riscos residuais, incluindo cadeias completas.

| Advisory / ocorrência | Módulo / antes | Patch do feed | Prioridade | Estado | Cadeia(s) |
|---|---|---|---|---|---|
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) #1 | uuid 7.0.3 | >=11.1.1 | P2 | OPEN | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>uuid` |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) #2 | uuid 3.4.0 | >=11.1.1 | P2 | OPEN | `artifacts__gxeon-dashboard-mobile>@expo/ngrok>uuid` |
| [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) #3 | esbuild 0.27.3 | >=0.28.1 | P2 | OPEN | `artifacts__api-server>esbuild` |
| [GHSA-p88m-4jfj-68fv](https://github.com/advisories/GHSA-p88m-4jfj-68fv) #4 | undici 6.25.0 | >=6.27.0 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-vxpw-j846-p89q](https://github.com/advisories/GHSA-vxpw-j846-p89q) #5 | undici 6.25.0 | >=6.27.0 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-g8m3-5g58-fq7m](https://github.com/advisories/GHSA-g8m3-5g58-fq7m) #6 | undici 6.25.0 | >=6.27.0 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524) #7 | undici 6.25.0 | >=6.28.0 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) #8 | undici 6.25.0 | >=6.28.0 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm) #9 | undici 6.25.0 | >=6.28.0 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-35p6-xmwp-9g52](https://github.com/advisories/GHSA-35p6-xmwp-9g52) #10 | undici 6.25.0 | >=6.27.0 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-3wwx-pv8p-q78v](https://github.com/advisories/GHSA-3wwx-pv8p-q78v) #11 | undici 6.25.0 | >=6.28.1 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r) #12 | undici 6.25.0 | >=6.28.1 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5) #13 | undici 6.25.0 | >=6.28.1 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-4qv8-2p9j-2685](https://github.com/advisories/GHSA-4qv8-2p9j-2685) #14 | undici 6.25.0 | >=6.29.1 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c) #15 | undici 6.25.0 | >=6.29.1 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>undici` |
| [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68) #16 | js-yaml 3.14.2 | >=3.15.0 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>react-native>babel-jest>babel-plugin-istanbul>@istanbuljs/load-nyc-config>js-yaml` |
| [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) #17 | js-yaml 3.14.2 | >=3.15.0 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>react-native>babel-jest>babel-plugin-istanbul>@istanbuljs/load-nyc-config>js-yaml` |
| [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) #18 | js-yaml 3.14.2 | >=3.15.1 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>react-native>babel-jest>babel-plugin-istanbul>@istanbuljs/load-nyc-config>js-yaml` |
| [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) #19 | js-yaml 3.14.2 | >=3.15.2 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>react-native>babel-jest>babel-plugin-istanbul>@istanbuljs/load-nyc-config>js-yaml` |
| [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) #20 | ws 7.5.10 | >=7.5.11 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/metro>metro>ws` |
| [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p) #21 | ws 6.2.3 | >=6.2.4 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@react-native/dev-middleware>ws` |
| [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) #22 | brace-expansion 2.1.0 | >=2.1.2 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>minimatch>brace-expansion` |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) #23 | brace-expansion 2.1.0 | >=2.1.3 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>minimatch>brace-expansion` |
| [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) #24 | brace-expansion 2.1.0 | >=2.1.4 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>minimatch>brace-expansion` |
| [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) #25 | brace-expansion 2.1.0 | >=2.1.7 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>minimatch>brace-expansion` |
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) #26 | brace-expansion 2.1.0 | >=2.1.6 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>minimatch>brace-expansion` |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) #27 | brace-expansion 2.1.0 | >=2.1.5 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>minimatch>brace-expansion` |
| [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) #28 | tar 7.5.19 | >=7.5.21 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>tar` |
| [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) #29 | decode-uri-component 0.2.2 | >=0.5.0 | P2 | OPEN | `artifacts__gxeon-dashboard-mobile>expo-router>query-string>decode-uri-component` |
| [GHSA-6gmq-8vp8-gcm6](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6) #30 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-6gmq-8vp8-gcm6](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6) #31 | @xmldom/xmldom 0.8.13 | >=0.8.15 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-6mj3-qw4j-hgrw](https://github.com/advisories/GHSA-6mj3-qw4j-hgrw) #32 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-g53g-w8rj-fmg7](https://github.com/advisories/GHSA-g53g-w8rj-fmg7) #33 | @xmldom/xmldom 0.9.10 | >=0.9.11 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-w2rr-34g9-rvrj](https://github.com/advisories/GHSA-w2rr-34g9-rvrj) #34 | @xmldom/xmldom 0.8.13 | >=0.8.14 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-w2rr-34g9-rvrj](https://github.com/advisories/GHSA-w2rr-34g9-rvrj) #35 | @xmldom/xmldom 0.9.10 | >=0.9.11 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-4w3w-2rp5-g8jm](https://github.com/advisories/GHSA-4w3w-2rp5-g8jm) #36 | @xmldom/xmldom 0.8.13 | >=0.8.14 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-4w3w-2rp5-g8jm](https://github.com/advisories/GHSA-4w3w-2rp5-g8jm) #37 | @xmldom/xmldom 0.9.10 | >=0.9.11 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-c7q8-3ch8-vqpv](https://github.com/advisories/GHSA-c7q8-3ch8-vqpv) #38 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-c7q8-3ch8-vqpv](https://github.com/advisories/GHSA-c7q8-3ch8-vqpv) #39 | @xmldom/xmldom 0.8.13 | >=0.8.15 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-27p8-2357-5qqv](https://github.com/advisories/GHSA-27p8-2357-5qqv) #40 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-27p8-2357-5qqv](https://github.com/advisories/GHSA-27p8-2357-5qqv) #41 | @xmldom/xmldom 0.8.13 | >=0.8.15 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-3px3-54cx-rmw9](https://github.com/advisories/GHSA-3px3-54cx-rmw9) #42 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-vr34-hp96-76pp](https://github.com/advisories/GHSA-vr34-hp96-76pp) #43 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-6h8r-xr42-gp59](https://github.com/advisories/GHSA-6h8r-xr42-gp59) #44 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-6h8r-xr42-gp59](https://github.com/advisories/GHSA-6h8r-xr42-gp59) #45 | @xmldom/xmldom 0.8.13 | >=0.8.15 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-8344-3jmq-59r6](https://github.com/advisories/GHSA-8344-3jmq-59r6) #46 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-8344-3jmq-59r6](https://github.com/advisories/GHSA-8344-3jmq-59r6) #47 | @xmldom/xmldom 0.8.13 | >=0.8.15 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-x4fp-j954-r2f4](https://github.com/advisories/GHSA-x4fp-j954-r2f4) #48 | @xmldom/xmldom 0.8.13 | >=0.8.15 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-965w-775f-mr7g](https://github.com/advisories/GHSA-965w-775f-mr7g) #49 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-965w-775f-mr7g](https://github.com/advisories/GHSA-965w-775f-mr7g) #50 | @xmldom/xmldom 0.8.13 | >=0.8.15 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-93r5-fhx6-vmg9](https://github.com/advisories/GHSA-93r5-fhx6-vmg9) #51 | @xmldom/xmldom 0.9.10 | >=0.9.12 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/config-plugins>xcode>simple-plist>plist>@xmldom/xmldom` |
| [GHSA-93r5-fhx6-vmg9](https://github.com/advisories/GHSA-93r5-fhx6-vmg9) #52 | @xmldom/xmldom 0.8.13 | >=0.8.15 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/plist>@xmldom/xmldom` |
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) #53 | image-size 1.2.1 | >=2.0.3 | P1 | OPEN | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/metro>metro>image-size` |
| [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) #54 | image-size 1.2.1 | >=2.0.3 | P1 | OPEN | `artifacts__gxeon-dashboard-mobile>@expo/cli>@expo/metro>metro>image-size` |
| [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) #55 | node-forge 1.4.0 | <0.0.0 | P1 | OPEN | `artifacts__gxeon-dashboard-mobile>@expo/cli>node-forge` |
| [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) #56 | http-cache-semantics 4.2.0 | <0.0.0 | P2 | OPEN | `artifacts__gxeon-dashboard-mobile>@expo/ngrok>got>cacheable-request>http-cache-semantics` |
| [GHSA-vc2v-76pw-4v95](https://github.com/advisories/GHSA-vc2v-76pw-4v95) #57 | compression 1.8.1 | >=1.8.2 | P1 | RESOLVED_IN_AUDIT | `artifacts__gxeon-dashboard-mobile>@expo/cli>compression` |
| [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) #58 | postcss-selector-parser 6.0.10 | >=7.1.6 | P1 | OPEN | `artifacts__gxeon-dashboard>@tailwindcss/typography>postcss-selector-parser` |
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) #59 | zod 3.25.76 | >=4.6.6 | P1 | OPEN | `artifacts__gxeon-dashboard>zod` |
| [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) #60 | body-parser 2.3.0 | >=2.4.0 | P0 | RESOLVED_IN_AUDIT | `artifacts__api-server>express>body-parser` |
| [GHSA-w74x-v6f9-j3xg](https://github.com/advisories/GHSA-w74x-v6f9-j3xg) #61 | fast-uri 3.1.8 | >=3.1.9 | P1 | RESOLVED_IN_AUDIT | `lib__api-spec>orval>@scalar/openapi-parser>ajv>fast-uri` |
| [GHSA-xhq7-xmqj-769h](https://github.com/advisories/GHSA-xhq7-xmqj-769h) #62 | fast-uri 3.1.8 | >=3.1.9 | P1 | RESOLVED_IN_AUDIT | `lib__api-spec>orval>@scalar/openapi-parser>ajv>fast-uri` |
| [GHSA-wjr9-j795-jxcr](https://github.com/advisories/GHSA-wjr9-j795-jxcr) #63 | fast-uri 3.1.8 | >=3.1.9 | P1 | RESOLVED_IN_AUDIT | `lib__api-spec>orval>@scalar/openapi-parser>ajv>fast-uri` |
| [GHSA-333x-w4r6-6crp](https://github.com/advisories/GHSA-333x-w4r6-6crp) #64 | fast-uri 3.1.8 | >=3.1.9 | P1 | RESOLVED_IN_AUDIT | `lib__api-spec>orval>@scalar/openapi-parser>ajv>fast-uri` |

Não foi feito upgrade indiscriminado de Zod, image-size, uuid, esbuild, selector-parser ou decode-uri-component. Não há aceite formal de nenhum risco retido.
