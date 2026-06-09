export type ConnectorGatewayId =
  | "github"
  | "vercel"
  | "railway"
  | "supabase"
  | "microsoft365";

export type ConnectorGatewayStatus =
  | "NOT_CONFIGURED"
  | "READY"
  | "CONNECTING"
  | "CONNECTED"
  | "ERROR"
  | "LOCKED";

export type ConnectorGatewayButtonLabel =
  | "Connect GitHub"
  | "Connect Vercel"
  | "Connect Railway"
  | "Connect Supabase"
  | "Connect Microsoft 365"
  | "Review requirements"
  | "Locked";

export type ConnectorCredentialIndicator =
  | "NO_CREDENTIALS_IN_FRONTEND"
  | "BACKEND_SECRET_REQUIRED"
  | "OPERATOR_APPROVAL_REQUIRED";

export type ConnectorGatewayProvider = {
  id: ConnectorGatewayId;
  name: string;
  officialBrand: string;
  priority: number;
  purpose: string;
  status: ConnectorGatewayStatus;
  healthScore: number;
  lastSync: string | null;
  uptime: string;
  credentialIndicator: ConnectorCredentialIndicator;
  credentialLabel: string;
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
  readyScreen: Array<{
    label: string;
    value: string;
    state: ConnectorGatewayStatus;
  }>;
  futureCapabilities: string[];
};

export type OperationalActivityEvent = {
  id: string;
  timestamp: string | null;
  actor: "operator" | "connector" | "deploy" | "sync" | "system";
  event: string;
  provider?: ConnectorGatewayId;
  status: ConnectorGatewayStatus;
};

export const REAL_DATA_MODE = {
  dashboardMode: "REAL_OPERATION_READY",
  emptyState: "EMPTY_REAL_DATA",
  mockData: 0,
  fakeRevenue: 0,
  fakeClients: 0,
  fakeOpportunities: 0,
  fakeActivity: 0,
} as const;

export const connectorGatewaySafetyRules = [
  "Botões são superfícies controladas: GitHub usa somente URL de conexão emitida pelo backend; nenhum token ou secret entra no frontend.",
  "Credenciais reais permanecem somente em dashboards dos provedores ou armazenamento seguro de backend aprovado.",
  "Nenhum token, secret, tenant ID, service role key ou variável de ambiente sensível é armazenado no frontend.",
  "Status CONNECTED só pode aparecer depois de confirmação real do backend autorizado.",
  "Sem scraping, sem automação não autorizada e sem escrita em provedores ou banco de dados nesta fase de cutover.",
] as const;

