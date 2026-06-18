import { apiUrl } from "./apiBase";

async function request(path: string, init?: RequestInit) {
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
  modulesV1: () => request("/api/v1/audit/modules"),
  schemaMapV1: () => request("/api/v1/audit/schema-map"),
};
