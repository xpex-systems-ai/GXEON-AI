import { buildConnectorPreview } from "./connectorPreviewBuilder";
import { scoreIntegrationCandidate } from "./integrationScoringEngine";
import type { IntegrationCandidateInput, IntegrationCandidatePreview, IntegrationCandidateStatus } from "./agentEconomyTypes";
const candidates = new Map<string, IntegrationCandidatePreview>();
export function createIntegrationCandidatePreview(input: IntegrationCandidateInput) { const url = input.url?.trim().toLowerCase(); if (url) { const existing = [...candidates.values()].find((c) => c.url?.toLowerCase() === url); if (existing) return existing; } const preview = scoreIntegrationCandidate(input); candidates.set(preview.id, preview); return preview; }
export const listIntegrationCandidatePreviews = () => [...candidates.values()].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
export const getIntegrationCandidatePreviewById = (id: string) => candidates.get(id);
export function updateIntegrationCandidateState(id: string, status: IntegrationCandidateStatus, patch: Partial<IntegrationCandidatePreview> = {}) { const current = candidates.get(id); if (!current) return undefined; const next = { ...current, ...patch, status, updatedAt: new Date().toISOString() } as IntegrationCandidatePreview; candidates.set(id, next); return next; }
export function attachConnectorPreview(id: string) { const current = candidates.get(id); if (!current) return undefined; return updateIntegrationCandidateState(id, current.decision === "BLOCKED" ? "NEEDS_MANUAL_REVIEW" : "CONNECTOR_PREVIEW_CREATED", { connectorPreview: buildConnectorPreview(current) }); }
export function clearIntegrationCandidatesForTests() { candidates.clear(); }
