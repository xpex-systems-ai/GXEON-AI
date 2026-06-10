export type RadarSource = "Manual" | "Referral" | "Workana" | "99Freelas" | "LinkedIn" | "Email" | "Form";

export type RadarStatus = {
  status: "MANUAL_INTAKE_PREVIEW_READY";
  supportedModes?: readonly ["manual_intake", "github_opportunity_preview"];
  persistence: "DISABLED_IN_P0";
  scraping: "DISABLED";
  marketplaceAutomation: "DISABLED";
  githubOpportunityEngine?: "PREVIEW_READY";
  acceptedSources: RadarSource[];
};

export type RadarManualIntakePayload = {
  source: RadarSource;
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
    source: RadarSource;
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

export type GitHubOpportunityRiskFlag = "no_budget_signal" | "possible_unpaid_open_source" | "unclear_requirements" | "high_complexity" | "stale_issue" | "sensitive_domain" | "external_contact_required";
export type GitHubOpportunityRecommendedNextStep = "manual_review" | "draft_offer" | "research_repository" | "skip_low_value" | "watch_for_updates";
export type GitHubOpportunityCategory = "integration_help" | "deployment_fix" | "automation_task" | "documentation_improvement" | "bug_fix" | "ai_agent_task" | "github_actions_ci" | "supabase_rls" | "vercel_frontend" | "railway_runtime";

export type GitHubRadarStatus = {
  status: "GITHUB_OPPORTUNITY_PREVIEW_READY";
  persistence: "PREVIEW_ONLY";
  automation: "NONE";
  externalContact: false;
  githubWrites: false;
  maxCandidates: 10;
  safeSources: string[];
  authenticated: boolean;
};

export type GitHubOpportunityCandidate = {
  id: string;
  source: "github_public_issue" | "github_public_repository";
  category: GitHubOpportunityCategory;
  title: string;
  url: string;
  apiUrl: string;
  state: "open" | "closed" | "unknown";
  labels: string[];
  createdAt: string | null;
  updatedAt: string | null;
  bodyExcerpt: string | null;
  repository: {
    fullName: string;
    url: string;
    description: string | null;
    stargazersCount: number;
    openIssuesCount: number;
    pushedAt: string | null;
    updatedAt: string | null;
    language: string | null;
  };
  runtime: {
    persistence: "PREVIEW_ONLY";
    automation: "NONE";
    externalContact: "NONE";
    githubWrites: false;
  };
};

export type GitHubOpportunityScore = {
  score: number;
  riskFlags: GitHubOpportunityRiskFlag[];
  scoringExplanation: string[];
  recommendedNextStep: GitHubOpportunityRecommendedNextStep;
  weights: Record<string, number>;
};

export type ScoredGitHubOpportunityCandidate = GitHubOpportunityCandidate & {
  opportunityScore: GitHubOpportunityScore;
};

export type GitHubOpportunityPreview = {
  status: "GITHUB_OPPORTUNITY_PREVIEW_READY";
  persistence: "PREVIEW_ONLY";
  automation: "NONE";
  externalContact: "NONE";
  githubWrites: false;
  query: string;
  normalizedQuery: string;
  category: GitHubOpportunityCategory | null;
  maxCandidates: 10;
  effectiveLimit: number;
  authenticated: boolean;
  diagnostics: {
    provider: "github_rest_api";
    searchEndpoint: "/search/issues";
    repositoryMetadataMode: "best_effort_public_rest_api";
    skippedPullRequests: number;
    skippedInvalidCandidates: number;
    repositoryMetadataFailures: number;
  };
  category: GitHubOpportunityCategory | null;
  maxCandidates: 10;
  candidates: ScoredGitHubOpportunityCandidate[];
};

const configuredApiBaseUrl = (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, "") ?? "";
const railwayBackendUrlMessage = "Set VITE_GXEON_API_BASE_URL to Railway API public URL and redeploy Vercel";

function isVercelPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".vercel.app");
}

function apiUrl(path: string): string {
  if (!configuredApiBaseUrl && isVercelPreviewHost()) {
    throw new Error(`BACKEND_URL_MISCONFIGURED: ${railwayBackendUrlMessage}`);
  }
  return `${configuredApiBaseUrl}${path}`;
}

async function readJson<T>(response: Response, route: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text();

  if (!bodyText.trim()) {
    throw new Error(`REQUEST_FAILED_${response.status}: Empty response body from ${route}`);
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    const bodyExcerpt = bodyText.trim().slice(0, 160);
    throw new Error(`BACKEND_NON_JSON_RESPONSE: ${route} returned ${response.status}${bodyExcerpt ? ` - ${bodyExcerpt}` : ""}`);
  }

  let payload: { success?: boolean; data?: T; error?: string; message?: string };
  try {
    payload = JSON.parse(bodyText) as { success?: boolean; data?: T; error?: string; message?: string };
  } catch {
    throw new Error(`BACKEND_INVALID_JSON_RESPONSE: ${route} returned ${response.status}`);
  }

  if (!response.ok || !payload.success) {
    throw new Error(`${payload.message ?? payload.error ?? `REQUEST_FAILED_${response.status}`}: ${route}`);
  }

  return payload.data as T;
}

export async function fetchRadarStatus(signal?: AbortSignal) {
  return readJson<RadarStatus>(await fetch(apiUrl("/api/radar/status"), { headers: { Accept: "application/json" }, signal }), "/api/radar/status");
}

export async function previewManualOpportunity(payload: RadarManualIntakePayload) {
  return readJson<RadarOpportunityPreview>(
    await fetch(apiUrl("/api/radar/manual-intake/preview"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    "/api/radar/manual-intake/preview",
  );
}

export async function fetchGitHubRadarStatus(signal?: AbortSignal) {
  return readJson<GitHubRadarStatus>(await fetch(apiUrl("/api/radar/github/status"), { headers: { Accept: "application/json" }, signal }), "/api/radar/github/status");
}

export async function searchGitHubOpportunityPreview(payload: { query: string; category?: string; limit?: number }) {
  return readJson<GitHubOpportunityPreview>(
    await fetch(apiUrl("/api/radar/github/search-preview"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    "/api/radar/github/search-preview",
  );
}

export async function scoreGitHubOpportunityPreview(candidate: GitHubOpportunityCandidate) {
  return readJson<GitHubOpportunityScore>(
    await fetch(apiUrl("/api/radar/github/score-preview"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ candidate }),
    }),
    "/api/radar/github/score-preview",
  );
}
