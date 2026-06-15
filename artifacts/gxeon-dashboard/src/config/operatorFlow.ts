export type OperatorFlowStatus = "live" | "pending" | "review" | "locked";
export type OperatorFlowIconKey = "BrainCircuit" | "BriefcaseBusiness" | "Database" | "HandCoins" | "Inbox" | "Kanban" | "ListChecks" | "LockKeyhole" | "Plug" | "Radar" | "Rocket" | "Route" | "ShieldCheck" | "Table2" | "TrendingUp" | "Workflow";
export type OperatorFlowStep = { step?: number; labelPt: string; labelEn: string; href: string; icon: OperatorFlowIconKey; status: OperatorFlowStatus; description?: string; manualOnly: boolean; copyOnly?: boolean; previewOnly?: boolean; safe?: boolean; officialR100Flow?: boolean; };
export type OperatorFlowGroup = { title: string; purpose: string; items: OperatorFlowStep[] };

const safety = { manualOnly: true, copyOnly: true, previewOnly: true, safe: true };
const groups: OperatorFlowGroup[] = [
  { title: "R$100 Official Flow", purpose: "Fluxo principal para monetização manual segura.", items: [
    { step: 1, labelPt: "Sala R$100", labelEn: "R$100 War Room", href: "/ops/r100-war-room", icon: "HandCoins", status: "review", description: "Sala de guerra com próxima ação manual mais rápida.", officialR100Flow: true, ...safety },
    { step: 2, labelPt: "Cérebro", labelEn: "Brain", href: "/ops/brain", icon: "BrainCircuit", status: "review", description: "Comando central de prioridade e sprint.", officialR100Flow: true, ...safety },
    { step: 3, labelPt: "Agente Executor Manual", labelEn: "Operator Assistant", href: "/ops/operator-assistant", icon: "BrainCircuit", status: "review", description: "Camada P1/P2 que recomenda a próxima ação manual e cria handoff interno.", officialR100Flow: true, ...safety },
    { step: 4, labelPt: "Sprint de Receita", labelEn: "Revenue Sprint", href: "/ops/revenue-sprint", icon: "HandCoins", status: "review", description: "Define meta e rota manual para R$100.", officialR100Flow: true, ...safety },
    { step: 5, labelPt: "Perspectivas", labelEn: "Prospects", href: "/ops/prospects", icon: "Inbox", status: "review", description: "Cadastro manual de prospect fornecido pelo operador.", officialR100Flow: true, ...safety },
    { step: 6, labelPt: "Ofertas de Clientes", labelEn: "Client Offers", href: "/ops/client-offers", icon: "HandCoins", status: "review", description: "Cria oferta copiável, sem envio automático.", officialR100Flow: true, ...safety },
    { step: 7, labelPt: "Pagamento Manual", labelEn: "Manual Payment", href: "/ops/manual-payment", icon: "HandCoins", status: "review", description: "Cria instrução Pix/Mercado Pago manual, sem API.", officialR100Flow: true, ...safety },
    { step: 8, labelPt: "Fechamento R$100", labelEn: "R$100 Close Loop", href: "/ops/revenue-close-loop", icon: "HandCoins", status: "review", description: "Ciclo de fechamento: oferta, resposta, pagamento, prova e ledger.", officialR100Flow: true, ...safety },
    { step: 9, labelPt: "Livro de Contas", labelEn: "Ledger", href: "/ops/ledger", icon: "Table2", status: "pending", description: "Prévia e receita confirmada manualmente pelo operador.", officialR100Flow: true, ...safety },
  ]},
  { title: "Delivery Pipeline", purpose: "Fluxo para entregar serviço quando existir pacote de execução.", items: [
    { step: 9, labelPt: "Caixa de Entrada", labelEn: "Inbox", href: "/ops/opportunities", icon: "Inbox", status: "live", manualOnly: true, safe: true },
    { step: 10, labelPt: "Tarefas", labelEn: "Tasks", href: "/ops/tasks", icon: "ListChecks", status: "live", manualOnly: true, safe: true },
    { step: 11, labelPt: "Corretor P0", labelEn: "Broker P0", href: "/ops/broker", icon: "Route", status: "review", manualOnly: true, safe: true },
    { step: 12, labelPt: "Execução", labelEn: "Execution", href: "/ops/execution", icon: "Workflow", status: "pending", manualOnly: true, safe: true },
    { step: 13, labelPt: "Espaço de Trabalho da Entrega", labelEn: "Delivery Workspace", href: "/ops/delivery-workspace", icon: "BriefcaseBusiness", status: "review", manualOnly: true, safe: true },
    { step: 14, labelPt: "Validação", labelEn: "Validation", href: "/ops/validation", icon: "ShieldCheck", status: "pending", manualOnly: true, safe: true },
    { step: 15, labelPt: "Lançamento", labelEn: "Release", href: "/ops/release", icon: "Rocket", status: "pending", manualOnly: true, safe: true },
  ]},
  { title: "Acquisition", purpose: "Fontes de oportunidade e sinais de demanda.", items: [
    { labelPt: "Radar X", labelEn: "Radar X", href: "/ops/radar-x", icon: "Radar", status: "review", manualOnly: true, previewOnly: true, safe: true },{ labelPt: "Demanda no GitHub", labelEn: "GitHub Demand", href: "/ops/github-demand", icon: "Radar", status: "review", manualOnly: true, previewOnly: true, safe: true },{ labelPt: "Tarefas Web3", labelEn: "Web3 Tasks", href: "/ops/web3-tasks", icon: "Radar", status: "review", manualOnly: true, previewOnly: true, safe: true },{ labelPt: "Economia de Agentes", labelEn: "Agent Economy", href: "/ops/agent-economy", icon: "Radar", status: "review", manualOnly: true, previewOnly: true, safe: true },{ labelPt: "Agentes Domésticos", labelEn: "Home Agents", href: "/ops/agent-conectou", icon: "Plug", status: "review", manualOnly: true, previewOnly: true, safe: true },{ labelPt: "Propostas", labelEn: "Proposals", href: "/marketplace", icon: "TrendingUp", status: "live", manualOnly: true, safe: true },
  ]},
  { title: "Infrastructure", purpose: "Base operacional e conectores.", items: [
    { labelPt: "Memória R$100", labelEn: "R$100 Memory", href: "/ops/r100-state", icon: "Database", status: "review", description: "Verificação e recuperação manual do estado R$100.", manualOnly: true, previewOnly: true, safe: true },{ labelPt: "Conectores", labelEn: "Connectors", href: "/ops/connectors", icon: "Plug", status: "review", manualOnly: true, safe: true },{ labelPt: "R$100 DB Mirror / Banco", labelEn: "R$100 DB Mirror", href: "/ops/r100-db-mirror", icon: "Database", status: "review", description: "Console manual de ativação e verificação do espelho de banco R$100.", manualOnly: true, previewOnly: true, safe: true },{ labelPt: "Implantações", labelEn: "Deployments", href: "/deploy-engine", icon: "Rocket", status: "pending", manualOnly: true, safe: true },{ labelPt: "Análise", labelEn: "Analytics", href: "/analytics", icon: "Kanban", status: "live", manualOnly: true, safe: true },{ labelPt: "Segurança", labelEn: "Security", href: "/settings", icon: "LockKeyhole", status: "live", manualOnly: true, safe: true },
  ]},
];
export const getOfficialFlowGroups = () => groups;
export const getOfficialStepByHref = (href: string) => groups.flatMap(g => g.items).find(i => href === i.href || (i.href !== "/" && href.startsWith(i.href)));
const r100 = groups[0].items;
export const getNextOfficialStep = (href: string) => { const i = r100.findIndex(s => s.href === getOfficialStepByHref(href)?.href); return i >= 0 ? r100[i + 1] : undefined; };
export const getPreviousOfficialStep = (href: string) => { const i = r100.findIndex(s => s.href === getOfficialStepByHref(href)?.href); return i > 0 ? r100[i - 1] : undefined; };
export const getOfficialR100FlowSteps = () => r100;

export const getOfficialStepByRoute = getOfficialStepByHref;
export function getStepStatusFromWorkflowSummary(step:number,summary?:{currentStep?:number;nextStep?:number}){return step===summary?.currentStep?"CURRENT":step===summary?.nextStep?"NEXT":step<(summary?.currentStep??0)?"DONE":"PENDING";}
