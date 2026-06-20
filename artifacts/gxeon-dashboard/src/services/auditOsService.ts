import { apiUrl } from "./apiBase";

async function request<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), { headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const auditOsService = {
  status: () => request("/api/audit-os/status"),
  catalog: () => request("/api/audit-os/catalog"),
  monetizationLadder: () => request("/api/audit-os/monetization-ladder"),
  preview: (body: unknown) => request("/api/audit-os/preview", { method: "POST", body: JSON.stringify(body) }),
  healthV1: () => request("/api/v1/audit/health"),
  modulesV1: () => request<{ modules: any[]; count: number }>("/api/v1/audit/modules"),
  schemaMapV1: () => request("/api/v1/audit/schema-map"),
  missionControlV1: () => request("/api/v1/audit/mission-control"),
  casesSummaryV1: () => request("/api/v1/audit/cases/summary"),
  findingsSummaryV1: () => request("/api/v1/audit/findings/summary"),
  reportsSummaryV1: () => request("/api/v1/audit/reports/summary"),
  connectorsStatusV1: () => request("/api/v1/audit/connectors/status"),
  intakePreviewV1: (body: unknown) => request("/api/v1/audit/intake/preview", { method: "POST", body: JSON.stringify(body) }),
  createCaseV1: (body: unknown) => request("/api/v1/audit/cases", { method: "POST", body: JSON.stringify(body) }),
  casesV1: () => request("/api/v1/audit/cases"),
  schemaDiagnosticsV1: () => request("/api/v1/audit/schema-diagnostics"),
  bootstrapFirstCaseV1: (token: string) => request("/api/v1/audit/bootstrap/first-case", { method: "POST", headers: { Authorization: `Bearer ${token}` } }),
};
