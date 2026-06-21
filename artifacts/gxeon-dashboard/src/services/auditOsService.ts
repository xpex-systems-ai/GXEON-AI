import { apiUrl } from "./apiBase";

async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const auditOsService = {
  status: () => request("/api/audit-os/status"),
  catalog: () => request("/api/audit-os/catalog"),
  monetizationLadder: () => request("/api/audit-os/monetization-ladder"),
  preview: (body: unknown) =>
    request("/api/audit-os/preview", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  healthV1: () => request("/api/v1/audit/health"),
  modulesV1: () =>
    request<{ modules: any[]; count: number }>("/api/v1/audit/modules"),
  schemaMapV1: () => request("/api/v1/audit/schema-map"),
  missionControlV1: () => request("/api/v1/audit/mission-control"),
  casesSummaryV1: () => request("/api/v1/audit/cases/summary"),
  findingsSummaryV1: () => request("/api/v1/audit/findings/summary"),
  reportsSummaryV1: () => request("/api/v1/audit/reports/summary"),
  connectorsStatusV1: () => request("/api/v1/audit/connectors/status"),
  intakePreviewV1: (body: unknown) =>
    request("/api/v1/audit/intake/preview", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createCaseV1: (body: unknown) =>
    request("/api/v1/audit/cases", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  casesV1: () => request("/api/v1/audit/cases"),
  schemaDiagnosticsV1: () => request("/api/v1/audit/schema-diagnostics"),
  bootstrapFirstCaseV1: (token: string) =>
    request("/api/v1/audit/bootstrap/first-case", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  findingPreviewV1: (body: unknown) =>
    request("/api/v1/audit/findings/preview", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createFindingV1: (body: unknown, token: string) =>
    request("/api/v1/audit/findings", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  evidencePreviewV1: (body: unknown) =>
    request("/api/v1/audit/evidences/preview", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  createEvidenceV1: (body: unknown, token: string) =>
    request("/api/v1/audit/evidences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  caseFindingsV1: (caseId: string) =>
    request(`/api/v1/audit/cases/${caseId}/findings`),
  caseEvidencesV1: (caseId: string) =>
    request(`/api/v1/audit/cases/${caseId}/evidences`),
  baselineStatusV1: () => request("/api/v1/audit/baseline/status"),
  createBaselineEvidenceFindingV1: (token: string) =>
    request("/api/v1/audit/baseline/first-evidence-finding", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  mission006StatusV1: () =>
    request("/api/v1/audit/missions/mission-006/status"),
  runBaselineScoreReportV1: (token: string) =>
    request("/api/v1/audit/missions/run-baseline-score-report", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  offerCatalogV1: () => request("/api/v1/audit/offers/catalog"),
  proposalStatusV1: () => request("/api/v1/audit/proposals/status"),
  firstProposalDraftStatusV1: () => request("/api/v1/audit/proposals/first-draft/status"),
  runFirstProposalDraftV1: (token: string) =>
    request("/api/v1/audit/proposals/first-draft/run", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
  proposalPreviewV1: (body: unknown) =>
    request("/api/v1/audit/proposals/preview", { method: "POST", body: JSON.stringify(body) }),
  createProposalV1: (body: unknown, token: string) =>
    request("/api/v1/audit/proposals", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }),
  caseProposalsV1: (caseId: string) => request(`/api/v1/audit/cases/${caseId}/proposals`),
};
