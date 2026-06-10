export const GITHUB_OPPORTUNITY_MAX_CANDIDATES = 10;

export const githubOpportunityRiskFlags = [
  "no_budget_signal",
  "possible_unpaid_open_source",
  "unclear_requirements",
  "high_complexity",
  "stale_issue",
  "sensitive_domain",
  "external_contact_required",
] as const;

export type GitHubOpportunityRiskFlag = (typeof githubOpportunityRiskFlags)[number];

export const githubOpportunityRecommendedNextSteps = [
  "manual_review",
  "draft_offer",
  "research_repository",
  "skip_low_value",
  "watch_for_updates",
] as const;

export type GitHubOpportunityRecommendedNextStep = (typeof githubOpportunityRecommendedNextSteps)[number];

export const githubOpportunityCategories = [
  "integration_help",
  "deployment_fix",
  "automation_task",
  "documentation_improvement",
  "bug_fix",
  "ai_agent_task",
  "github_actions_ci",
  "supabase_rls",
  "vercel_frontend",
  "railway_runtime",
] as const;

export type GitHubOpportunityCategory = (typeof githubOpportunityCategories)[number];

export type GitHubOpportunityRuntimeBoundaries = {
  persistence: "PREVIEW_ONLY";
  automation: "NONE";
  externalContact: "NONE";
  githubWrites: false;
};

export const githubOpportunityRuntimeBoundaries: GitHubOpportunityRuntimeBoundaries = {
  persistence: "PREVIEW_ONLY",
  automation: "NONE",
  externalContact: "NONE",
  githubWrites: false,
};

export type GitHubOpportunitySearchQuery = {
  query: string;
  category?: GitHubOpportunityCategory | string;
  limit?: number;
};

export type GitHubOpportunityRepositoryMetadata = {
  fullName: string;
  url: string;
  description: string | null;
  stargazersCount: number;
  openIssuesCount: number;
  pushedAt: string | null;
  updatedAt: string | null;
  language: string | null;
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
  repository: GitHubOpportunityRepositoryMetadata;
  runtime: GitHubOpportunityRuntimeBoundaries;
};

export type GitHubOpportunityScore = {
  score: number;
  riskFlags: GitHubOpportunityRiskFlag[];
  scoringExplanation: string[];
  recommendedNextStep: GitHubOpportunityRecommendedNextStep;
  weights: {
    relevanceToGxeonStack: number;
    clearProblemStatement: number;
    recency: number;
    repoActivity: number;
    lowExecutionComplexity: number;
    maintainerSignal: number;
    monetizationSignal: number;
  };
};

export type ScoredGitHubOpportunityCandidate = GitHubOpportunityCandidate & {
  opportunityScore: GitHubOpportunityScore;
};

export type GitHubOpportunityPreview = GitHubOpportunityRuntimeBoundaries & {
  status: "GITHUB_OPPORTUNITY_PREVIEW_READY";
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
