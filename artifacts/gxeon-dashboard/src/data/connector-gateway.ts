export type ConnectorGatewayId = "github" | "vercel" | "railway" | "supabase" | "microsoft365";

export type ConnectorGatewayStatus = "READY_TO_PREPARE" | "NEEDS_REVIEW" | "LOCKED" | "FUTURE" | "CONNECTED_MANUAL";

export type ConnectorGatewayButtonLabel = "Abrir checklist" | "Preparar conector" | "Ver requisitos" | "Bloqueado";

export type ConnectorGatewayProvider = {
  id: ConnectorGatewayId;
  name: string;
  priority: number;
  purpose: string;
  status: ConnectorGatewayStatus;
  activationStyle: string;
  frontendBehavior: string;
  backendFuture: string;
  runtimeBoundary: string;
  stateStoreBoundary: string;
  nextManualAction: string;
  buttonLabel: ConnectorGatewayButtonLabel;
  checklistHref: string;
  risks: string[];
  activationSteps: string[];
  futureCapabilities: string[];
};

export const connectorGatewaySafetyRules = [
  "Botões são superfícies visuais/controladas: não iniciam OAuth, callbacks, redirects de autorização ou requests externos.",
  "Credenciais reais permanecem somente em dashboards dos provedores ou armazenamento seguro de backend aprovado.",
  "Nenhum token, secret, tenant ID, service role key ou variável de ambiente é armazenado no frontend.",
  "Railway será avaliado como runtime futuro para workers server-side antes de qualquer job de conector.",
  "Supabase será avaliado como state store futuro após revisão de schema, RLS e fronteira de service role.",
  "Microsoft 365 permanece manual-first: nenhuma mensagem automática e nenhum envio sem aprovação humana.",
  "Sem scraping, sem automação não autorizada e sem escrita em provedores ou banco de dados nesta fundação P0.",
] as const;

