export const GXEON_R100_TRUTH_REFRESH = "GXEON_R100_TRUTH_REFRESH";

export type R100TruthRefreshPayload = {
  reason?: string;
  source?: string;
  timestamp: string;
  route?: string;
  entityId?: string;
  safe: true;
  [key: string]: unknown;
};

const isBrowser = () => typeof window !== "undefined";

export function dispatchR100TruthRefresh(reason = "manual_action_completed", payload: Record<string, unknown> = {}) {
  if (!isBrowser()) return;
  const detail: R100TruthRefreshPayload = {
    reason,
    source: typeof payload.source === "string" ? payload.source : "manual_ui",
    timestamp: new Date().toISOString(),
    route: window.location?.pathname,
    safe: true,
    ...payload,
  };
  window.dispatchEvent(new CustomEvent<R100TruthRefreshPayload>(GXEON_R100_TRUTH_REFRESH, { detail }));
}

export function subscribeR100TruthRefresh(handler: (payload: R100TruthRefreshPayload) => void) {
  if (!isBrowser()) return () => {};
  const listener = (event: Event) => handler((event as CustomEvent<R100TruthRefreshPayload>).detail);
  window.addEventListener(GXEON_R100_TRUTH_REFRESH, listener);
  return () => window.removeEventListener(GXEON_R100_TRUTH_REFRESH, listener);
}
