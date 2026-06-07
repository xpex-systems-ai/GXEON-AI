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
  data_mode: "sample_manual_first";
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
  value_weight: 30,
  fit_weight: 30,
  urgency_weight: 20,
  simplicity_weight: 20,
  output: "fit_score and priority",
} as const;

export const activeOpportunityStatuses: OpportunityStatus[] = ["NEW", "REVIEWING", "QUALIFIED", "PROPOSAL_READY", "CONTACTED"];

// Archived sandbox/dev seed records are retained only for future testing and are not active operational records.
export const sampleManualFirstOpportunities: Opportunity[] = [
  {
    id: "OPP-P0-001",
    title: "Landing page conversion sprint for local clinic",
    source: "Referral",
    client_type: "Local Business",
    category: "Landing Page",
    estimated_value_brl: 4200,
    complexity: "LOW",
    urgency: "HIGH",
    fit_score: 88,
    priority: "HIGH",
    status: "QUALIFIED",
    next_action: "Draft one-page scope and confirm available brand assets.",
    evidence: "Manual note from referral channel; no personal data captured.",
    created_at: "2026-06-01T10:00:00.000Z",
    updated_at: "2026-06-05T16:30:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "OPP-P0-002",
    title: "Founder CRM cleanup and pipeline board",
    source: "LinkedIn",
    client_type: "Founder",
    category: "CRM",
    estimated_value_brl: 6800,
    complexity: "MEDIUM",
    urgency: "MEDIUM",
    fit_score: 82,
    priority: "HIGH",
    status: "REVIEWING",
    next_action: "Validate pain points manually and prepare discovery questions.",
    evidence: "Sample inbox record representing a manual operator note.",
    created_at: "2026-06-02T12:00:00.000Z",
    updated_at: "2026-06-04T14:20:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "OPP-P0-003",
    title: "Agency dashboard for campaign reporting",
    source: "Workana",
    client_type: "Agency",
    category: "Dashboard",
    estimated_value_brl: 9500,
    complexity: "MEDIUM",
    urgency: "HIGH",
    fit_score: 91,
    priority: "CRITICAL",
    status: "PROPOSAL_READY",
    next_action: "Prepare manual proposal with milestone-based delivery plan.",
    evidence: "Synthetic marketplace-style brief; not scraped and not connected.",
    created_at: "2026-06-03T09:10:00.000Z",
    updated_at: "2026-06-05T11:45:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "OPP-P0-004",
    title: "Inventory spreadsheet organization for retailer",
    source: "99Freelas",
    client_type: "Small Business",
    category: "Data Organization",
    estimated_value_brl: 2800,
    complexity: "LOW",
    urgency: "MEDIUM",
    fit_score: 76,
    priority: "MEDIUM",
    status: "NEW",
    next_action: "Classify spreadsheet complexity and request anonymized sample columns.",
    evidence: "Static sample record created for dashboard validation only.",
    created_at: "2026-06-03T18:25:00.000Z",
    updated_at: "2026-06-03T18:25:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "OPP-P0-005",
    title: "Creator media kit and offer funnel",
    source: "Community",
    client_type: "Creator",
    category: "Landing Page",
    estimated_value_brl: 3600,
    complexity: "LOW",
    urgency: "LOW",
    fit_score: 70,
    priority: "MEDIUM",
    status: "CONTACTED",
    next_action: "Send manual checklist for goals, audience, and reference links.",
    evidence: "Community-sourced sample scenario with no real identity.",
    created_at: "2026-06-04T08:00:00.000Z",
    updated_at: "2026-06-05T08:35:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "OPP-P0-006",
    title: "Automation map for appointment reminders",
    source: "Manual",
    client_type: "Local Business",
    category: "Automation",
    estimated_value_brl: 5200,
    complexity: "MEDIUM",
    urgency: "HIGH",
    fit_score: 84,
    priority: "HIGH",
    status: "QUALIFIED",
    next_action: "Map current manual workflow before any integration proposal.",
    evidence: "Operator-entered sample opportunity; automation remains inactive.",
    created_at: "2026-06-04T13:45:00.000Z",
    updated_at: "2026-06-05T15:00:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "OPP-P0-007",
    title: "Startup AI workflow discovery session",
    source: "Upwork",
    client_type: "Startup",
    category: "AI Workflow",
    estimated_value_brl: 7800,
    complexity: "HIGH",
    urgency: "MEDIUM",
    fit_score: 79,
    priority: "HIGH",
    status: "REVIEWING",
    next_action: "Confirm feasibility boundaries and avoid promising live automation.",
    evidence: "Synthetic external-platform lead; no API call and no scrape.",
    created_at: "2026-06-04T19:10:00.000Z",
    updated_at: "2026-06-05T09:30:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "OPP-P0-008",
    title: "Consulting audit for underperforming sales page",
    source: "Freelancer",
    client_type: "Small Business",
    category: "Consulting",
    estimated_value_brl: 2400,
    complexity: "LOW",
    urgency: "MEDIUM",
    fit_score: 73,
    priority: "MEDIUM",
    status: "NEW",
    next_action: "Create manual audit outline and identify evidence needed.",
    evidence: "Sample brief written internally for P0 validation.",
    created_at: "2026-06-05T10:15:00.000Z",
    updated_at: "2026-06-05T10:15:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "OPP-P0-009",
    title: "Simple dashboard for founder KPI tracking",
    source: "Referral",
    client_type: "Founder",
    category: "Dashboard",
    estimated_value_brl: 6100,
    complexity: "MEDIUM",
    urgency: "LOW",
    fit_score: 81,
    priority: "HIGH",
    status: "ARCHIVED",
    next_action: "Archive until founder confirms budget and sample metrics.",
    evidence: "Manual-first sample with inactive status; not counted as active value.",
    created_at: "2026-05-30T15:20:00.000Z",
    updated_at: "2026-06-02T10:20:00.000Z",
    data_mode: "sample_manual_first",
  },
  {
    id: "OPP-P0-010",
    title: "Won sample: micro consulting validation call",
    source: "Manual",
    client_type: "Unknown",
    category: "Consulting",
    estimated_value_brl: 900,
    complexity: "LOW",
    urgency: "LOW",
    fit_score: 64,
    priority: "LOW",
    status: "WON",
    next_action: "Record as sample-only closed state; do not claim real revenue.",
    evidence: "Static demonstration of WON status for UI math only; no real payment.",
    created_at: "2026-05-28T11:00:00.000Z",
    updated_at: "2026-06-01T17:00:00.000Z",
    data_mode: "sample_manual_first",
  },
];

