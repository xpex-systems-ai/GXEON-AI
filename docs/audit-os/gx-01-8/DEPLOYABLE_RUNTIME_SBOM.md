# GX-01.8 — SBOM e limite do runtime dedicado

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

Inventário efetivo do bundle esbuild de **src/audit-pilot.ts**: **84 componentes npm e 290 inputs com bytesInOutput>0**. Não é a árvore completa instalada. [Cyclone DX 1.6 JSON](evidence/dedicated-runtime.cdx.json), [inputs/hashes/externos](evidence/runtime-surface.json), [manifestos e caminhos](evidence/dependency-paths.json). O documento Cyclone DX foi gerado do metafile e dos manifestos, sem certificação ou validação por ferramenta externa de conformidade de SBOM.

| Incluído | Evidência / limite |
| --- | --- |
| Express, pg e contratos Zod 4.6.6 | Componentes/versões e hash SHA256 do manifesto por componente; hashes de cada input retido |
| Lógica dedicada | audit Pilot Config/Database/App; middleware de papéis; workflow e checks; sem app.ts/index de rotas/financeiro/autorunners |
| Runtime JS | audit-pilot.mjs SHA25648819 cdcea 62 dde 340 e 2 ff 0071 c 0 c 11 bbdfbd 1 e 671842 c 383 ccb 67 c 4 f 896 ff 1 f; sourcemap 54 da 8 fd 09049398 abe 656827 b 8 dec 0 baefd 6 d 23 f 54 e 626 b 738070 f 27 eecb 2 c 04 |
| Externos | Builtins Node (fs/net/tls/http/crypto etc.) e **pg-native** opcional. Enumeração real está em boundary.external Imports, com kind. Não inclui automaticamente módulos não retidos |
| Excluído / ainda necessário | Versão/digest imutável da imagem remota; Node 24 patch remoto; SO/libs; PG 17 imagem e extensões; CA/SAN; pg-native/libpq se instalado; ferramentas do builder e sua cadeia de suprimento |

Zod 3 não aparece nos inputs retidos. Nenhuma correspondência com os quatro advisories do audit global. Um match é calculado por nome+versão afetada efetivamente instalada no feed completo; isso não é um feed de CVEs independente nem prova de ausência de vulnerabilidades desconhecidas. O build já recusa inputs proibidos e Zod diferente de 4.6.6; agora publica também externos. Não instalar pg-native nem habilitar NODE_PG_FORCE_NATIVE com este inventário; caso necessário, reabrir revisão e inventariar libpq/addon.

Reprodução em checkout do candidato com dependências congeladas:

```text
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm audit --json > audit.json
# audit deve preservar exit 1; compactar cópia audit.json em audit.json.gz sem substituir provas
node docs/audit-os/gx-01-8/evidence/generate-runtime-sbom.mjs <repo> <novo-diretorio> <audit.json.gz>
```

O gerador recusa sobrescrita. Comparar conjunto de componentes/inputs e hash do JS, não o UUID/timestamp do SBOM. Outputs têm sourceCommit próprio; os hashes do candidato e a equivalência pré/pós-metadado estão em [candidate-binding.json](evidence/candidate-binding.json). A resolução de manifestos sobe diretórios sem nome/versão (ex.: subpath zod/v4), evitando contar um package.json interno como pacote sem identidade. Licenças são declarações dos manifestos, não auditoria jurídica de licenciamento. Builder com monorepo completo ainda tem quatro alertas: isolamento do processo não saneia a cadeia do build.
