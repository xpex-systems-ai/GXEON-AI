export type OpportunitySource = "Workana" | "99Freelas" | "Upwork" | "Freelancer" | "LinkedIn" | "Community" | "Referral" | "Manual";
export type ClientType = "Small Business" | "Founder" | "Agency" | "Creator" | "Local Business" | "Startup" | "Unknown";
export type OpportunityCategory = "Landing Page" | "Dashboard" | "Automation" | "AI Workflow" | "CRM" | "Data Organization" | "Consulting" | "Other";
export type OpportunityComplexity = "LOW" | "MEDIUM" | "HIGH";
export type OpportunityUrgency = "LOW" | "MEDIUM" | "HIGH";
export type OpportunityPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OpportunityStatus = "NEW" | "REVIEWING" | "QUALIFIED" | "PROPOSAL_READY" | "CONTACTED" | "WON" | "LOST" | "ARCHIVED";

export type Opportunity = {
  id: string;
  title: string;
  source: OpportunitySource;
  url?: string;
  client_type: ClientType;
  category: OpportunityCategory;
  estimated_value_brl: number;
  complexity: OpportunityComplexity;
  urgency: OpportunityUrgency;
  fit_score: number;
  priority: OpportunityPriority;
  status: OpportunityStatus;
  next_action: string;
  evidence?: string;
  created_at: string;
  updated_at: string;
  data_mode: "real";
};

export const opportunityPipelineStatuses: OpportunityStatus[] = [
  "NEW",
  "REVIEWING",
  "QUALIFIED",
  "PROPOSAL_READY",
  "CONTACTED",
  "WON",
  "LOST",
  "ARCHIVED",
];

export const opportunityScoringModel = {
  mode: "DISABLED_UNTIL_REAL_DATA",
  value_weight: 0,
  fit_weight: 0,
  urgency_weight: 0,
  simplicity_weight: 0,
  output: "EMPTY_REAL_DATA",
} as const;

export const activeOpportunityStatuses: OpportunityStatus[] = ["NEW", "REVIEWING", "QUALIFIED", "PROPOSAL_READY", "CONTACTED"];

export const activeOperationalOpportunities: Opportunity[] = [];

export function getOpportunityStatusCounts(opportunities: Opportunity[] = activeOperationalOpportunities) {
  return opportunityPipelineStatuses.map((status) => ({
    status,
    count: opportunities.filter((opportunity) => opportunity.status === status).length,
    estimatedValueBrl: opportunities.filter((opportunity) => opportunity.status === status).reduce((sum, opportunity) => sum + opportunity.estimated_value_brl, 0),
  }));
}

export function getOpportunitySummary(opportunities: Opportunity[] = activeOperationalOpportunities) {
  const active = opportunities.filter((opportunity) => activeOpportunityStatuses.includes(opportunity.status));
  return {
    total: opportunities.length,
    active: active.length,
    activePipelineValueBrl: active.reduce((sum, opportunity) => sum + opportunity.estimated_value_brl, 0),
    wonSampleValueBrl: 0,
    wonRealValueBrl: opportunities.filter((opportunity) => opportunity.status === "WON").reduce((sum, opportunity) => sum + opportunity.estimated_value_brl, 0),
    critical: opportunities.filter((opportunity) => opportunity.priority === "CRITICAL").length,
  };
}

export const opportunityEmptyState = {
  state: "EMPTY_REAL_DATA",
  title: "Nenhuma oportunidade real conectada",
  description: "A inbox não contém leads, clientes, valores ou oportunidades simuladas. Ela aguardará a próxima fase de conexão real.",
  nextManualAction: "Conectar GitHub primeiro e só habilitar oportunidades quando uma fonte real aprovada existir.",
  previousRoute: "/ops/connectors",
  nextRoute: "/ops/tasks",
} as const;
