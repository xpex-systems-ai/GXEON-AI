import type { GitHubDemandCandidate, GitHubDemandPipelinePreview } from "./githubDemandTypes";
import { conversionSafetyFlags, type ConversionOfferTier, type ConversionRoute, type GitHubDemandConversionPack, type OfferTier } from "./githubDemandConversionTypes";

const tierValues: Record<OfferTier, { brl: string; usd: string; value: number; useCase: string }> = {
  EXPRESS_50: { brl: "R$50-R$100", usd: "US$10-US$20", value: 50, useCase: "docs, template, profile or small diagnosis" },
  STANDARD_100: { brl: "R$100-R$250", usd: "US$20-US$50", value: 100, useCase: "repo audit, debug scope or manual proposal" },
  PRO_250: { brl: "R$150-R$450", usd: "US$30-US$90", value: 250, useCase: "deploy/CI rescue with evidence" },
  CUSTOM_450: { brl: "R$250-R$900", usd: "US$50-US$180", value: 450, useCase: "agent/MCP integration, connector or larger scoped rescue" },
};

function route(candidate: GitHubDemandCandidate): ConversionRoute {
  const text = `${candidate.title} ${candidate.bodyExcerpt ?? ""} ${candidate.category} ${candidate.monetizationRoute}`.toLowerCase();
  if (candidate.score.riskScore >= 75 || candidate.recommendedAction === "SKIP") return "WATCHLIST";
  if (candidate.monetizationRoute === "BOUNTY_ATTEMPT" && candidate.score.bountyConfidenceScore >= 55) return "BOUNTY_ATTEMPT";
  if (text.includes("mcp") || text.includes("agent")) return "MCP_AGENT_INTEGRATION";
  if (text.includes("deploy") || text.includes("vercel") || text.includes("ci") || text.includes("railway")) return "DEPLOY_RESCUE";
  if (text.includes("api") || text.includes("connector") || text.includes("webhook")) return "DATA_API_CONNECTOR";
  if (text.includes("doc") || text.includes("readme") || text.includes("template")) return "DOCS_TEMPLATE";
  if (candidate.score.serviceLeadScore >= 45) return "REPO_AUDIT";
  return candidate.score.demandScore >= 35 ? "SERVICE_OFFER" : "WATCHLIST";
}
function primaryTier(r: ConversionRoute): OfferTier { return r === "DOCS_TEMPLATE" ? "EXPRESS_50" : r === "DEPLOY_RESCUE" ? "PRO_250" : r === "MCP_AGENT_INTEGRATION" || r === "DATA_API_CONNECTOR" ? "CUSTOM_450" : "STANDARD_100"; }
const tiers = (primary: OfferTier): ConversionOfferTier[] => (Object.keys(tierValues) as OfferTier[]).map((tier) => ({ tier, label: tier.replace("_", " "), brl: tierValues[tier].brl, usd: tierValues[tier].usd, useCase: tierValues[tier].useCase, suggested: tier === primary, notGuaranteed: true }));
const id = (candidateId: string) => `ghd_conversion_${candidateId}_${Date.now().toString(36)}`;

