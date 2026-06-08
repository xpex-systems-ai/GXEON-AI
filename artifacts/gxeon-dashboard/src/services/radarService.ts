export type RadarSource = "Manual" | "Referral" | "Workana" | "99Freelas" | "LinkedIn" | "Email" | "Form";

export type RadarStatus = {
  status: "MANUAL_INTAKE_PREVIEW_READY";
  persistence: "DISABLED_IN_P0";
  scraping: "DISABLED";
  marketplaceAutomation: "DISABLED";
  acceptedSources: RadarSource[];
};

export type RadarManualIntakePayload = {
  source: RadarSource;
  title: string;
  problem: string;
  budget?: string;
  urgency?: string;
  contactChannel?: string;
  consentConfirmed: boolean;
  notes?: string;
};

export type RadarOpportunityPreview = {
  accepted: true;
  persistence: "PREVIEW_ONLY";
  automation: "NONE";
  normalized: {
    source: RadarSource;
    title: string;
    problem: string;
    budget: string | null;
    urgency: string | null;
    contactChannel: string | null;
    consentConfirmed: true;
  };
  score: number;
  scoringExplanation: string[];
  recommendedNextStep: string;
};

const configuredApiBaseUrl = (import.meta.env.VITE_GXEON_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

function apiUrl(path: string): string {
  return `${configuredApiBaseUrl}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { success: boolean; data: T; error?: string };
  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? `REQUEST_FAILED_${response.status}`);
  }
  return payload.data;
}

export async function fetchRadarStatus(signal?: AbortSignal) {
  return readJson<RadarStatus>(await fetch(apiUrl("/api/radar/status"), { headers: { Accept: "application/json" }, signal }));
}

export async function previewManualOpportunity(payload: RadarManualIntakePayload) {
  return readJson<RadarOpportunityPreview>(
    await fetch(apiUrl("/api/radar/manual-intake/preview"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}
