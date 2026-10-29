# GX-01.6 — riscos residuais

**BLOCKED — 10 ocorrências, cinco altas; nenhum risco formalmente aceito.** [Auditoria](evidence/remediated-audit.json.gz), [todas as cadeias e decisões](evidence/dependency-triage.json).

## uuid 7.0.3 / 3.4.0 — P2

- [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) (moderate): uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided. Patch informado: >=11.1.1.

Uso: geração Xcode/CLI ngrok, desenvolvimento móvel. Buffer de destino curto em v3/v5/v6 pode escrever fora dos limites esperados. API usa node:crypto.randomUUID, não este pacote.

Decisão proposta: 3/7→>=11.1.1 requer migração de API/ESM dos pais; não substituir globalmente. Teste exigido: Config plugins/Xcode e CLI sem túnel após migração; fixture de bounds.

## esbuild 0.27.3 — P2

- [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) (low): esbuild allows arbitrary file read when running the development server on Windows. Patch informado: >=0.28.1.

Uso: build API; dependência direta de ferramenta. Advisory exige dev server no Windows; esta missão usa build() e nenhum esbuild serve público. O backend dedicado não expõe esse servidor.

Decisão proposta: 0.27→>=0.28.1 exige migração de linha 0.x e build completo. Não ativar serve; correção futura revisada. Teste exigido: Build/boundary/codegen e regressão do dev server se vier a ser usado.

## decode-uri-component 0.2.2 — P2

- [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) (moderate): decode-uri-component: Denial of service via exponential decoding of malformed percent-encoded input. Patch informado: >=0.5.0.

Uso: expo-router móvel, fora da UI web deste piloto. URI percent-encoded malformada pode causar decodificação exponencial. A superfície móvel não foi autorizada para piloto e não entra no bundle dedicado.

Decisão proposta: 0.2→>=0.5 é mudança de linha 0.x. Atualizar query-string/router em trabalho específico; sem exposição móvel no piloto. Teste exigido: Rotas/URLs móveis inválidas e build após atualização.

## image-size 1.2.1 — P1

- [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) (high): image-size: JXL and HEIF parsers allow denial of service through infinite loops. Patch informado: >=2.0.3.
- [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) (high): image-size: ICNS parser allows denial of service through an infinite loop. Patch informado: >=2.0.3.

Uso: build Metro móvel no CI. Processa imagens do repositório durante build; JXL/HEIF/ICNS hostis podem travar processo. Não está no bundle dedicado. Contribuições não confiáveis ao pipeline continuam relevantes.

Decisão proposta: 1.2.1→>=2.0.3 exige migração de API/Metro; não forçar major por override. Limitar CI a fontes revisadas; aceite pendente. Teste exigido: Migração Metro com fixtures de formatos e build Linux; timeout operacional do job.

## node-forge 1.4.0 — P1

- [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (high): node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements. Patch informado: <0.0.0.

Uso: CLI Expo; caminho criptográfico não executado pelo Audit OS. Verificação RSA PKCS#1 v1.5 pode aceitar DigestAlgorithm extra; assinatura/identidade poderia ser comprometida se o caminho for usado. Import/caminho de chamada sensível não provado no piloto.

Decisão proposta: Feed sem versão corrigida (<0.0.0). Não interpretar como patch. Não usar CLI para estabelecer confiança de certificados; aguardar upstream ou substituição revisada. Teste exigido: Regressão de assinatura negativa após patch e build; nenhum certificado remoto homologado.

## http-cache-semantics 4.2.0 — P2

- [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) (high): http-cache-semantics max-stale handling can disclose cross-user cached responses. Patch informado: <0.0.0.

Uso: @expo/ngrok>got>cacheable-request; ferramenta de túnel fora do piloto. max-stale em cache compartilhado pode expor resposta de outro usuário. Não se abriu túnel, não há cache compartilhado na API dedicada. Ausência de exploração não é aceite.

Decisão proposta: Feed sem patch reconhecido (<0.0.0). Versão de registry não comprova correção. Manter túnel desativado no escopo; decisão humana pendente. Teste exigido: Teste de isolamento de cache por credenciais na futura atualização; não disparar túnel para testar.

## postcss-selector-parser 6.0.10 — P1

- [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) (moderate): PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion. Patch informado: >=7.1.6.

Uso: build web @tailwindcss/typography. CSS com seletor plano extenso pode exaurir CPU no build. vercel.json não é encaminhado ao parser CSS; contribuições CSS não confiáveis ao CI são vetor.

Decisão proposta: 6→>=7.1.6 depende de compatibilidade do plugin. Não forçar major; revisar entradas de build. Teste exigido: Build de estilos e smoke visual após migração.

## zod 3.25.76 — P1

- [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) (high): Zod can exhaust memory while validating oversized constrained collections. Patch informado: >=4.6.6.

Uso: runtime e frontend. Bundle dedicado contém zod/v3; arrays checks sujeitos a entrada autenticada. Limite 32 KiB, preflight length<=2 antes do Zod e admissão reduzem impacto; não corrigem Zod globalmente.

Decisão proposta: Migrar contratos e gerador para >=4.6.6 em mudança própria, ou obter aceite humano explícito limitado. Não aceitar em nome do revisor. Teste exigido: PGlite/PG + coleção oversized sem traversal + contratos e UI + codegen após migração.


Prioridade P0 de body-parser foi corrigida na resolução 2.4.0. Zod permanece P1 de runtime: a ausência desse caminho na resposta limitada do audit NÃO é prova de ausência; o [bundle](evidence/local-pilot-build-boundary.json) contém v3. Preflight do intake e limites são mitigação local apenas.

Outros riscos: tokens estáticos compartilhados por papel não provam identidade humana; aprovação de teste usa fixture e não auditor humano; não há autorização multi-tenant. Hashes detectam alterações, não assinatura de terceiro. Limites de admissão são por processo/papel e exigem uma réplica; não substituem proteção de borda. Encerramento de socket libera slot HTTP, não cancela automaticamente transação; pool dedicado limita quatro conexões SQL. Liveness é pública e barata. TLS/rede privada remotos, retenção automatizada, RPO/RTO remoto e download recebido continuam sem comprovação.

Dono da decisão: proprietário xpex-systems-ai e revisor de segurança independente a designar. Prazo: antes de liberar qualquer dado de cliente/piloto. Aceite deve conter risco, escopo, mitigação, vencimento, responsável e assinatura/URL verificável. Campos permanecem em branco no pacote de revisão; Codex não aceita riscos em nome do usuário.