export function generateGitHubDemandConversionPack(input: GitHubDemandPipelinePreview | GitHubDemandCandidate): GitHubDemandConversionPack {
  const pipelinePreview = "candidate" in input ? input : undefined;
  const candidate = pipelinePreview?.candidate ?? input as GitHubDemandCandidate;
  const recommendedRoute = route(candidate);
  const tier = primaryTier(recommendedRoute);
  const blocked = recommendedRoute === "WATCHLIST" || candidate.score.riskScore >= 75;
  const title = blocked ? `Watchlist/research only: ${candidate.repository.fullName}` : `GXEON ${recommendedRoute.replaceAll("_", " ")} for ${candidate.repository.fullName}`;
  const price = tierValues[tier];
  const base = `Repository: ${candidate.repository.fullName}. Issue: ${candidate.title}.`;
  const caution = "COPY_ONLY. DO_NOT_AUTO_SEND. Manual review required; no GitHub write, no external contact automation, no payment creation, no guaranteed reward.";
  return {
    ...conversionSafetyFlags, id: id(candidate.id), pipelinePreviewId: pipelinePreview?.id, candidateId: candidate.id, status: blocked ? "BLOCKED_RESEARCH_REQUIRED" : "READY_FOR_MANUAL_REVIEW", recommendedRoute, language: "BOTH", source: "GITHUB_DEMAND_CONVERSION_PACK", candidate, pipelinePreview, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    shortDiagnosis: `${base} Demand ${candidate.score.demandScore}/100, bounty confidence ${candidate.score.bountyConfidenceScore}/100, risk ${candidate.score.riskScore}/100. ${blocked ? "Conversion blocked until manual research lowers risk." : "Manual commercial route can be reviewed by the operator."}`,
    offerTitle: title,
    suggestedPrice: { primaryTier: tier, brlRange: recommendedRoute === "BOUNTY_ATTEMPT" ? "Use verified bounty amount only; otherwise R$100-R$250 service fallback" : price.brl, usdRange: recommendedRoute === "BOUNTY_ATTEMPT" ? "Use verified bounty amount only; otherwise US$20-US$50 service fallback" : price.usd, rationale: `${price.useCase}. Values are suggestions only and must be confirmed outside GXEON.`, rewardNotGuaranteed: true },
    offerTiers: tiers(tier),
    scopeBoundary: { included: ["Manual issue/repo review", "Acceptance criteria checklist", "Small scoped fix/audit/integration plan", "Delivery evidence checklist"], excluded: ["Automatic GitHub comments or PRs", "External contact automation", "Payment links or payment capture", "Guaranteed bounty/revenue claims", "Runtime repository cloning/execution"], assumptions: ["Operator verifies maintainer rules and communication channel manually", "Any bounty amount is manually confirmed before work", "Work starts only after explicit operator approval"] },
    manualMessageDrafts: { ptBr: { language: "PT_BR", label: "COPY_ONLY_DO_NOT_AUTO_SEND", subject: title, text: `${caution}\n\nOlá! Revisei manualmente este issue e posso preparar uma entrega enxuta com escopo fechado: diagnóstico, plano técnico, checklist de evidências e entrega revisável. Sugestão inicial: ${recommendedRoute === "BOUNTY_ATTEMPT" ? "confirmar manualmente as regras/valor do bounty antes de qualquer claim" : price.brl + " conforme escopo aprovado"}. Não assumo pagamento/recompensa sem confirmação explícita. Próximo passo: validar critérios de aceite e canal permitido.` }, enUs: { language: "EN_US", label: "COPY_ONLY_DO_NOT_AUTO_SEND", subject: title, text: `${caution}\n\nHi! I manually reviewed this issue and can prepare a tight scoped delivery: diagnosis, technical plan, evidence checklist, and reviewable handoff. Initial suggestion: ${recommendedRoute === "BOUNTY_ATTEMPT" ? "manually confirm bounty rules/amount before any claim" : price.usd + " after scope approval"}. I do not assume payment/reward unless explicit terms are confirmed. Next step: validate acceptance criteria and the allowed channel.` } },
    technicalExecutionPlan: ["Manually read issue, repository contribution rules and license.", "Confirm explicit bounty/budget or classify as service lead/watchlist.", "Define minimal reproducible scope and acceptance criteria.", "Prepare patch/audit/docs plan outside GXEON automation.", "Submit only via an operator-approved manual channel."],
    evidenceChecklist: ["Issue URL and repository URL", "Manual bounty/budget verification screenshot or note", "Maintainer intent and allowed channel", "Before/after evidence plan", "Risk flags reviewed", "No secrets/private data required"],
    deliveryChecklist: ["Scope approved manually", "COPY_ONLY message reviewed", "No auto-send/comment/PR/payment", "Tests/evidence documented", "Ledger remains preview-only until external payment confirmation"],
    riskWarnings: [...candidate.riskFlags, caution],
    ledgerPreview: { status: "PREVIEW_ONLY", expectedValueBrl: tierValues[tier].value, expectedValueUsd: Math.round(tierValues[tier].value / 5), source: "GITHUB_DEMAND_CONVERSION_PACK", amountNotGuaranteed: true, markRevenueReceivedDisabled: true },
    brainRevenueSprintRecommendation: { route: recommendedRoute === "WATCHLIST" ? "RESEARCH_WATCHLIST" : "MANUAL_R100_SERVICE_ROUTE", reason: recommendedRoute === "BOUNTY_ATTEMPT" ? "Treat bounty as unverified until terms are manually confirmed; keep R$100 service fallback ready." : "Fastest safe route is a manually reviewed scoped service offer with R$100+ floor when appropriate.", targetBrl: Math.max(100, tierValues[tier].value), previewRoute: "/api/github-demand/conversion-packs/:id/brain-revenue-sprint-preview", manualReviewRequired: true },
    nextBestAction: blocked ? "Do not pitch yet. Research rules, maintainer intent and risk flags manually; keep watchlist." : "Review copy, verify channel/terms manually, then create Opportunity/Task/Brain previews if operator confirms.",
    opportunityPreviewRoute: "/api/github-demand/conversion-packs/:id/create-opportunity-preview", taskPreviewRoute: "/api/github-demand/conversion-packs/:id/create-task-preview",
  };
}
