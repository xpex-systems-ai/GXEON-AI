import {
  type GitHubOpportunityCandidate,
  type GitHubOpportunityCategory,
  type GitHubOpportunityRecommendedNextStep,
  type GitHubOpportunityRiskFlag,
  type GitHubOpportunityScore,
  githubOpportunityCategories,
} from "./githubOpportunityTypes";

const stackKeywords = ["github", "vercel", "railway", "supabase", "microsoft", "api", "automation", "deployment", "deploy", "ci", "docs", "documentation", "agent", "actions", "rls"];
const lowComplexitySignals = ["docs", "documentation", "typo", "readme", "good first issue", "beginner", "small", "simple", "minor", "starter"];
const highComplexitySignals = ["architecture", "rewrite", "migration", "security", "auth", "database", "breaking", "large", "complex", "enterprise"];
const maintainerSignals = ["help wanted", "good first issue", "up for grabs", "contributions welcome", "looking for contributors", "needs help"];
const monetizationSignals = ["bounty", "paid", "sponsor", "reward", "budget", "contract", "invoice"];
const sensitiveSignals = ["medical", "health", "bank", "banking", "legal", "government", "crypto wallet", "private key", "password", "credential"];

function textFor(candidate: GitHubOpportunityCandidate): string {
  return [candidate.title, candidate.bodyExcerpt, candidate.repository.description, candidate.repository.fullName, candidate.labels.join(" ")].filter(Boolean).join(" ").toLowerCase();
}

function countMatches(text: string, terms: string[]): number {
  return terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
}

