import {
  omnixEnterpriseBrowserStatusSchema,
  omnixEnterpriseBrowserSessionSchema,
  omnixEnterpriseLoginSchema,
  omnixEnterpriseRecoverySchema,
} from "@workspace/api-zod";
import { readAuditJson } from "./auditTransport";

export type PortalIdentityMode = "preview" | "enterprise";
export type EnterpriseBrowserSession = ReturnType<
  typeof omnixEnterpriseBrowserSessionSchema.parse
>;
export type EnterpriseBrowserStatus = ReturnType<
  typeof omnixEnterpriseBrowserStatusSchema.parse
>;
export type EnterpriseOrganization =
  EnterpriseBrowserSession["organizations"][number];
export type EnterprisePortalSession = {
  ok: true;
  preview: false;
  identityMode: "enterprise";
  customerDataAllowed: false;
  user: {
    id: string;
    organizationId: string;
    name: string;
    role: EnterpriseOrganization["role"];
  };
  expiresAt: string;
  scopes: readonly string[];
  delegated: boolean;
};
const organizationPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export class EnterprisePortalHttpError extends Error {
  constructor(
    readonly status: number,
    code = "ENTERPRISE_REQUEST_FAILED",
  ) {
    super(`${code} (HTTP ${status})`);
    this.name = "EnterprisePortalHttpError";
  }
}
function headers(organizationId?: string, body?: unknown) {
  if (organizationId && !organizationPattern.test(organizationId))
    throw new Error("ENTERPRISE_ORGANIZATION_REQUIRED");
  return {
    ...(organizationId ? { "x-omnix-organization-id": organizationId } : {}),
    ...(body === undefined ? {} : { "Content-Type": "application/json" }),
  };
}
function boundedSignal(signal?: AbortSignal) {
  return signal
    ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
    : AbortSignal.timeout(15000);
}
async function browserRequest(
  route: "status" | "session" | "login" | "logout" | "recovery",
  options: {
    signal?: AbortSignal;
    organizationId?: string;
    body?: unknown;
  } = {},
) {
  const response = await fetch(`/api/omnix-enterprise/browser/${route}`, {
    method: options.body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: headers(options.organizationId, options.body),
    signal: boundedSignal(options.signal),
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new EnterprisePortalHttpError(response.status);
  }
  return readAuditJson(response);
}
export async function getEnterpriseBrowserStatus(signal?: AbortSignal) {
  return omnixEnterpriseBrowserStatusSchema.parse(
    await browserRequest("status", { signal }),
  );
}
export async function getEnterpriseBrowserSession(
  signal?: AbortSignal,
  organizationId?: string,
) {
  return omnixEnterpriseBrowserSessionSchema.parse(
    await browserRequest("session", { signal, organizationId }),
  );
}
function providerNavigation(value: string) {
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    throw new Error("ENTERPRISE_PROVIDER_URL_INVALID");
  }
  if (
    target.protocol !== "https:" ||
    target.username ||
    target.password ||
    target.hash
  )
    throw new Error("ENTERPRISE_PROVIDER_URL_INVALID");
  return target.href;
}
export async function beginEnterpriseBrowserLogin(signal?: AbortSignal, invitationToken?: string) {
  if (invitationToken && !/^[A-Za-z0-9_-]{43}$/.test(invitationToken)) throw new Error("Confira o convite autorizado antes de continuar.");
  const result = omnixEnterpriseLoginSchema.parse(
    await browserRequest("login", { signal, body: invitationToken ? {invitationToken} : {} }),
  );
  return providerNavigation(result.authorizationUrl);
}
export async function getEnterpriseRecoveryUrl(signal?: AbortSignal) {
  const result = omnixEnterpriseRecoverySchema.parse(
    await browserRequest("recovery", { signal }),
  );
  return providerNavigation(result.recoveryUrl);
}
export async function logoutEnterpriseBrowserSession(signal?: AbortSignal) {
  const value = await browserRequest("logout", { signal, body: {} });
  if (
    !value ||
    typeof value !== "object" ||
    !("ok" in value) ||
    value.ok !== true
  )
    throw new Error("ENTERPRISE_LOGOUT_NOT_CONFIRMED");
}
export function projectEnterprisePortalSession(
  value: EnterpriseBrowserSession,
  organizationId: string,
): EnterprisePortalSession {
  const organization = value.organizations.find(
      (item) => item.id === organizationId,
    ),
    principal = value.principal;
  if (
    !organization ||
    !principal ||
    principal.organizationId !== organizationId ||
    principal.userId !== value.userId
  )
    throw new Error("ENTERPRISE_ORGANIZATION_NOT_CONFIRMED");
  // Organization selection narrows a current server-validated principal. The
  // organization list and URL parameters never grant roles or resource access.
  return {
    ok: true,
    preview: false,
    identityMode: "enterprise",
    customerDataAllowed: false,
    user: {
      id: principal.userId,
      organizationId,
      name: organization.name,
      role: principal.role,
    },
    expiresAt: value.expiresAt,
    scopes: principal.scopes,
    delegated: principal.delegated,
  };
}
export async function requestEnterpriseAudit(
  path: string,
  organizationId: string,
  options: { body?: unknown; signal?: AbortSignal } = {},
) {
  const caseId =
    "[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}";
  if (
    !new RegExp(
      `^/audits(?:/${caseId}(?:/(?:run|review|finalize|report))?)?$`,
      "i",
    ).test(path) ||
    !organizationPattern.test(organizationId)
  )
    throw new Error("ENTERPRISE_AUDIT_ROUTE_REQUIRED");
  return fetch(`/api/omnix-enterprise${path}`, {
    method: options.body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: headers(organizationId, options.body),
    signal: boundedSignal(options.signal),
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
}
