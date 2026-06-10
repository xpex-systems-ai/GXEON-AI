# Home Center Agents Blueprint

## Definição

**Home Center Agents** é a casa dos agentes do GXEON OS: um modelo operacional para organizar agentes por missão, permissões, conectores, evidências e aprovação humana.

A casa dos agentes não significa autonomia irrestrita. Ela significa especialização governada.

## Papéis

| Agente | Missão | Conectores típicos | Limite |
| --- | --- | --- | --- |
| Code Agent | Analisar código, propor patches, abrir planos de PR | GitHub | Não faz merge sem review. |
| Deploy Agent | Preparar validação de deploy e release notes | Vercel, Railway | Não promove produção sem aprovação. |
| Ops Agent | Monitorar tarefas, incidentes e playbooks | GXEON OS, Railway, Supabase | Não altera runtime sem gate. |
| Revenue Agent | Converter sinais em ofertas e microtasks | GXEON OS, Microsoft 365 | Não declara receita sem evidência. |
| Finance Agent | Organizar ledger, custos e pagamentos | Supabase, GXEON OS | Não executa pagamento sem autorização. |
| Security Agent | Auditar segredos, permissões e riscos | GitHub, docs, runtime metadata | Não expõe achados sensíveis em canal público. |
| Grok Auditor Agent | Fazer revisão externa/independente de narrativa e risco | Docs, reports | Auditoria consultiva, não executiva. |
| Operator Agent | Ajudar o operador humano a coordenar missão | Todos com escopo | Sempre subordinado ao operador. |

## Permissions model

- `READ`: observar, listar e resumir.
- `PROPOSE`: sugerir tarefa, patch, decisão ou ação.
- `PREPARE`: montar plano, checklist e evidência esperada.
- `EXECUTE_WITH_APPROVAL`: executar somente após aprovação humana.
- `FORBIDDEN`: ações destrutivas, secret exposure e mutações fora de escopo.

## Connector access model

Cada agente recebe matriz explícita de provider, modo, objetivo, dados permitidos e evidência exigida. O padrão inicial é leitura.

## Human approval gates

Aprovação humana é obrigatória para deploy, alteração de dados, escrita em provedores, integração financeira, mudança de permissões, rotação de credenciais e qualquer operação irreversível.

## Evidence requirements

Toda missão deve registrar: input, escopo, ação proposta/executada, comandos de validação, resultado, riscos, rollback e links para artefatos seguros.