function daysSince(value: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return Math.max(0, (Date.now() - time) / 86_400_000);
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function inferGitHubOpportunityCategory(input: { title?: string | null; body?: string | null; labels?: string[]; repository?: string | null; requestedCategory?: string | null }): GitHubOpportunityCategory {
  const requested = input.requestedCategory?.trim();
  if (requested && (githubOpportunityCategories as readonly string[]).includes(requested)) return requested as GitHubOpportunityCategory;

  const text = [input.title, input.body, input.repository, input.labels?.join(" ")].filter(Boolean).join(" ").toLowerCase();
  if (text.includes("supabase") && text.includes("rls")) return "supabase_rls";
  if (text.includes("vercel")) return "vercel_frontend";
  if (text.includes("railway")) return "railway_runtime";
  if (text.includes("github actions") || text.includes(" ci") || text.includes("workflow")) return "github_actions_ci";
  if (text.includes("agent") || text.includes("ai")) return "ai_agent_task";
  if (text.includes("deploy") || text.includes("deployment")) return "deployment_fix";
  if (text.includes("doc") || text.includes("readme")) return "documentation_improvement";
  if (text.includes("bug") || text.includes("fix")) return "bug_fix";
  if (text.includes("automation") || text.includes("script")) return "automation_task";
  return "integration_help";
}

export function scoreGitHubOpportunity(candidate: GitHubOpportunityCandidate): GitHubOpportunityScore {
  const text = textFor(candidate);
  const explanations: string[] = ["Preview-only GitHub public signal; no persistence, external contact, or GitHub write was performed."];
  const riskFlags = new Set<GitHubOpportunityRiskFlag>();

  const relevanceMatches = countMatches(text, stackKeywords);
  const relevanceToGxeonStack = clamp(Math.min(1, relevanceMatches / 4) * 25, 25);
  explanations.push(relevanceMatches > 0 ? `Matched ${relevanceMatches} GXEON stack signal(s).` : "No direct GXEON stack keyword match detected.");

  const clearProblemStatement = clamp(((candidate.title.length >= 12 ? 8 : 3) + ((candidate.bodyExcerpt?.length ?? 0) >= 80 ? 12 : (candidate.bodyExcerpt?.length ?? 0) >= 30 ? 8 : 2)), 20);
  if (clearProblemStatement < 12) riskFlags.add("unclear_requirements");
  explanations.push(clearProblemStatement >= 14 ? "Issue title/body provide enough context for operator review." : "Problem statement may need more manual research.");

  const updatedDays = daysSince(candidate.updatedAt ?? candidate.createdAt);
  let recency = 3;
  if (updatedDays !== null) {
    if (updatedDays <= 14) recency = 15;
    else if (updatedDays <= 45) recency = 11;
    else if (updatedDays <= 120) recency = 7;
    else recency = 3;
  }
  if (updatedDays !== null && updatedDays > 180) riskFlags.add("stale_issue");
  explanations.push(updatedDays === null ? "Recency unavailable from safe metadata." : `Updated approximately ${Math.round(updatedDays)} day(s) ago.`);

  const pushedDays = daysSince(candidate.repository.pushedAt ?? candidate.repository.updatedAt);
  const starsScore = Math.min(6, Math.log10(candidate.repository.stargazersCount + 1) * 3);
  const issuesScore = candidate.repository.openIssuesCount > 0 && candidate.repository.openIssuesCount < 500 ? 4 : candidate.repository.openIssuesCount >= 500 ? 2 : 1;
  const pushScore = pushedDays === null ? 1 : pushedDays <= 30 ? 5 : pushedDays <= 120 ? 3 : 1;
  const repoActivity = clamp(starsScore + issuesScore + pushScore, 15);
  explanations.push(`Repository activity preview uses ${candidate.repository.stargazersCount} star(s), ${candidate.repository.openIssuesCount} open issue(s), and last push metadata.`);

  const lowMatches = countMatches(text, lowComplexitySignals);
  const highMatches = countMatches(text, highComplexitySignals);
  const lowExecutionComplexity = clamp(6 + lowMatches * 2 - highMatches * 2, 10);
  if (highMatches >= 2 || lowExecutionComplexity <= 3) riskFlags.add("high_complexity");
  explanations.push(lowExecutionComplexity >= 7 ? "Signals suggest a bounded task for manual review." : "Complexity may be high; operator research is required.");

  const maintainerMatches = countMatches(text, maintainerSignals);
  const maintainerSignal = clamp(maintainerMatches * 5 + (candidate.state === "open" ? 3 : 0), 10);
  explanations.push(maintainerMatches > 0 ? "Maintainer/help-wanted signal detected in labels or text." : "Maintainer intent is not explicit beyond public issue state.");

  const monetizationMatches = countMatches(text, monetizationSignals);
  const monetizationSignal = clamp(monetizationMatches > 0 ? 5 : 0, 5);
  if (monetizationMatches === 0) {
    riskFlags.add("no_budget_signal");
    riskFlags.add("possible_unpaid_open_source");
  }
  explanations.push(monetizationMatches > 0 ? "Explicit bounty/payment-like metadata detected; manual verification still required." : "No explicit budget or bounty signal detected; do not infer payment.");

  if (countMatches(text, sensitiveSignals) > 0) riskFlags.add("sensitive_domain");
  if (!candidate.url) riskFlags.add("external_contact_required");

  const score = clamp(relevanceToGxeonStack + clearProblemStatement + recency + repoActivity + lowExecutionComplexity + maintainerSignal + monetizationSignal, 100);
  let recommendedNextStep: GitHubOpportunityRecommendedNextStep = "manual_review";
  if (score >= 75 && monetizationSignal > 0) recommendedNextStep = "draft_offer";
  else if (score >= 55) recommendedNextStep = "research_repository";
  else if (riskFlags.has("stale_issue")) recommendedNextStep = "watch_for_updates";
  else if (score < 40) recommendedNextStep = "skip_low_value";

  return {
    score,
    riskFlags: Array.from(riskFlags),
    scoringExplanation: explanations,
    recommendedNextStep,
    weights: {
      relevanceToGxeonStack,
      clearProblemStatement,
      recency,
      repoActivity,
      lowExecutionComplexity,
      maintainerSignal,
      monetizationSignal,
    },
  };
}
