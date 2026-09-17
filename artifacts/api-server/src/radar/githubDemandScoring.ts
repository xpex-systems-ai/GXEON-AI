import type {
  GitHubDemandCandidate,
  GitHubDemandCategory,
  GitHubDemandMonetizationRoute,
  GitHubDemandRecommendedAction,
  GitHubDemandRiskFlag,
  GitHubDemandScore,
} from "./githubDemandTypes";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const has = (t: string, words: string[]) => words.some((w) => t.includes(w));
const count = (t: string, words: string[]) => words.filter((w) => t.includes(w)).length;

const budget = ["bounty", "reward", "paid", "budget", "sponsor", "contract", "compensation", "usd", "$", "brl", "r$", "grant"];
const agent = ["mcp", "model context protocol", "agent", "tool calling", "llm", "openai", "claude"];
const deploy = ["vercel", "railway", "deploy", "deployment", "github actions", " ci ", "pipeline", "docker"];
const data = ["api", "webhook", "connector", "supabase", "rls", "postgres", "database"];
const docs = ["documentation", "readme", "example", "template", "docs"];
const easy = ["good first issue", "help wanted", "small", "simple", "docs", "readme", "example", "typo", "quick"];
const hard = ["architecture", "rewrite", "refactor all", "security incident", "production down", "large", "complex"];
const sensitive = ["wallet", "private key", "seed phrase", "medical", "hipaa", "bank", "payment capture", "credential"];

export function inferGitHubDemandCategory(input: {
  title?: string;
  bodyExcerpt?: string | null;
  labels?: string[];
  requestedCategory?: string;
  categoryHint?: GitHubDemandCategory;
}): GitHubDemandCategory {
  const requested = input.requestedCategory || input.categoryHint;
  const allowed = [
    "EXPLICIT_BOUNTY",
    "PAID_WORK_HINT",
    "AGENT_INTEGRATION_NEED",
    "MCP_CONNECTOR_NEED",
    "DATA_API_NEED",
    "DEPLOY_CI_RESCUE",
    "SUPABASE_RLS_OR_DATABASE",
    "DOCS_TEMPLATE_REQUEST",
    "BUG_FIX_LOW_COMPLEXITY",
    "OPEN_SOURCE_UNPAID",
    "WATCHLIST_ONLY",
  ];
  if (requested && allowed.includes(requested)) return requested as GitHubDemandCategory;
  const t = `${input.title ?? ""} ${input.bodyExcerpt ?? ""} ${(input.labels ?? []).join(" ")}`.toLowerCase();
  if (has(t, ["bounty", "reward"])) return "EXPLICIT_BOUNTY";
  if (has(t, ["paid", "budget", "contract"])) return "PAID_WORK_HINT";
  if (has(t, ["mcp", "model context protocol"])) return "MCP_CONNECTOR_NEED";
  if (has(t, agent)) return "AGENT_INTEGRATION_NEED";
  if (has(t, deploy)) return "DEPLOY_CI_RESCUE";
  if (has(t, ["supabase", "rls", "postgres"])) return "SUPABASE_RLS_OR_DATABASE";
  if (has(t, data)) return "DATA_API_NEED";
  if (has(t, docs)) return "DOCS_TEMPLATE_REQUEST";
  if (has(t, ["bug", "fix", "good first issue"])) return "BUG_FIX_LOW_COMPLEXITY";
  return "WATCHLIST_ONLY";
}

export function routeForCategory(c: GitHubDemandCategory, text: string): GitHubDemandMonetizationRoute {
  if (c === "EXPLICIT_BOUNTY" || has(text, ["bounty", "reward"])) return "BOUNTY_ATTEMPT";
  if (c === "DEPLOY_CI_RESCUE") return "DEPLOY_RESCUE_OFFER";
  if (c === "AGENT_INTEGRATION_NEED" || c === "MCP_CONNECTOR_NEED") return "AGENT_MCP_INTEGRATION_OFFER";
  if (c === "DATA_API_NEED" || c === "SUPABASE_RLS_OR_DATABASE") return "DATA_API_CONNECTOR_OFFER";
  if (c === "DOCS_TEMPLATE_REQUEST") return "DOCS_TEMPLATE_OFFER";
  if (c === "PAID_WORK_HINT") return "MANUAL_SERVICE_OFFER";
  return "SKIP_OR_WATCH";
}

