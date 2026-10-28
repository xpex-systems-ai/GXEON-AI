# GX030 — operação e revisão

## Estado real

Adaptação Render implementada para revisão; operação remota bloqueada pelo contrato de identidade TLS do PostgreSQL e revisão independente ainda não designada. Nenhum serviço/banco OMNIX criado. Nenhuma alteração nos quatro serviços Academy. O núcleo continua executável em infraestrutura própria com os mesmos dois checks e persistência SQL.

| Gate | Estado | Evidência/condição |
| --- | --- | --- |
| DEPLOYED no Render | NÃO | Sem recurso/URL; não fabricar link |
| INTEGRATED remoto | NÃO VERIFICADO | Nenhum banco remoto conectado |
| E2E VERIFIED remoto | NÃO | Testes locais/CI não substituem internet |
| SECURITY ACCEPTED | BLOCKED | Revisor humano independente e decisão TLS pendentes |
| CUSTOMER SAFE | BLOCKED | Controles abaixo; entrada real permanece fechada |
| COMMERCIAL READY | PARCIAL | Oferta/proposta preparadas na PR corporativa #45; condições sem aprovação |
| PAID | NÃO VERIFICADO | Nenhum contrato ou pagamento comprovado nesta missão |

## Matriz de controles para primeiro cliente

| Controle | Implementação comprovável | Falta para cliente real |
| --- | --- | --- |
| Convite empresarial/identidade/recuperação | Não implementados; `omnixPreview` aceita só identidades `test-*` explícitas | Provedor/fluxo aprovado, prova de titularidade, MFA/recuperação/revogação administrativa e teste de abuso |
| Organização/operador/revisor | `service.forActor`, filtros de proprietário/organização, autoaprovação negada; testes SQL/HTTP | Revisar a ligação com identidade real e defesa em profundidade; não confundir identidade distinta automatizada com humano |
| Sessão | Cookie Secure/HttpOnly/Strict; TTL30min; logout, novo login revoga anterior, restart invalida sessões | Gestão empresarial e revogação operacional aprovada |
| Rate/concurrency/CSRF | Limites de login, sessão, papel e processamento; origem exata/JSON; proxy/IP não são autoridade | Validação de capacidade na instância remota e alerta operacional com responsável |
| Upload/segredos | Apenas vercel.json objeto JSON, 16.000 caracteres/32KB, até 2 checks, scanner de padrões de credenciais; refs não são buscadas | Revisão humana de sanitização: regex não garante ausência de todo segredo |
| Evidência/relatório | SQL transacional, referências e hash, relatório somente após revisão/fechamento; testes de rollback/tamper | Revisor real designado; política contratual de entrega |
| Retenção/exclusão/LGPD | Entrada real desativada; sem job destrutivo ou cópia a terceiros | Definir controlador/operador, base/finalidade, prazo e canal de direitos; implementar descarte inclusive backups com comprovação |
| Backup/restore | Testes de restore em banco novo com comparação de 5 tabelas; sem mutar fonte | Armazenamento externo criptografado, acesso/retensão/RPO/RTO aprovados e restore remoto ensaiado; Free não atende |
| Incidente/suporte | Eventos sanitizados e procedimento abaixo; canal institucional na página da empresa | Plantão/responsáveis e recebimento do canal ainda não validados |
| Dependências | Atualizações + backports reproduzíveis; auditoria global continua explicitamente FAIL | Revisão independente dos patches e tratamento dos alertas upstream remanescentes |

Não existe flag neste trabalho que transforme identidades sintéticas em login empresarial. `customerDataAllowed=false` permanece obrigatório. A abertura de cliente requer outra aprovação específica depois de implementados e testados os itens ausentes.

## Observabilidade

`auditTelemetry.ts` emite categorias fixas no stdout privado da API: visita ao produto, entrada autenticada, solicitação, início de auditoria (recibo do POST run concluído), fechamento e exportação; falhas têm categoria própria. Contagens são locais ao processo e não métricas históricas faturáveis. Duração é uma faixa, sem nome/ID/caminho/query/body/cookie/IP. Três respostas 5xx na janela de 60s emitem `omnix_failure_alert`; é sinal no log, não notificação externa já integrada. Health consulta SQL no modo Render. Nenhum endpoint público de métricas foi criado.

Eventos do site corporativo são `CustomEvent` local com somente nome/produto/etapa/outcome. Rascunho local usa outcome `local_draft`, nunca solicitação recebida. Sem propriedade GA4, gtag, cookies de analytics, envio externo ou números inventados. Não conectar logs privados a GA4.

## Procedimento de incidente candidato

1. Em 5xx repetidos, interromper admissão de novos dados; manter leitura apenas se integridade/autorização puderem ser confirmadas. Não tentar resolver TLS desabilitando verificação.
2. Registrar timestamp, SHA, código fixo e requestId; consultar logs privados sem copiar tokens/corpos/arquivos para issues públicas.
3. Responsável humano verifica credenciais/acesso e decide revogação, isolamento e comunicação. Não alterar projetos Academy nem finanças como resposta automática.
4. Verificar backup aprovado; restaurar em banco novo; comparar hashes e escopo; reabrir somente após teste e aceite. Nunca sobrescrever dados de origem durante ensaio.
5. Se houver dados pessoais envolvidos, responsável por privacidade determina as medidas e comunicações aplicáveis; não declarar conformidade LGPD a partir deste guia.

## Catálogo futuro de evidências

Não é pré-requisito do primeiro check. Nenhum Drive/Lovable privado foi importado. Registro mínimo: `kind` (`xpex_portfolio` ou `client_audit`), fonte/autor/data/SHA256, titular/responsável, sensibilidade, autorização de uso, redações, origem do arquivo e revisão de publicação. Dedupe por hash e fonte; manter clientes em armazenamento/organização próprios. Publicação começa negada e exige autorização do titular e aprovação humana vinculada ao artefato exato; trocar bytes invalida a aprovação. O exemplo sintético corporativo pode ser inventariado como portfólio, nunca como cliente atendido.

## Reproduzir

`pnpm install --frozen-lockfile`; `pnpm lint:audit`; `pnpm typecheck`; `pnpm --filter @workspace/api-server typecheck:audit-tests`; `pnpm --filter @workspace/api-server test:audit`; `node scripts/audit-staging/gx030-security.mjs`; `pnpm audit --json`; `pnpm build`.

CI `Audit OS V1` acrescenta build da imagem Render e recusa sem configuração; preserva testes PG17, staging, grants, Compose HTTPS/restore/restart e compatibilidade de dependências. Estes são ensaios sintéticos, não deployment no Render ou revisão humana.
