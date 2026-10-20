# OMNIX AI — proposta de fundação

**Registro:** 2026-10-19. **Estado:** proposta estratégica registrada para revisão; marca e lançamento comercial sem aprovação definitiva.

O usuário autorizou registrar o manifesto e alinhar o roadmap ao GX-01. Essa decisão autoriza esta atualização documental; não representa aprovação definitiva da marca, renomeação do produto implantado, contratação de fornecedores ou liberação comercial.

## Documentos

- [Manifesto proposto](MANIFESTO_PROPOSTO.md): texto fornecido pelo usuário, preservado sem alterações editoriais. O título “Manifesto Oficial” faz parte do texto recebido; seu próprio status e nota de governança o qualificam como proposta.
- [Roadmap vinculado ao GX-01](ROADMAP_GX01.md): sequência de execução, dependências, critérios de saída e evidências exigidas.
- [Reconhecimento do núcleo](../audit-os/gx-01/INITIAL_RECONNAISSANCE.md), [validação local](../audit-os/gx-01/VALIDATION.md) e [runbook](../audit-os/gx-01/RUNBOOK.md).

## Estrutura corporativa proposta

| Camada          | Papel                                                                              |
| --------------- | ---------------------------------------------------------------------------------- |
| XPeX Systems AI | Empresa desenvolvedora e operadora indicada no manifesto                           |
| OMNIX AI        | Marca comercial proposta para o cliente                                            |
| GXEON OS        | Infraestrutura operacional e de orquestração preservada                            |
| GXEON Audit OS  | Núcleo técnico candidato para o produto                                            |
| GX              | Identidade de direção e assistência, sem alegação de conexão permanente à produção |

Categoria e assinatura propostas: **Digital Intelligence & Audit Platform** · **One Intelligence. Every Digital System.** O posicionamento enterprise expressa a direção pretendida; não comprova prontidão enterprise.

## Limite atual de capacidade

O GX-01 implementa um ciclo de análise estática de `vercel.json` fornecido pelo operador: escopo autorizado, caso, evidência com hash, dois checks delimitados, achados referenciados, revisão por credencial distinta, relatório JSON e fechamento. A evidência de teste usa dados explicitamente identificados como teste.

O [CI do commit de código 8c9f21a](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39339247428) passou com 9 testes em PGlite e a repetição de 9 testes em PostgreSQL 17. Isso não comprova staging, identidade nominal, isolamento de organizações, auditoria de runtime, integrações multimodelo ou prontidão comercial.

A [PR #456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) permanece uma entrega em rascunho para revisão. Typecheck/build globais, validação visual, homologação remota e revisão independente são gates pendentes. Os documentos do GX-01 registram o snapshot de execução; resultados posteriores devem ser vinculados ao commit efetivamente testado.

## Governança desta proposta

- OMNIX Scan, Commerce, Systems, Agents, Intelligence e Enterprise são linhas planejadas.
- Disponibilidade da marca, domínios e nomes das linhas permanece não verificada. Registrar a proposta não aprova seu uso definitivo.
- Nenhuma menção a fornecedor comprova integração, contrato, acesso ou permissão de tratamento de dados.
- Uma URL não concede autorização nem acesso a dados privados. Achados precisam de evidências e limitações explícitas.
- A decisão de marca pode avançar em paralelo à estabilização do núcleo; não exige renomear pacotes, APIs ou a infraestrutura existente.
- Pagamentos, alterações sensíveis e produção continuam sob seus gates próprios de revisão humana.

## Rastreabilidade

Origem: manifesto fornecido pelo usuário nesta conversa em 2026-10-19. A cópia local de `MANIFESTO_PROPOSTO.md` foi conferida byte a byte com o arquivo recebido antes do commit. SHA-256 do arquivo de origem: `9fddcb50a3757a9bb4781d0c880ba6f887c2f3705850fa18f1063f252c1d94c1`. O Git pode normalizar as quebras de linha; esse hash identifica o arquivo recebido, não comprova disponibilidade jurídica da marca.

O [roadmap mestre GXEON](../roadmap/GXEON_MASTER_ROADMAP.md) mantém a visão ampla do ecossistema. Para a fundação comercial proposta do OMNIX AI e a próxima entrega do Audit OS, os gates específicos estão no [roadmap GX-01](ROADMAP_GX01.md).