export const activeOperationalOpportunities: Opportunity[] = [];

export function getOpportunityStatusCounts(opportunities: Opportunity[] = activeOperationalOpportunities) {
  return opportunityPipelineStatuses.map((status) => ({
    status,
    count: opportunities.filter((opportunity) => opportunity.status === status).length,
    estimatedValueBrl: opportunities
      .filter((opportunity) => opportunity.status === status)
      .reduce((total, opportunity) => total + opportunity.estimated_value_brl, 0),
  }));
}

export function getOpportunityInboxSummary(opportunities: Opportunity[] = activeOperationalOpportunities) {
  const activeOpportunities = opportunities.filter((opportunity) => activeOpportunityStatuses.includes(opportunity.status));
  const wonSampleValue = opportunities
    .filter((opportunity) => opportunity.status === "WON")
    .reduce((total, opportunity) => total + opportunity.estimated_value_brl, 0);

  return {
    totalCount: opportunities.length,
    activeCount: activeOpportunities.length,
    activePipelineValueBrl: activeOpportunities.reduce((total, opportunity) => total + opportunity.estimated_value_brl, 0),
    totalEstimatedValueBrl: opportunities.reduce((total, opportunity) => total + opportunity.estimated_value_brl, 0),
    highPriorityCount: opportunities.filter((opportunity) => opportunity.priority === "HIGH" || opportunity.priority === "CRITICAL").length,
    criticalPriorityCount: opportunities.filter((opportunity) => opportunity.priority === "CRITICAL").length,
    wonSampleValueBrl: wonSampleValue,
  };
}
