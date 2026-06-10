export type RadarManualSource = "Manual" | "Referral" | "Workana" | "99Freelas" | "LinkedIn" | "Email" | "Form";

export type RadarManualIntakePayload = {
  source: RadarManualSource;
  title: string;
  problem: string;
  budget?: string;
  urgency?: string;
  contactChannel?: string;
  consentConfirmed: boolean;
  notes?: string;
};

export type RadarOpportunityPreview = {
  accepted: true;
  persistence: "PREVIEW_ONLY";
  automation: "NONE";
  normalized: {
    source: RadarManualSource;
    title: string;
    problem: string;
    budget: string | null;
    urgency: string | null;
    contactChannel: string | null;
    consentConfirmed: true;
  };
  score: number;
  scoringExplanation: string[];
  recommendedNextStep: string;
};

const allowedSources = new Set<RadarManualSource>(["Manual", "Referral", "Workana", "99Freelas", "LinkedIn", "Email", "Form"]);

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 2000) : "";
}

export function previewManualOpportunity(payload: Partial<RadarManualIntakePayload>): RadarOpportunityPreview {
  const source = payload.source;
  if (!source || !allowedSources.has(source)) {
    throw new Error("RADAR_SOURCE_NOT_ALLOWED");
  }

  const title = clean(payload.title);
  const problem = clean(payload.problem);
  if (!title || !problem) {
    throw new Error("RADAR_REQUIRED_FIELDS_MISSING");
  }
  if (payload.consentConfirmed !== true) {
    throw new Error("RADAR_CONSENT_REQUIRED");
  }

  const budget = clean(payload.budget) || null;
  const urgency = clean(payload.urgency) || null;
  const contactChannel = clean(payload.contactChannel) || null;
  const notes = clean(payload.notes);

  const scoringExplanation: string[] = ["Operator-submitted intake only; no scraping or marketplace automation was used."];
  let score = 35;

  if (budget) {
    score += 20;
    scoringExplanation.push("Budget signal present.");
  } else {
    scoringExplanation.push("Budget needs manual qualification.");
  }

  if (urgency) {
    score += 15;
    scoringExplanation.push("Urgency signal present.");
  }

  if (contactChannel) {
    score += 15;
    scoringExplanation.push("Safe follow-up channel present.");
  }

  if (notes.length > 40 || problem.length > 120) {
    score += 15;
    scoringExplanation.push("Problem context is sufficiently detailed for a microtask proposal draft.");
  }

  score = Math.min(score, 100);

  return {
    accepted: true,
    persistence: "PREVIEW_ONLY",
    automation: "NONE",
    normalized: { source, title, problem, budget, urgency, contactChannel, consentConfirmed: true },
    score,
    scoringExplanation,
    recommendedNextStep: score >= 70 ? "Prepare manual offer draft for operator approval." : "Collect missing qualification details before drafting an offer.",
  };
}

export function getRadarManualIntakeStatus() {
  return {
    status: "MANUAL_INTAKE_PREVIEW_READY" as const,
    supportedModes: ["manual_intake", "github_opportunity_preview"] as const,
    persistence: "DISABLED_IN_P0" as const,
    scraping: "DISABLED" as const,
    marketplaceAutomation: "DISABLED" as const,
    githubOpportunityEngine: "PREVIEW_READY" as const,
    acceptedSources: Array.from(allowedSources),
  };
}
