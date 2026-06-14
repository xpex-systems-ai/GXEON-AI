import { apiUrl } from "./apiBase";

export type Web3TaskRadarMode = "PREVIEW_ONLY";
export type Web3TaskCategory = "bounty" | "quest" | "content" | "dev" | "audit" | "community" | "airdrop" | "grant" | "hackathon";
export type Web3TaskSource = { id: string; label: string; baseUrl: string; supportedCategories: Web3TaskCategory[]; payoutNotes: string; riskNotes: string[]; manualOnly: true };
export type Web3TaskPreview = {
  id: string; mode: Web3TaskRadarMode; source: Web3TaskSource; title: string; url: string; category: Web3TaskCategory; rewardLabel: string;
  estimatedRewardUsd: number | null; estimatedRewardBrl: number | null; deadlineLabel: string; difficulty: string; payoutClarity: string;
  riskScore: number; opportunityScore: number; recommendedAction: string; recommendedNextManualAction: string; evidenceRequired: true; evidenceChecklist: string[]; blockedActions: string[]; riskFlags: string[];
  manualExecutionRequired: true; walletConnectionRequired: false; externalSubmissionDisabled: true; rewardNotGuaranteed: true; operatorApprovalRequired: true; notes: string; createdAt: string; updatedAt: string;
};
export type Web3TaskRadarStatus = { mode: Web3TaskRadarMode; status: string; manualFirst: true; walletConnectionRequired: false; externalSubmissionDisabled: true; rewardNotGuaranteed: true; operatorApprovalRequired: true; persistence: string; sourceCount: number; previewCount: number; pipelineLinkCount?: number; boundaries: string[] };
export type Web3TaskPipelineLink = { id: string; status: string; web3TaskPreviewId: string; opportunityPreviewId: string | null; taskPreviewId: string | null; estimatedRewardUsd: number | null; estimatedRewardBrl: number | null; opportunityScore: number; riskScore: number; urgencyScore: number; payoutClarityScore: number; aiAssistScore: number; urgencyLabel: string; suggestedExecutionLane: string; qualificationReasons: string[]; blockingReasons: string[]; criticalRiskFlags: string[]; opportunityPreview: any | null; taskPreview: any | null; brokerPreparation?: any; blockedActions?: string[]; manualExecutionRequired: true; walletConnectionRequired: false; externalSubmissionDisabled: true; rewardNotGuaranteed: true; operatorApprovalRequired: true };
export type Web3TaskImportInput = Partial<Pick<Web3TaskPreview, "title" | "url" | "category" | "rewardLabel" | "estimatedRewardUsd" | "estimatedRewardBrl" | "deadlineLabel" | "notes">> & { sourceId?: string };

async function readJson<T>(response: Response, route: string): Promise<T> {
  const payload = await response.json().catch(() => null) as { success?: boolean; data?: T; message?: string; error?: string } | null;
  if (!response.ok || !payload?.success) throw new Error(payload?.message ?? payload?.error ?? `REQUEST_FAILED: ${route}`);
  return payload.data as T;
}

async function safeFetch<T>(path: string, fallback: T, signal?: AbortSignal): Promise<T> {
  try {
    return await readJson<T>(await fetch(apiUrl(path), { headers: { Accept: "application/json" }, signal }), path);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return fallback;
  }
}

export const fallbackWeb3TaskStatus: Web3TaskRadarStatus = { mode: "PREVIEW_ONLY", status: "WEB3_TASK_RADAR_BACKEND_UNAVAILABLE", manualFirst: true, walletConnectionRequired: false, externalSubmissionDisabled: true, rewardNotGuaranteed: true, operatorApprovalRequired: true, persistence: "IN_MEMORY_ONLY", sourceCount: 0, previewCount: 0, boundaries: ["Backend unavailable; UI remains preview-only", "No wallet, claim, payment, or external submission controls are enabled"] };

export function fetchWeb3TaskRadarStatus(signal?: AbortSignal) { return safeFetch<Web3TaskRadarStatus>("/api/web3-tasks/status", fallbackWeb3TaskStatus, signal); }
export function fetchWeb3TaskSources(signal?: AbortSignal) { return safeFetch<{ mode: Web3TaskRadarMode; sources: Web3TaskSource[] }>("/api/web3-tasks/sources", { mode: "PREVIEW_ONLY", sources: [] }, signal); }
export function fetchWeb3TaskPreviews(signal?: AbortSignal) { return safeFetch<{ mode: Web3TaskRadarMode; previews: Web3TaskPreview[]; count: number }>("/api/web3-tasks/previews", { mode: "PREVIEW_ONLY", previews: [], count: 0 }, signal); }
export async function manualImportWeb3Task(input: Web3TaskImportInput) { return readJson<{ mode: Web3TaskRadarMode; preview: Web3TaskPreview }>(await fetch(apiUrl("/api/web3-tasks/manual-import"), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(input) }), "/api/web3-tasks/manual-import"); }
export async function createInternalTaskPreview(id: string) { return readJson<{ mode: Web3TaskRadarMode; internalTaskPreviewCreated: boolean; link: Web3TaskPipelineLink; opportunityPreview: any | null; taskPreview: any | null }>(await fetch(apiUrl(`/api/web3-tasks/previews/${id}/create-internal-task-preview`), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ operatorConfirmed: true }) }), `/api/web3-tasks/previews/${id}/create-internal-task-preview`); }

export function fetchWeb3PipelineLinks(signal?: AbortSignal) { return safeFetch<{ mode: Web3TaskRadarMode; links: Web3TaskPipelineLink[]; count: number }>("/api/web3-tasks/pipeline-links", { mode: "PREVIEW_ONLY", links: [], count: 0 }, signal); }
export function fetchWeb3PipelineLinkById(id: string, signal?: AbortSignal) { return safeFetch<{ mode: Web3TaskRadarMode; link: Web3TaskPipelineLink }>(`/api/web3-tasks/pipeline-links/${id}`, { mode: "PREVIEW_ONLY", link: null as unknown as Web3TaskPipelineLink }, signal); }
export async function prepareBrokerPreviewFromPipelineLink(id: string) { return readJson<{ mode: Web3TaskRadarMode; link: Web3TaskPipelineLink; brokerPreparation: any }>(await fetch(apiUrl(`/api/web3-tasks/pipeline-links/${id}/prepare-broker-preview`), { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ operatorConfirmed: true }) }), `/api/web3-tasks/pipeline-links/${id}/prepare-broker-preview`); }
