const configuredApiBaseUrl = (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)?.trim().replace(/\/+$/, "") ?? "";

export const apiBaseConfigurationHint = "Set VITE_GXEON_API_BASE_URL to the API server public origin when the dashboard is deployed separately from the API server.";

export function getApiBaseUrl(): string {
  return configuredApiBaseUrl;
}

export function getApiBaseDiagnostic(): string {
  return configuredApiBaseUrl || "same-origin /api";
}

export function isVercelPreviewHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname.endsWith(".vercel.app");
}

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`API_PATH_MUST_START_WITH_SLASH: ${path}`);
  }

  if (!configuredApiBaseUrl && isVercelPreviewHost()) {
    throw new Error(`BACKEND_URL_MISCONFIGURED: ${apiBaseConfigurationHint}`);
  }

  return `${configuredApiBaseUrl}${path}`;
}