export const connectorGatewayProviders: ConnectorGatewayProvider[] = [
  {
    id: "github",
    name: "GitHub",
    officialBrand: "GitHub",
    priority: 1,
    purpose:
      "Repositórios, issues, pull requests, commits e evidência de engenharia.",
    status: "READY",
    healthScore: 0,
    lastSync: null,
    uptime: "not measured",
    credentialIndicator: "BACKEND_SECRET_REQUIRED",
    credentialLabel:
      "GitHub App secrets remain backend-only; no frontend credential path",
    activationStyle: "GitHub App installation redirect via backend connect-url",
    frontendBehavior:
      "Exibe readiness e botão Connect GitHub sem input de token.",
    backendFuture:
      "Runtime autorizado via GitHub App lê repositórios, pull requests, issues e commits somente por API interna.",
    runtimeBoundary:
      "Leituras GitHub ocorrem somente no backend com permissões mínimas e sem métodos de mutação.",
    stateStoreBoundary:
      "Estado futuro de sync e evidências será persistido somente após revisão de schema.",
    nextManualAction:
      "Clicar Connect GitHub, instalar o GitHub App e selecionar repositórios permitidos.",
    buttonLabel: "Connect GitHub",
    checklistHref: "docs/connectors/GITHUB_APP_INSTALLATION_FLOW_P3.md",
    risks: [
      "Permissões de repositório excessivas",
      "Vazamento de token",
      "Ações de escrita acidentais",
    ],
    activationSteps: [
      "Mapear repositório e branch",
      "Instalar GitHub App com permissões read-only",
      "Testar leitura em backend isolado",
      "Publicar estado CONNECTED real",
    ],
    readyScreen: [
      {
        label: "Repository read",
        value: "ready after GitHub App install",
        state: "READY",
      },
      {
        label: "Connect GitHub",
        value: "primary operator action",
        state: "READY",
      },
      {
        label: "Repository list",
        value: "awaiting backend-confirmed connection",
        state: "READY",
      },
    ],
    futureCapabilities: [
      "Repository metadata",
      "Issues",
      "Pull requests",
      "Commits",
      "Engineering evidence",
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    officialBrand: "Vercel",
    priority: 2,
    purpose:
      "Production URL, Preview URL, deployments, status de produção e falhas de build.",
    status: "READY",
    healthScore: 0,
    lastSync: null,
    uptime: "not measured",
    credentialIndicator: "BACKEND_SECRET_REQUIRED",
    credentialLabel: "Vercel token pending in backend vault",
    activationStyle: "Token/dashboard controlled future activation",
    frontendBehavior:
      "Exibe prontidão de deploy e botão Connect Vercel sem coletar token.",
    backendFuture:
      "Runtime autorizado deverá ler deployments e status de projeto somente após configuração segura.",
    runtimeBoundary:
      "Nenhum request para Vercel no UI; futura leitura server-side controlada.",
    stateStoreBoundary:
      "Snapshots de deploy poderão ser gravados no state store somente depois da revisão Supabase.",
    nextManualAction:
      "Confirmar projeto, production URL, preview URL, output directory e fonte do status de build.",
    buttonLabel: "Connect Vercel",
    checklistHref: "docs/connectors/VERCEL_CONNECTOR_READINESS.md",
    risks: [
      "Exposição de token de projeto",
      "Output directory incorreto",
      "Status de produção falso",
    ],
    activationSteps: [
      "Mapear projeto Vercel",
      "Validar URLs reais",
      "Aprovar leitura server-side",
      "Confirmar deployment status real",
    ],
    readyScreen: [
      {
        label: "Production URL",
        value: "awaiting connection",
        state: "NOT_CONFIGURED",
      },
      {
        label: "Preview URL",
        value: "awaiting connection",
        state: "NOT_CONFIGURED",
      },
      {
        label: "Deployment Status",
        value: "ready to read after auth",
        state: "READY",
      },
      {
        label: "Project Health",
        value: "not measured",
        state: "NOT_CONFIGURED",
      },
    ],
    futureCapabilities: [
      "Deployments",
      "Preview URLs",
      "Production status",
      "Build failures",
      "Project health",
    ],
  },
  {
    id: "railway",
    name: "Railway",
    officialBrand: "Railway",
    priority: 3,
    purpose:
      "Services, workers, runtime, environment validation e deployment health.",
    status: "READY",
    healthScore: 0,
    lastSync: null,
    uptime: "not measured",
    credentialIndicator: "BACKEND_SECRET_REQUIRED",
    credentialLabel: "RAILWAY_TOKEN stays in backend runtime variables only",
    activationStyle: "READY_FOR_BACKEND_READONLY_CONNECTION",
    frontendBehavior: "Exibe snapshot Railway lido somente pelo backend, sem UI de credenciais.",
    backendFuture:
      "Railway GraphQL é consultado pelo api-server em modo somente leitura para projetos, serviços, deployments e domínios.",
    runtimeBoundary:
      "Sem escrita em projetos, serviços, variáveis, domínios, deployments ou comandos; o frontend chama apenas rotas GXEON.",
    stateStoreBoundary:
      "Somente metadados operacionais seguros aparecem no dashboard; valores de variáveis e logs brutos nunca são retornados.",
    nextManualAction:
      "Adicionar RAILWAY_TOKEN ao runtime backend e opcionalmente RAILWAY_PROJECT_ID, RAILWAY_TEAM_ID e RAILWAY_ENVIRONMENT_ID.",
    buttonLabel: "Connect Railway",
    checklistHref: "docs/connectors/RAILWAY_READONLY_CONNECTOR_P0.md",
    risks: [
      "Variáveis de runtime expostas",
      "Workers executando cedo demais",
      "Custos não controlados",
    ],
    activationSteps: [
      "Definir serviço runtime",
      "Separar env vars server-side",
      "Criar limites de worker",
      "Ativar logs e custos",
    ],
    readyScreen: [
      { label: "Services", value: "ready to read", state: "READY" },
      { label: "Workers", value: "metadata only", state: "READY" },
      { label: "Runtime", value: "backend read-only", state: "READY" },
      { label: "Environment Validation", value: "presence only", state: "READY" },
      {
        label: "Deployment Health",
        value: "not measured",
        state: "NOT_CONFIGURED",
      },
    ],
    futureCapabilities: [
      "Connector workers",
      "Scheduled jobs",
      "Runtime logs",
      "Health checks",
      "Cost controls",
    ],
  },
  {
    id: "supabase",
    name: "Supabase",
    officialBrand: "Supabase",
    priority: 4,
    purpose:
      "Database status, RLS status, storage status, project status e migration readiness.",
    status: "READY",
    healthScore: 0,
    lastSync: null,
    uptime: "not measured",
    credentialIndicator: "BACKEND_SECRET_REQUIRED",
    credentialLabel: "Supabase keys and DB URL remain backend-only",
    activationStyle: "READY_FOR_BACKEND_READONLY_CONNECTION",
    frontendBehavior: "Exibe snapshot Supabase lido somente pelo backend, sem UI de credenciais.",
    backendFuture:
      "api-server lê REST, auth, storage e metadados seguros de banco em modo somente leitura.",
    runtimeBoundary:
      "Nenhum request direto para Supabase no browser; nenhuma operação de escrita, SQL ou mudança de schema em P0.",
    stateStoreBoundary:
      "Somente readiness, contagens e postura RLS segura aparecem no dashboard; linhas de tabelas nunca são retornadas.",
    nextManualAction:
      "Adicionar SUPABASE_URL e SUPABASE_ANON_KEY ao backend; service role e DB URL são opcionais e backend-only.",
    buttonLabel: "Connect Supabase",
    checklistHref: "docs/connectors/SUPABASE_CONNECTOR_READINESS.md",
    risks: [
      "Exposição de service role",
      "RLS ausente",
      "Migrations destrutivas",
    ],
    activationSteps: [
      "Validar project status",
      "Auditar RLS",
      "Revisar migrations",
      "Habilitar persistência real",
    ],
    readyScreen: [
      { label: "Database Status", value: "metadata-only read", state: "READY" },
      { label: "RLS Status", value: "validation required", state: "READY" },
      {
        label: "Storage Status",
        value: "metadata-only read",
        state: "READY",
      },
      {
        label: "Project Status",
        value: "ready for backend connection",
        state: "READY",
      },
      {
        label: "Migration Boundary",
        value: "disabled in P0",
        state: "READY",
      },
    ],
    futureCapabilities: [
      "Database status",
      "RLS audit",
      "Storage status",
      "Connector state",
      "Operational event store",
    ],
  },
  {
    id: "microsoft365",
    name: "Microsoft 365",
    officialBrand: "Microsoft 365",
    priority: 5,
    purpose:
      "Outlook, Calendar, Contacts, OneDrive e Proposal Center manual-first.",
    status: "NOT_CONFIGURED",
    healthScore: 0,
    lastSync: null,
    uptime: "not measured",
    credentialIndicator: "OPERATOR_APPROVAL_REQUIRED",
    credentialLabel: "Tenant consent and Graph scopes not configured",
    activationStyle: "Microsoft Graph OAuth future activation",
    frontendBehavior:
      "Exibe readiness e consentimento necessário sem pedir tenant secret.",
    backendFuture:
      "Graph API só poderá ler dados aprovados após consentimento, auditoria e política manual-first.",
    runtimeBoundary:
      "Nenhum email, calendário ou arquivo é lido ou enviado pelo frontend.",
    stateStoreBoundary:
      "Dados pessoais exigem aprovação explícita, minimização e trilha de auditoria.",
    nextManualAction:
      "Definir escopos permitidos, consentimento, política de contatos e proposal center.",
    buttonLabel: "Connect Microsoft 365",
    checklistHref: "docs/connectors/MICROSOFT365_CONNECTOR_READINESS.md",
    risks: [
      "Acesso indevido a dados pessoais",
      "Envio automático sem aprovação",
      "Escopos Graph excessivos",
    ],
    activationSteps: [
      "Definir tenant e consentimento",
      "Aprovar escopos mínimos",
      "Testar leitura server-side",
      "Habilitar proposal center manual",
    ],
    readyScreen: [
      { label: "Outlook", value: "not configured", state: "NOT_CONFIGURED" },
      { label: "Calendar", value: "not configured", state: "NOT_CONFIGURED" },
      { label: "Contacts", value: "not configured", state: "NOT_CONFIGURED" },
      { label: "OneDrive", value: "not configured", state: "NOT_CONFIGURED" },
      {
        label: "Proposal Center",
        value: "ready after consent",
        state: "READY",
      },
    ],
    futureCapabilities: [
      "Outlook",
      "Calendar",
      "Contacts",
      "OneDrive",
      "Proposal Center",
    ],
  },
];

export const operationalActivityFeed: OperationalActivityEvent[] = [];

export const ecosystemReadiness = {
  providers: connectorGatewayProviders.length,
  ready: connectorGatewayProviders.filter(
    (connector) => connector.status === "READY",
  ).length,
  connected: connectorGatewayProviders.filter(
    (connector) => connector.status === "CONNECTED",
  ).length,
  locked: connectorGatewayProviders.filter(
    (connector) => connector.status === "LOCKED",
  ).length,
  globalHealthScore: 0,
  overallReadiness: "READY_FOR_REAL_CONNECTION",
  operationalUptime: "not measured until first real connector heartbeat",
} as const;