export function scoreGitHubDemandCandidate(
  candidate: Omit<Partial<GitHubDemandCandidate>, "score"> & {
    title: string;
    bodyExcerpt?: string | null;
    labels?: string[];
    repository?: {
      description?: string | null;
      stargazersCount?: number;
      updatedAt?: string | null;
      pushedAt?: string | null;
    };
  },
): {
  score: GitHubDemandScore;
  riskFlags: GitHubDemandRiskFlag[];
  recommendedAction: GitHubDemandRecommendedAction;
  evidence: string[];
  category: GitHubDemandCategory;
  monetizationRoute: GitHubDemandMonetizationRoute;
} {
  const labels = (candidate.labels ?? []).map((label) => label.toLowerCase());
  const text = `${candidate.title} ${candidate.bodyExcerpt ?? ""} ${labels.join(" ")} ${candidate.repository?.description ?? ""}`.toLowerCase();
  const category = inferGitHubDemandCategory({
    title: candidate.title,
    bodyExcerpt: candidate.bodyExcerpt,
    labels: candidate.labels,
    requestedCategory: candidate.category,
  });
  const route = routeForCategory(category, text);
  const budgetHits = count(text, budget);
  const serviceHits = count(text, [...agent, ...deploy, ...data, ...docs]);
  const easyHits = count(text, easy);
  const hardHits = count(text, hard);
  const stale = candidate.updatedAt ? (Date.now() - new Date(candidate.updatedAt).getTime()) / 86400000 > 180 : false;

  const skipPayment = labels.some((label) => label === "skip payment" || label === "skip-payment") || has(text, ["skip payment"]);
  const onHold = labels.some((label) => label === "hold" || label.startsWith("hold ") || label.includes("on hold")) || has(text, ["[hold", "on hold"]);
  const alreadyInReview = labels.some((label) => label === "reviewing" || label.includes("pr in review"));
  const paymentPending = has(candidate.title.toLowerCase(), ["due for payment", "payment due"]);
  const notPriority = labels.some((label) => label === "not a priority" || label === "not priority");
  const overdue = labels.some((label) => label === "overdue");
  const needsReproduction = labels.some((label) => label.includes("needs reproduction")) || has(text, ["reproducible in staging?: needs reproduction", "reproducible in production?: needs reproduction"]);
  const multipleAssigneesReview = (candidate.assigneeCount ?? candidate.assignees?.length ?? 0) > 1;

  const blockedReasons: string[] = [];
  if (skipPayment) blockedReasons.push("skip-payment");
  if (onHold) blockedReasons.push("hold");
  if (alreadyInReview) blockedReasons.push("reviewing");
  if (paymentPending) blockedReasons.push("payment-pending");
  if (notPriority) blockedReasons.push("not-a-priority");
  if (overdue) blockedReasons.push("overdue");
  if (needsReproduction) blockedReasons.push("needs-reproduction");
  if (multipleAssigneesReview) blockedReasons.push("multiple-assignees-review-required");
  const eligibilityBlocked = blockedReasons.length > 0;

  const riskFlags: GitHubDemandRiskFlag[] = [];
  if (!budgetHits) riskFlags.push("NO_BUDGET_SIGNAL", "POSSIBLE_UNPAID_OPEN_SOURCE");
  if (!has(text, ["maintainer", "owner", "accepted", "proposal", "help wanted", "good first issue"])) riskFlags.push("MAINTAINER_INTENT_UNCLEAR");
  if (stale) riskFlags.push("STALE_ISSUE");
  if (hardHits) riskFlags.push("HIGH_COMPLEXITY");
  if (has(text, sensitive)) riskFlags.push("SENSITIVE_DOMAIN");
  if (has(text, ["urgent", "asap", "production down"])) riskFlags.push("EXTERNAL_CONTACT_REQUIRED");
  if (has(text, ["ai generated", "spam", "mass pr"])) riskFlags.push("AI_SLOP_RISK", "LIKELY_SPAM_RISK");
  if (skipPayment) riskFlags.push("SKIP_PAYMENT");
  if (onHold) riskFlags.push("ON_HOLD");
  if (alreadyInReview) riskFlags.push("ALREADY_IN_REVIEW");
  if (paymentPending) riskFlags.push("PAYMENT_PENDING");
  if (notPriority) riskFlags.push("NOT_A_PRIORITY");
  if (overdue) riskFlags.push("OVERDUE");
  if (needsReproduction) riskFlags.push("NEEDS_REPRODUCTION");
  if (multipleAssigneesReview) riskFlags.push("MULTIPLE_ASSIGNEES_REVIEW_REQUIRED");

  const bountyConfidenceScore = clamp(budgetHits * 28 + (category === "EXPLICIT_BOUNTY" ? 25 : 0));
  const serviceLeadScore = clamp(serviceHits * 10 + (route !== "SKIP_OR_WATCH" ? 20 : 0));
  const urgencyScore = clamp((has(text, ["urgent", "asap", "broken", "failing", "production"]) ? 65 : 30) + (stale ? -20 : 0));
  const executionEaseScore = clamp(45 + easyHits * 12 - hardHits * 18);
  const gxeonFitScore = clamp(35 + serviceHits * 8 + (has(text, ["mcp", "supabase", "github actions", "vercel", "railway", "api", "webhook"]) ? 20 : 0));
  const riskScore = eligibilityBlocked ? 100 : clamp(10 + riskFlags.length * 12 + hardHits * 15 + (has(text, sensitive) ? 25 : 0));
  const demandScore = eligibilityBlocked
    ? 0
    : clamp(
        bountyConfidenceScore * 0.22 +
          serviceLeadScore * 0.24 +
          urgencyScore * 0.14 +
          executionEaseScore * 0.16 +
          gxeonFitScore * 0.18 +
          (100 - riskScore) * 0.06,
      );

  const recommendedAction: GitHubDemandRecommendedAction = eligibilityBlocked
    ? "SKIP"
    : riskScore >= 75
      ? "SKIP"
      : demandScore >= 70 && budgetHits > 0
        ? "CREATE_OPPORTUNITY_PREVIEW"
        : demandScore >= 55
          ? "DRAFT_MANUAL_PROPOSAL"
          : demandScore >= 35
            ? "RESEARCH_REPO"
            : "WATCHLIST";

  const evidence = [
    budgetHits ? "Budget/bounty/payment-like word detected; verify terms manually." : "No explicit budget/bounty signal; payment must not be inferred.",
    `${serviceHits} GXEON service-fit signal(s) detected.`,
    `${riskFlags.length} risk flag(s) require manual review.`,
  ];
  if (candidate.assigneeCount !== undefined) evidence.push(`${candidate.assigneeCount} current assignee(s) reported by GitHub search metadata.`);
  if (candidate.issueOwner) evidence.push(`Issue owner marker detected: @${candidate.issueOwner}.`);
  if (eligibilityBlocked) evidence.push(`Eligibility gate blocked new-work execution: ${blockedReasons.join(", ")}.`);

  return {
    score: {
      demandScore,
      bountyConfidenceScore,
      serviceLeadScore,
      urgencyScore,
      executionEaseScore,
      gxeonFitScore,
      riskScore,
      scoringExplanation: evidence,
    },
    riskFlags,
    recommendedAction,
    evidence,
    category,
    monetizationRoute: route,
  };
}
