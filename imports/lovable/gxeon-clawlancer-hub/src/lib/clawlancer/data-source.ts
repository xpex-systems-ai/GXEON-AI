import { queryOptions } from "@tanstack/react-query";
import { demoSnapshot } from "./mock-data";
import type { MonitorSnapshot } from "./types";

/**
 * Camada de acesso a dados.
 *
 * Modo DEMO (padrão): usa `demoSnapshot`.
 * Modo LIVE: quando `VITE_CLAWLANCER_API_URL` estiver definido, busca
 * `GET {API_URL}/monitor/snapshot` e espera um `MonitorSnapshot`.
 *
 * O frontend é SOMENTE LEITURA. Nenhuma rota de escrita, assinatura ou
 * movimentação de fundos é exposta aqui — ações financeiras são gates manuais.
 */

export function getApiBaseUrl(): string | null {
  const url = import.meta.env.VITE_CLAWLANCER_API_URL as string | undefined;
  return url && url.trim().length > 0 ? url.replace(/\/$/, "") : null;
}

export function isLiveMode(): boolean {
  return getApiBaseUrl() !== null;
}

async function fetchLiveSnapshot(baseUrl: string): Promise<MonitorSnapshot> {
  const res = await fetch(`${baseUrl}/monitor/snapshot`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Falha ao carregar snapshot (${res.status})`);
  const data = (await res.json()) as MonitorSnapshot;
  return { ...data, mode: "live" };
}

export async function loadSnapshot(): Promise<MonitorSnapshot> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return demoSnapshot;
  try {
    return await fetchLiveSnapshot(baseUrl);
  } catch (err) {
    // Falha na API: cai para DEMO, mas sinaliza a origem para nunca confundir com dado real.
    console.warn("[clawlancer] API indisponível, usando DEMO:", err);
    return { ...demoSnapshot, source: `fallback:${baseUrl}` };
  }
}

export const snapshotQuery = queryOptions({
  queryKey: ["clawlancer", "snapshot"],
  queryFn: loadSnapshot,
  staleTime: 30_000,
  refetchInterval: 60_000,
});