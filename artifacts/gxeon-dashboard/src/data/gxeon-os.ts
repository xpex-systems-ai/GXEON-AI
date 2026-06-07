import {
  BarChart,
  Blocks,
  Bot,
  Cpu,
  Database,
  Inbox,
  ListChecks,
  ClipboardCheck,
  BadgeCheck,
  ReceiptText,
  BookOpenCheck,
  Network,
  Plug,
  Radar,
  Settings,
  Shield,
  Store,
  Wallet,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type GxeonModule = {
  id: string;
  name: string;
  icon: LucideIcon;
  route: string;
  accent: string;
  widgets: string[];
  status?: "mock_ready" | "placeholder_only" | "all_disconnected";
  description: string;
};

export const gxeonNavigation: GxeonModule[] = [
  {
    id: "command_center",
    name: "QG Central",
    icon: Cpu,
    route: "/",
    accent: "cyan",
    widgets: ["System Status", "Live Metrics", "Execution Score", "Active Agents", "Revenue Overview", "Infrastructure Health"],
    status: "mock_ready",
    description: "Visão central do Private QG com prioridades, segurança e execução de receita em modo manual-first.",
  },
  {
    id: "war_room",
    name: "Sala de Guerra",
    icon: Shield,
    route: "/war-room",
    accent: "rose",
    widgets: ["Risk Matrix", "Mission Tracker", "Execution Pipeline", "Critical Alerts", "Deployment Readiness"],
    status: "mock_ready",
    description: "Centro tático para risco, missões críticas e status de deploy sem acionar integrações reais.",
  },
  {
    id: "radar_x",
    name: "Radar X",
    icon: Radar,
    route: "/radar-x",
    accent: "emerald",
    widgets: ["Opportunity Scanner", "API Discovery", "Workana Sources", "Lead Sources", "Signal Streams", "Trend Detection"],
    status: "placeholder_only",
    description: "Camada visual de inteligência preditiva preparada para futuras fontes externas.",
  },
  {
    id: "agent_hub",
    name: "Agent Hub",
    icon: Bot,
    route: "/agent-hub",
    accent: "violet",
    widgets: ["Agent Registry", "Agent Status", "Agent Marketplace", "Agent Performance", "Agent Deployment"],
    status: "mock_ready",
    description: "Orquestração visual de agentes, desempenho e implantação em modo privado/manual-first.",
  },
  {
    id: "marketplace",
    name: "Mercado",
    icon: Store,
    route: "/marketplace",
    accent: "amber",
    widgets: ["Products", "Services", "Digital Assets", "Subscriptions", "Offers"],
    status: "mock_ready",
    description: "Mesa visual de ofertas, serviços e ativos para monetização privada gradual.",
  },
  {
    id: "task_engine",
    name: "Task Engine",
    icon: Workflow,
    route: "/task-engine",
    accent: "blue",
    widgets: ["Workflow Queue", "Execution Timeline", "Automation Rules", "SLA Monitor", "Operator Handoff"],
    status: "mock_ready",
    description: "Motor visual de tarefas para filas, automações e handoffs de execução.",
  },
  {
    id: "financial_core",
    name: "Financial Core",
    icon: Wallet,
    route: "/financial-core",
    accent: "green",
    widgets: ["Revenue Dashboard", "Opportunity Inbox", "Task Queue P1", "Transactions", "Subscriptions", "Billing", "Forecast"],
    status: "mock_ready",
    description: "Núcleo financeiro visual para receita, billing, assinaturas e forecast sem transações reais.",
  },
  {
    id: "revenue_engine_p0",
    name: "P0 Caixa de Oportunidades",
    icon: Inbox,
    route: "/ops/opportunities",
    accent: "emerald",
    widgets: ["Opportunity Inbox", "Task Queue P1", "Manual Scoring", "Pipeline Status", "Task Queue Candidate", "Evidence Notes"],
    status: "mock_ready",
    description: "Inbox manual-first para capturar, classificar, pontuar e rotear oportunidades sem APIs externas.",
  },

  {
    id: "revenue_engine_p1",
    name: "P1 Fila de Tarefas",
    icon: ListChecks,
    route: "/ops/tasks",
    accent: "blue",
    widgets: ["Task Queue P1", "Manual Execution Board", "Task Status Counts", "Opportunity Links", "Execution Value"],
    status: "mock_ready",
    description: "Task Queue manual-first para transformar oportunidades qualificadas em tarefas executáveis sem APIs externas.",
  },
  {
    id: "revenue_engine_p2",
    name: "P2 Rastreador de Execução",
    icon: ClipboardCheck,
    route: "/ops/execution",
    accent: "violet",
    widgets: ["Execution Tracker", "Proof-of-Work", "Manual Status Board", "Blockers", "Deliverables", "Evidence States"],
    status: "mock_ready",
    description: "Execution Tracker manual-first para conectar tarefas a progresso, bloqueios, entregáveis e prova de trabalho sem APIs externas.",
  },
  {
    id: "revenue_engine_p3",
    name: "P3 Validação de Entrega",
    icon: BadgeCheck,
    route: "/ops/validation",
    accent: "emerald",
    widgets: ["Delivery Validation", "Approval Workflow", "Evidence Review", "Revision States", "Rejection States", "Release Gate Prep"],
    status: "mock_ready",
    description: "Delivery Validation manual-first para aprovar, revisar, rejeitar ou arquivar entregas sem APIs externas, persistência ou pagamentos.",
  },
  {
    id: "revenue_engine_p4",
    name: "P4 Release Gate",
    icon: ReceiptText,
    route: "/ops/release",
    accent: "green",
    widgets: ["Revenue Release Gate", "Financial Readiness", "Release Board", "Approval Chains", "Pipeline Traceability", "P5 Ledger Financeiro"],
    status: "mock_ready",
    description: "Revenue Release Gate manual-first para conectar validação de entrega à prontidão financeira sem APIs, banco de dados, gateways ou transações reais.",
  },
  {
    id: "revenue_engine_p5",
    name: "P5 Ledger Financeiro",
    icon: BookOpenCheck,
    route: "/ops/ledger",
    accent: "teal",
    widgets: ["Financial Ledger", "Revenue Accounting Board", "Revenue Metrics", "Release Links", "Pipeline Traceability", "P6 Persistence Prep"],
    status: "mock_ready",
    description: "Ledger financeiro manual-first para visibilidade contábil segura sem APIs, banco de dados, gateways, invoices ou transações reais.",
  },

  {
    id: "ledger",
    name: "Ledger",
    icon: Database,
    route: "/ledger",
    accent: "teal",
    widgets: ["Global Transactions", "Wallets", "Settlement", "Audit Trail"],
    status: "mock_ready",
    description: "Livro razão visual para auditoria, carteiras e liquidação em estado seguro/manual-first.",
  },
  {
    id: "blockchain",
    name: "Blockchain",
    icon: Blocks,
    route: "/blockchain",
    accent: "fuchsia",
    widgets: ["Smart Contracts", "Nodes", "Wallet Connections", "On-chain Events"],
    status: "placeholder_only",
    description: "Área blockchain renderizada como placeholder seguro até conexão on-chain real.",
  },
  {
    id: "api_gateway",
    name: "Infraestrutura",
    icon: Network,
    route: "/api-gateway",
    accent: "sky",
    widgets: ["Connected APIs", "API Health", "API Usage", "API Marketplace"],
    status: "all_disconnected",
    description: "Infraestrutura visual com APIs desconectadas, conectores travados e ativação controlada.",
  },
  {
    id: "integrations",
    name: "Segurança",
    icon: Plug,
    route: "/integrations",
    accent: "orange",
    widgets: ["Supabase", "Railway", "Vercel", "GitHub", "Mercado Pago", "Microsoft 365", "Workana", "99Freelas", "LinkedIn"],
    status: "all_disconnected",
    description: "Hub privado de conectores, credenciais fora do frontend e nenhuma chamada real ativada.",
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: BarChart,
    route: "/analytics",
    accent: "indigo",
    widgets: ["North Star Metrics", "Conversion Funnel", "Cohort Radar", "Revenue Signals", "Operator Insights"],
    status: "mock_ready",
    description: "Analytics visual para validar experiência, gráficos e sinais operacionais do QG.",
  },
  {
    id: "automation",
    name: "Automation",
    icon: Zap,
    route: "/automation",
    accent: "yellow",
    widgets: ["Playbooks", "Triggers", "Rules Engine", "Scheduled Jobs", "Human Approval"],
    status: "mock_ready",
    description: "Camada de automação visual para fluxos, gatilhos e aprovações humanas antes de qualquer ativação real.",
  },
  {
    id: "settings",
    name: "Settings",
    icon: Settings,
    route: "/settings",
    accent: "slate",
    widgets: ["Workspace", "Access Control", "Feature Flags", "Theme", "Activation Plan"],
    status: "mock_ready",
    description: "Configurações privadas do operador, preferências visuais e plano de ativação controlada.",
  },
];

export const integrationProviders = [
  "Supabase",
  "Railway",
  "Vercel",
  "GitHub",
  "Mercado Pago",
  "Microsoft 365",
  "Workana",
  "99Freelas",
  "LinkedIn",
];

export const infrastructureStack = [
  { label: "Frontend", value: "Vercel", state: "Visual ready" },
  { label: "Backend", value: "Railway", state: "Pending connection" },
  { label: "Database", value: "Supabase", state: "Pending connection" },
  { label: "Repository", value: "GitHub", state: "Pending connection" },
  { label: "Runtime", value: "Node.js", state: "Prepared" },
  { label: "Package Manager", value: "pnpm", state: "Locked" },
];

export const activationPlan = [
  "Renderizar 100% do ecossistema visual",
  "Validar navegação completa e responsiva",
  "Testar dados sample/manual-first e estados vazios",
  "Publicar preview no Vercel",
  "Preparar Railway, Supabase, Mercado Pago, Radar X e APIs externas para ativação controlada fora do frontend",
];

export function slugifyGxeonLabel(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function titleFromGxeonSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getGxeonModuleById(moduleId: string) {
  return gxeonNavigation.find((module) => module.id === moduleId) ?? gxeonNavigation[0];
}

export function buildGxeonPlaceholderPath(moduleId: string, label: string) {
  return `/placeholder/${moduleId}/${slugifyGxeonLabel(label)}`;
}
