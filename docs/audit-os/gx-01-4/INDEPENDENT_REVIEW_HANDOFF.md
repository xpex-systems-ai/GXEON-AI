# GX-01.4 — handoff para revisão independente

**Pessoa revisora: NÃO DESIGNADA. Aprovação humana: NÃO EMITIDA.** xpex-systems-ai deve indicar pessoa diferente do implementador e confirmar autorização. Codex fornece testes/evidência; não substitui review humano. PR #456 permanece DRAFT.

## Identidade e diff

Referência inicial exata: 7687bf248cfc6034af198926a2b07d045ca9b715. Base observada: dbc29fff9a2c55487f85a83db597f41c493af7a8. Branch codex/gxeon-audit-os-v1-gx01. SHA candidato validado: **d20e38db9dd8812d3aa7657846b738137bbfe48d**. Checkout de integração CI: **b9b5febdfcf6cb9c93625741f459112ee137d4ed**. O HEAD documental final é rechecado e registrado na descrição da PR, sem transportar este PASS. Conferir que não surgiram commits depois da revisão.

Diff integral atual: [Files changed](https://github.com/xpex-systems-ai/GXEON-AI/pull/456/files). Para reprodução em checkout com espaço: git fetch origin codex/gxeon-audit-os-v1-gx01; git diff --binary dbc29fff9a2c55487f85a83db597f41c493af7a8 SHA_EXATO_REVISADO. [Diff integral textual do candidato, comprimido](evidence/full-pr-d20e38d.diff.gz), SHA-256 0ee5de4a2b0c1d6b0910632ebce1d2ec1bdb91655791fdc433e5c7aa7826d7f7. Inclui todas as mudanças textuais da PR; o formato GitHub indica binários separadamente, disponíveis como blobs no pacote. O comando git diff --binary acima produz também os payloads binários. um diff histórico não aprova documentação posterior.

Escopo GX-01.4: nove atualizações de dependências compatíveis e documentação/evidências. Não muda rotas, schema, auth ou capacidades comerciais. O código anterior mantém análise estática de vercel.json sanitizado, escopo autorizado, evidência, achados, revisão por papéis e relatório CLOSED. Correções legadas demonstradas: UUID equivalente e descoberta por ativo de caso fechado não podem mutar fluxo GX. Não há execução universal, tenancy ou identidade nominal comprovada.

## Modelo de ameaças e controles a revisar

| Ator / fronteira | Ameaça | Prova esperada / limite |
| --- | --- | --- |
| Não autenticado → API | Ler/escrever casos | 401/403 antes dos dados; query/cabeçalhos alternativos não concedem identidade |
| Operador → revisão | Autoaprovação por mesmo papel | Operador não revisa, revisor não executa/finaliza, tokens iguais falham; duas credenciais não provam duas pessoas |
| Legado → CLOSED | Mutação por UUID/ativo inferido | Cinco codificações de UUID bloqueadas; lookup exclui gx01-v1; admin regression exige 404, papel mínimo retorna 503 específico sem ampliar grants |
| Concorrência → DB | Duplicação/estado parcial | Locks, idempotência, rollback injetado e transações PostgreSQL |
| Operador → evidência/relatório | Adulteração, referências inválidas, review stale | Hash de evidência/canônico e vínculo de revisão; export/finalize recusam adulteração; admin SQL é autoridade confiável |
| Artefato → análise | SSRF, comandos, leitura local, segredo persistido | Apenas texto submetido sanitizado e checks limitados; sem rede/comando do ativo |
| Build/CLI → ferramentas | Alertas de parsers, dev server e certificados | Nove patches atuais, audit residual aberto; CI isolado, sem inputs externos/servidores públicos |
| Provedor → ambiente | Alias errado, frontend estático confundido com API | provider+scope+ID; contratos e persistência externos não homologados; decisão por projeto antes de alteração |
| Frontend/logs → terceiros | Segredo embutido | Nomes de variáveis apenas; harness procura credenciais sintéticas em logs/bundle; não é certificação DLP histórica |

## Evidências e testes

Resultados técnicos históricos do SHA inicial foram reconsultados, sem aprovar o novo código. Regressão do candidato aprovada: Typecheck 39494661263, Build 39494661161, Audit OS 39494661242 e Health 39494661182. [Evidência](evidence/ci-validation.json) e [relatório sintético](evidence/ci-api-report.json) vinculados ao checkout limpo. Exigir Typecheck global, Build Linux completo, Monorepo Health e Audit OS V1: instalação frozen, lint, PGlite, PostgreSQL 17, staging 14 grupos, negativos de auth, integridade, restart e export API.

[Registro de dependências](DEPENDENCY_RISK_REGISTER.md): histórico 91; comparativo pnpm11 89→73; revalidação canônica pnpm10 **74 ocorrências em 73 advisories**, com 51 altas sem aceite. [Infraestrutura](CANONICAL_INFRASTRUCTURE_MATRIX.md): 49 linhas, com serviços Railway separados de projetos/sites. [Proposta](INFRASTRUCTURE_DECISION_PROPOSAL.md): B dedicado recomendado sob aprovação. [Checks](EXTERNAL_CHECKS_FINAL_MATRIX.md): 29 falhas no snapshot inicial, causas separadas de relevância.

Persistência e relatório do novo SHA devem vir do staging Linux com sourceDirty=false, IDs/hash/contagem preservados após restart API+banco. JSON da API/artefato GitHub não é download real. [Download](DOWNLOAD_FINAL_VERIFICATION.md) continua BLOCKED e contém roteiro exato.

## Limitações locais

Instalação frozen com pnpm 10.28.1 passou. O pnpm global 11 tentou sincronizar layout e abortou por ausência de TTY; não foi autorizada purga. Windows esgotou espaço (0 bytes), bloqueando gravação/build/novo staging e sincronização Git. O checkout local foi preservado, sem reset. A remoção do cache pnpm recém-criado foi rejeitada pela revisão automática; não foi repetida por outro meio. Apenas resumos duplicados desta fase foram reduzidos e audit JSON preservado com gzip. Documentos finais são registrados pela API GitHub na mesma branch, com validação no CI. Não apresentar teste local incompleto como PASS.

Falha histórica Windows de heap/typecheck e fetch Metro/mobile continua registrada na GX-01.3; mobile Windows não foi repetido nesta máquina. Nenhum dado real de cliente ou credencial produtiva foi usado. Staging local não foi iniciado nesta fase por falta de espaço; o CI é isolado.

## Checklist e formulário humano

- [ ] Sou pessoa autorizada e independente do implementador.
- [ ] Conferi SHA completo, base, diff integral e commits posteriores.
- [ ] Conferi resultados/logs no SHA atual e artefatos sintéticos.
- [ ] Reproduzi auth/legado/rollback/integridade/persistência necessários.
- [ ] Homologuei arquivo recebido no navegador, ou mantive gate explicitamente bloqueado.
- [ ] Avaliei cada risco relevante de dependência e registrei correção/mitigação/aceite com validade.
- [ ] Proprietário decidiu infraestrutura e relevância/correção dos checks.
- [ ] Não inferi aprovação de produção/piloto/merge por sucesso de CI.

| Campo | Preenchimento humano |
| --- | --- |
| Nome / GitHub / autorização / independência | PENDENTE |
| SHA completo e base / data | PENDENTE |
| Evidências examinadas / reprodução | PENDENTE |
| Achados e mudanças requeridas | PENDENTE |
| Riscos aceitos individualmente / validade / responsável | PENDENTE |
| Decisões de infraestrutura/checks e referências | PENDENTE |
| Download real antes/depois restart | PENDENTE |
| REQUEST CHANGES / READY FOR FINAL APPROVAL / BLOCKED | PENDENTE |
| Link do review e assinatura | PENDENTE |

Nenhum campo constitui aprovação automática. READY FOR FINAL APPROVAL exige review independente concluído, download comprovado, riscos tratados/aceitos formalmente e externos relevantes resolvidos. Sem merge ou produção.
