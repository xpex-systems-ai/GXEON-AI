import { BadgeCheck, BookOpenCheck, BrainCircuit, ClipboardCheck, Github, Inbox, Linkedin, ListChecks, Lock, ReceiptText, Server, ShieldCheck, type LucideIcon } from "lucide-react";

export const privateQgTheme = {
  shell: "bg-[#030303] text-stone-100",
  background: "bg-[radial-gradient(circle_at_18%_8%,rgba(245,158,11,0.18),transparent_30%),radial-gradient(circle_at_82%_16%,rgba(180,83,9,0.12),transparent_28%),linear-gradient(135deg,#030303_0%,#0b0905_48%,#120d04_100%)]",
  panel: "border-amber-300/18 bg-[#090806]/85 shadow-2xl shadow-black/40 backdrop-blur-xl",
  panelMuted: "border-stone-700/70 bg-[#0d0c0a]/80 backdrop-blur-xl",
  goldText: "text-amber-200",
  mutedText: "text-stone-400",
  goldLine: "bg-gradient-to-r from-transparent via-amber-300 to-transparent",
};

export const qgStatusBadges = [
  "Modo Operacional Privado",
  "aguardando registros reais",
  "ativação controlada",
  "primeira receita pendente",
];

export const qgMissionCards = [
  { title: "captar lead", detail: "Selecionar um canal permitido e registrar o primeiro lead manualmente.", route: "/deploy-engine", callToAction: "Abrir checklist" },
  { title: "criar proposta", detail: "Transformar dor validada em proposta simples com escopo e valor.", route: "/ops/opportunities", callToAction: "Ir para P0" },
  { title: "registrar oportunidade", detail: "Registrar a primeira oportunidade real no P0 antes de criar tarefas.", route: "/ops/tasks", callToAction: "Ir para P1" },
  { title: "executar entrega", detail: "Executar o primeiro escopo aprovado com evidências revisáveis.", route: "/ops/validation", callToAction: "Ir para P3" },
  { title: "registrar recebimento", detail: "Registrar somente recebimento real confirmado fora do GXEON.", route: "/ops/ledger", callToAction: "Ir para P5" },
];

export const qgRevenuePipeline: Array<{ stage: string; title: string; detail: string; route: string; icon: LucideIcon }> = [
  { stage: "P0", title: "Opportunity Inbox", detail: "Caixa de oportunidades CONNECTED_MANUAL", route: "/ops/opportunities", icon: Inbox },
  { stage: "P1", title: "Task Queue", detail: "Fila de tarefas executáveis", route: "/ops/tasks", icon: ListChecks },
  { stage: "P2", title: "Execution Tracker", detail: "Rastreador de execução e prova", route: "/ops/execution", icon: ClipboardCheck },
  { stage: "P3", title: "Delivery Validation", detail: "Validação humana de entrega", route: "/ops/validation", icon: BadgeCheck },
  { stage: "P4", title: "Revenue Release Gate", detail: "Gate visual de liberação", route: "/ops/release", icon: ReceiptText },
  { stage: "P5", title: "Financial Ledger", detail: "Ledger financeiro seguro", route: "/ops/ledger", icon: BookOpenCheck },
];

export const qgConnectors = [
  { name: "GitHub", status: "CONNECTED_MANUAL", action: "Ver status", route: "/integrations", icon: Github },
  { name: "Vercel", status: "READY_TO_CONNECT", action: "Preparar conector", route: "/deploy-engine", icon: Server },
  { name: "Railway", status: "LOCKED", action: "Bloqueado", route: "/integrations", icon: Lock },
  { name: "Supabase", status: "LOCKED", action: "Bloqueado", route: "/integrations", icon: ShieldCheck },
  { name: "Microsoft 365", status: "FUTURE", action: "Bloqueado", route: "/integrations", icon: BrainCircuit },
  { name: "Workana", status: "NEEDS_REVIEW", action: "Preparar conector", route: "/ops/opportunities", icon: Inbox },
  { name: "99Freelas", status: "NEEDS_REVIEW", action: "Preparar conector", route: "/ops/opportunities", icon: Inbox },
  { name: "LinkedIn", status: "CONNECTED_MANUAL", action: "Ver status", route: "/ops/opportunities", icon: Linkedin },
  { name: "Mercado Pago", status: "LOCKED", action: "Bloqueado", route: "/ops/release", icon: ReceiptText },
];

export const qgSafetyBoundaries = [
  "Nenhuma API key no frontend.",
  "Nenhuma Supabase service role no frontend.",
  "Credenciais Railway, Supabase e Vercel ficam nos dashboards dos provedores.",
  "Ativação controlada somente depois de checklist humano.",
];
