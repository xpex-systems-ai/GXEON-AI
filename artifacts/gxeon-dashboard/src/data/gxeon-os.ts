import {
  BarChart,
  Blocks,
  Bot,
  Cpu,
  Database,
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
    name: "Command Center",
    icon: Cpu,
    route: "/",
    accent: "cyan",
    widgets: ["System Status", "Live Metrics", "Execution Score", "Active Agents", "Revenue Overview", "Infrastructure Health"],
    status: "mock_ready",
    description: "Investor demo command center for the GXEON execution operating model, using visual-only telemetry and safe preview states.",
  },
  {
    id: "war_room",
    name: "War Room",
    icon: Shield,
    route: "/war-room",
    accent: "rose",
    widgets: ["Risk Matrix", "Mission Tracker", "Execution Pipeline", "Critical Alerts", "Deployment Readiness"],
    status: "mock_ready",
    description: "Tactical risk and mission surface for investor walkthroughs, with deployment readiness shown without real production actions.",
  },
  {
    id: "radar_x",
    name: "Radar X",
    icon: Radar,
    route: "/radar-x",
    accent: "emerald",
    widgets: ["Opportunity Scanner", "API Discovery", "Freelancer Sources", "Lead Sources", "Signal Streams", "Trend Detection"],
    status: "placeholder_only",
    description: "Opportunity intelligence surface for showing how signals can become qualified execution work; external sources remain pending.",
  },
  {
    id: "agent_hub",
    name: "Agent Hub",
    icon: Bot,
    route: "/agent-hub",
    accent: "violet",
    widgets: ["Agent Registry", "Agent Status", "Agent Marketplace", "Agent Performance", "Agent Deployment"],
    status: "mock_ready",
    description: "Human/AI coordination surface for roles, accountability and handoffs, presented as a visual demo only.",
  },
  {
    id: "marketplace",
    name: "Marketplace",
    icon: Store,
    route: "/marketplace",
    accent: "amber",
    widgets: ["Products", "Services", "Digital Assets", "Subscriptions", "Offers"],
    status: "mock_ready",
    description: "Offer and job packaging layer for future monetization, currently shown without live transactions.",
  },
  {
    id: "task_engine",
    name: "Task Engine",
    icon: Workflow,
    route: "/task-engine",
    accent: "blue",
    widgets: ["Workflow Queue", "Execution Timeline", "Automation Rules", "SLA Monitor", "Operator Handoff"],
    status: "mock_ready",
    description: "Execution queue layer that turns opportunities into tasks, milestones and operator handoffs in safe preview mode.",
  },
  {
    id: "financial_core",
    name: "Financial Core",
    icon: Wallet,
    route: "/financial-core",
    accent: "green",
    widgets: ["Revenue Dashboard", "Transactions", "Subscriptions", "Billing", "Forecast"],
    status: "mock_ready",
    description: "Revenue and billing model for investor review; financial data is visual-only until Supabase activation is approved.",
  },
  {
    id: "ledger",
    name: "Ledger",
    icon: Database,
    route: "/ledger",
    accent: "teal",
    widgets: ["Global Transactions", "Wallets", "Settlement", "Audit Trail"],
    status: "mock_ready",
    description: "Ledger and wallet visibility model for audit readiness; no database writes or settlements are active.",
  },
  {
    id: "blockchain",
    name: "Blockchain",
    icon: Blocks,
    route: "/blockchain",
    accent: "fuchsia",
    widgets: ["Smart Contracts", "Nodes", "Wallet Connections", "On-chain Events"],
    status: "placeholder_only",
    description: "Future blockchain surface, intentionally limited to a roadmap placeholder with no on-chain connection.",
  },
  {
    id: "api_gateway",
    name: "API Gateway",
    icon: Network,
    route: "/api-gateway",
    accent: "sky",
    widgets: ["Connected APIs", "API Health", "API Usage", "API Marketplace"],
    status: "all_disconnected",
    description: "API control surface showing disabled connections and activation gates; no real API calls are enabled.",
  },
  {
    id: "integrations",
    name: "Integrations",
    icon: Plug,
    route: "/integrations",
    accent: "orange",
    widgets: ["Supabase", "Vercel", "GitHub", "Microsoft 365 / Copilot", "Mercado Pago", "OpenAI", "Freelancer", "Upwork", "Public Data Sources"],
    status: "all_disconnected",
    description: "Provider activation map for Supabase, Vercel, GitHub and future tools; credentials and calls remain disabled.",
  },
  {
    id: "analytics",
    name: "Analytics",
    icon: BarChart,
    route: "/analytics",
    accent: "indigo",
    widgets: ["North Star Metrics", "Conversion Funnel", "Cohort Radar", "Revenue Signals", "Operator Insights"],
    status: "mock_ready",
    description: "Outcome intelligence layer for conversion, execution and revenue signals, using demo data only.",
  },
  {
    id: "automation",
    name: "Automation",
    icon: Zap,
    route: "/automation",
    accent: "yellow",
    widgets: ["Playbooks", "Triggers", "Rules Engine", "Scheduled Jobs", "Human Approval"],
    status: "mock_ready",
    description: "Human-approved playbook surface for future automation, with no autonomous production actions active.",
  },
  {
    id: "settings",
    name: "Settings",
    icon: Settings,
    route: "/settings",
    accent: "slate",
    widgets: ["Workspace", "Access Control", "Feature Flags", "Theme", "Activation Plan"],
    status: "mock_ready",
    description: "Workspace settings and activation roadmap for safe, phased investor demo progression.",
  },
];

export const integrationProviders = [
  "Supabase",
  "Vercel",
  "GitHub",
  "Microsoft 365 / Copilot",
  "OpenAI",
  "Mercado Pago",
  "Freelancer",
  "Upwork",
  "Public Data Sources",
];

export const infrastructureStack = [
  { label: "Demo layer", value: "Vercel", state: "Preview-ready" },
  { label: "Source of truth", value: "GitHub", state: "Active" },
  { label: "Data/Auth/Storage", value: "Supabase", state: "Pending activation" },
  { label: "Execution factory", value: "Codex", state: "Active" },
  { label: "Strategy layer", value: "ChatGPT", state: "Active" },
  { label: "Reporting", value: "Microsoft 365 / Copilot", state: "Planned" },
];

export const activationPlan = [
  "Keep the investor demo visual-first and explicit",
  "Validate Opportunity → Task → Execution → Revenue → Analytics",
  "Collect screenshot and GitHub issue evidence",
  "Run Supabase non-mutating readiness checks after credentials are secured",
  "Activate integrations only through approved, auditable missions",
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