export const connectorGatewayProviders: ConnectorGatewayProvider[] = [
  {
    id: "github",
    name: "GitHub",
    priority: 1,
    purpose: "Repositórios, issues, pull requests, commits e evidência de engenharia.",
    status: "READY_TO_PREPARE",
    activationStyle: "OAuth/App-based future activation",
    frontendBehavior: "Exibe checklist e prontidão. Não renderiza input de token.",
    backendFuture: "Runtime autorizado deverá ler metadados de repositório, PRs, issues e commits somente após autorização segura.",
    runtimeBoundary: "Nenhum worker ativo; futura leitura server-side com permissões mínimas.",
    stateStoreBoundary: "Estado futuro de sync e evidências será persistido somente após revisão de schema.",
    nextManualAction: "Definir repositórios permitidos, escopo read-only inicial e política de revisão de evidências.",
    buttonLabel: "Abrir checklist",
    checklistHref: "docs/connectors/GITHUB_CONNECTION_CHECKLIST.md",
    risks: ["Permissões de repositório excessivas", "Vazamento de token", "Ações de escrita acidentais"],
    activationSteps: ["Mapear repositório e branch", "Aprovar app/OAuth com escopo mínimo", "Testar leitura em backend isolado", "Publicar estado manual conectado"],
    futureCapabilities: ["Repository metadata", "Issues", "Pull requests", "Commits", "Engineering evidence"],
  },
  {
    id: "vercel",
    name: "Vercel",
    priority: 2,
    purpose: "Deployments, previews, status de produção e falhas de build.",
    status: "READY_TO_PREPARE",
    activationStyle: "Token/dashboard controlled future activation",
    frontendBehavior: "Exibe prontidão de deploy e checklist. Não coleta token.",
    backendFuture: "Runtime autorizado deverá ler deployments e status de projeto somente após configuração segura.",
    runtimeBoundary: "Nenhum request para Vercel no UI; futura leitura server-side controlada.",
    stateStoreBoundary: "Snapshots de deploy poderão ser gravados no state store somente depois da revisão P6.",
    nextManualAction: "Confirmar projeto, production URL, preview URL, output directory e fonte do status de build.",
    buttonLabel: "Preparar conector",
    checklistHref: "docs/connectors/VERCEL_CONNECTOR_READINESS.md",
    risks: ["Exposição de token de projeto", "Output directory incorreto", "Status de produção falso"],
    activationSteps: ["Mapear projeto Vercel", "Validar URLs", "Aprovar leitura server-side", "Comparar build status manualmente"],
    futureCapabilities: ["Deployments", "Preview URLs", "Production status", "Build failures", "Project mapping"],
  },
  {
    id: "railway",
    name: "Railway",
    priority: 3,
    purpose: "Runtime backend, workers de conectores, jobs e logs.",
    status: "LOCKED",
    activationStyle: "CLI/dashboard controlled future activation",
    frontendBehavior: "Exibe estado bloqueado e checklist de runtime.",
    backendFuture: "Railway poderá hospedar o runtime de conectores para jobs server-side seguros.",
    runtimeBoundary: "Bloqueado até revisão de variáveis, workers, logs, custos e janelas de execução.",
    stateStoreBoundary: "Somente metadados operacionais aprovados poderão ser persistidos depois da revisão Supabase.",
    nextManualAction: "Revisar limites de worker, variáveis de runtime, logs e orçamento antes de liberar qualquer job.",
    buttonLabel: "Bloqueado",
    checklistHref: "docs/connectors/RAILWAY_CONNECTOR_RUNTIME_READINESS.md",
    risks: ["Variáveis de runtime expostas", "Workers executando cedo demais", "Custos não controlados"],
    activationSteps: ["Definir serviço runtime", "Separar env vars server-side", "Criar limites de worker", "Ativar logs e custos"],
    futureCapabilities: ["Connector workers", "Scheduled jobs", "Runtime logs", "Health checks", "Cost controls"],
  },
  {
    id: "supabase",
    name: "Supabase",
    priority: 4,
    purpose: "Persistência, auth, storage, estados de conector e registros operacionais.",
    status: "LOCKED",
    activationStyle: "Dashboard controlled future activation",
    frontendBehavior: "Exibe prontidão de banco. Não expõe service role key.",
    backendFuture: "Supabase poderá armazenar oportunidades, tarefas, execuções, validações, releases, ledger e estados de conector.",
    runtimeBoundary: "Nenhuma migration ou write nesta etapa; somente checklist visual.",
    stateStoreBoundary: "Bloqueado até revisão de schema, RLS, auth, storage e fronteira service role no backend.",
    nextManualAction: "Aprovar schema, RLS, tabelas de estado e política de service role fora do frontend.",
    buttonLabel: "Bloqueado",
    checklistHref: "docs/connectors/SUPABASE_CONNECTOR_STORAGE_READINESS.md",
    risks: ["Service role exposto ao frontend", "RLS inseguro", "Writes prematuros"],
    activationSteps: ["Revisar schema", "Definir RLS", "Separar storage", "Aprovar writes server-side"],
    futureCapabilities: ["Connector state", "Operational records", "Auth boundaries", "Storage metadata", "Ledger persistence"],
  },
  {
    id: "microsoft365",
    name: "Microsoft 365",
    priority: 5,
    purpose: "Email, calendário, contatos, OneDrive, propostas e comunicação com clientes.",
    status: "NEEDS_REVIEW",
    activationStyle: "OAuth future activation",
    frontendBehavior: "Exibe checklist de prontidão e estado futuro de conexão.",
    backendFuture: "Runtime autorizado deverá ler metadados permitidos de mailbox, calendar, contacts e documentos somente após autorização explícita.",
    runtimeBoundary: "Sem OAuth, sem Graph requests e sem envio automático nesta etapa.",
    stateStoreBoundary: "Somente metadados mínimos aprovados poderão ser persistidos após revisão de privacidade.",
    nextManualAction: "Definir app registration, permissões least-privilege e regra de aprovação manual antes de emails.",
    buttonLabel: "Ver requisitos",
    checklistHref: "docs/connectors/MICROSOFT_365_CONNECTOR_READINESS.md",
    risks: ["Permissões excessivas", "Exposição de dados sensíveis de clientes", "Email automatizado sem revisão"],
    activationSteps: ["Revisar app registration", "Aprovar permissões mínimas", "Definir política de consentimento", "Testar leitura backend isolada"],
    futureCapabilities: ["Outlook metadata", "Calendar metadata", "Contacts", "OneDrive proposal files", "Manual-send proposals"],
  },
];

export const connectorGatewayActivationOrder = connectorGatewayProviders.map(({ id, name, priority, status, nextManualAction }) => ({
  id,
  name,
  priority,
  status,
  nextManualAction,
}));
