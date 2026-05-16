import { Router } from "express";

const router = Router();

// ── In-memory conversion store ────────────────────────────────────────────────

let leadIdCounter = 1000;

interface Lead {
  id: string;
  source: string;
  campaign: string;
  score: number;
  intent: "hot" | "warm" | "cold";
  status: "new" | "qualified" | "converted" | "churned";
  capturedAt: string;
  convertedAt?: string;
  value: number;
}

interface FunnelStage {
  id: string;
  name: string;
  count: number;
  dropoff: number;
  conversionRate: number;
  avgTimeSeconds: number;
}

interface ConversionEvent {
  id: string;
  type: "funnel_stage" | "cta_click" | "lead_captured" | "conversion" | "churn";
  stage: string;
  actorCode: string;
  value: number;
  timestamp: string;
}

interface RevenueProjection {
  period: string;
  projected: number;
  conservative: number;
  optimistic: number;
}

const SOURCES = ["organic", "referral", "api_integration", "marketplace", "direct", "swarm_signal"];
const CAMPAIGNS = ["gxeon_launch", "api_promo", "dataset_sale", "actor_onboard", "gov_demo"];

function randomSource() { return SOURCES[Math.floor(Math.random() * SOURCES.length)]; }
function randomCampaign() { return CAMPAIGNS[Math.floor(Math.random() * CAMPAIGNS.length)]; }
function randomIntent(): Lead["intent"] {
  const r = Math.random();
  return r < 0.25 ? "hot" : r < 0.6 ? "warm" : "cold";
}

function seedLeads(): Lead[] {
  const leads: Lead[] = [];
  const now = Date.now();
  for (let i = 0; i < 48; i++) {
    const intent = randomIntent();
    const score = intent === "hot" ? 75 + Math.random() * 25 : intent === "warm" ? 40 + Math.random() * 35 : Math.random() * 40;
    const status: Lead["status"] = score > 80 ? "converted" : score > 50 ? "qualified" : "new";
    leads.push({
      id: `lead_${leadIdCounter++}`,
      source: randomSource(),
      campaign: randomCampaign(),
      score: Math.round(score),
      intent,
      status,
      capturedAt: new Date(now - i * 3_600_000 - Math.random() * 1_800_000).toISOString(),
      convertedAt: status === "converted" ? new Date(now - i * 2_400_000).toISOString() : undefined,
      value: status === "converted" ? Math.round(500 + Math.random() * 4500) : 0,
    });
  }
  return leads;
}

const leads: Lead[] = seedLeads();

const funnelStages: FunnelStage[] = [
  { id: "discovery", name: "Discovery", count: 1240, dropoff: 0, conversionRate: 100, avgTimeSeconds: 0 },
  { id: "capture", name: "Lead Capture", count: 496, dropoff: 744, conversionRate: 40.0, avgTimeSeconds: 120 },
  { id: "qualification", name: "Qualification", count: 223, dropoff: 273, conversionRate: 44.9, avgTimeSeconds: 840 },
  { id: "conversion", name: "Conversion", count: 89, dropoff: 134, conversionRate: 39.9, avgTimeSeconds: 3600 },
  { id: "retention", name: "Retention", count: 73, dropoff: 16, conversionRate: 82.0, avgTimeSeconds: 86400 },
];

const revenueProjections: RevenueProjection[] = [
  { period: "Jun 2026", projected: 54200, conservative: 47000, optimistic: 63000 },
  { period: "Jul 2026", projected: 61800, conservative: 52000, optimistic: 73000 },
  { period: "Aug 2026", projected: 70400, conservative: 59000, optimistic: 84000 },
  { period: "Sep 2026", projected: 79600, conservative: 66000, optimistic: 96000 },
  { period: "Oct 2026", projected: 89900, conservative: 74000, optimistic: 110000 },
  { period: "Nov 2026", projected: 101200, conservative: 83000, optimistic: 126000 },
];

// ── Route handlers ─────────────────────────────────────────────────────────────

router.get("/v1/conversion/funnels", (_req, res) => {
  const totalDiscovery = funnelStages[0].count;
  const overallConversionRate = totalDiscovery > 0
    ? ((funnelStages[funnelStages.length - 1].count / totalDiscovery) * 100).toFixed(1)
    : "0.0";
  res.json({
    stages: funnelStages,
    overallConversionRate: parseFloat(overallConversionRate),
    topDropoffStage: funnelStages.reduce((max, s) => s.dropoff > max.dropoff ? s : max, funnelStages[0]).id,
    generatedAt: new Date().toISOString(),
  });
});

router.get("/v1/conversion/leads", (req, res) => {
  const { intent, status, limit = "50" } = req.query as Record<string, string>;
  let filtered = [...leads];
  if (intent) filtered = filtered.filter((l) => l.intent === intent);
  if (status) filtered = filtered.filter((l) => l.status === status);
  const sorted = filtered.sort((a, b) => b.score - a.score).slice(0, parseInt(limit));
  const hotLeads = leads.filter((l) => l.intent === "hot").length;
  const converted = leads.filter((l) => l.status === "converted").length;
  const totalValue = leads.filter((l) => l.status === "converted").reduce((s, l) => s + l.value, 0);
  res.json({
    leads: sorted,
    summary: {
      total: leads.length,
      hot: hotLeads,
      warm: leads.filter((l) => l.intent === "warm").length,
      cold: leads.filter((l) => l.intent === "cold").length,
      converted,
      totalPipelineValue: totalValue,
    },
  });
});

router.post("/v1/leads/capture", (req, res) => {
  const { source, campaign, sessionId, referrer } = req.body ?? {};
  const score = Math.round(20 + Math.random() * 80);
  const intent: Lead["intent"] = score > 70 ? "hot" : score > 45 ? "warm" : "cold";
  const lead: Lead = {
    id: `lead_${leadIdCounter++}`,
    source: source ?? randomSource(),
    campaign: campaign ?? randomCampaign(),
    score,
    intent,
    status: "new",
    capturedAt: new Date().toISOString(),
    value: 0,
  };
  leads.unshift(lead);
  res.json({ lead, captured: true, score, intent });
});

router.get("/v1/conversion/telemetry", (_req, res) => {
  const converted = leads.filter((l) => l.status === "converted");
  const hot = leads.filter((l) => l.intent === "hot");
  const totalRevenue = converted.reduce((s, l) => s + l.value, 0);
  const avgScore = leads.reduce((s, l) => s + l.score, 0) / (leads.length || 1);
  const conversionRate = leads.length > 0 ? (converted.length / leads.length) * 100 : 0;
  const avgOrderValue = converted.length > 0 ? totalRevenue / converted.length : 0;
  res.json({
    totalLeads: leads.length,
    convertedLeads: converted.length,
    hotLeads: hot.length,
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    totalPipelineRevenue: totalRevenue,
    avgLeadScore: parseFloat(avgScore.toFixed(1)),
    avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
    ctaClickRate: 18.4,
    emailOpenRate: 34.7,
    generatedAt: new Date().toISOString(),
  });
});

router.get("/v1/conversion/forecast", (_req, res) => {
  const converted = leads.filter((l) => l.status === "converted");
  const currentMRR = converted.reduce((s, l) => s + l.value, 0);
  res.json({
    currentMRR,
    projections: revenueProjections,
    growthRate: 12.8,
    confidence: 0.84,
    generatedAt: new Date().toISOString(),
  });
});

router.get("/v1/conversion/opportunities", (_req, res) => {
  const opportunities = leads
    .filter((l) => l.intent === "hot" && l.status !== "converted")
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((l) => ({
      leadId: l.id,
      source: l.source,
      score: l.score,
      estimatedValue: Math.round(l.score * 45),
      urgency: l.score > 85 ? "critical" : l.score > 70 ? "high" : "medium",
      recommendation: l.score > 85
        ? "Immediate outreach — high-intent signal detected"
        : l.score > 70
          ? "Schedule demo — qualified interest"
          : "Nurture sequence — warming up",
    }));
  res.json({ opportunities, totalOpportunities: opportunities.length, generatedAt: new Date().toISOString() });
});

router.get("/v1/conversion/runtime", (_req, res) => {
  res.json({
    status: "ACTIVE",
    mode: "AUTONOMOUS_REVENUE_OPERATING_SYSTEM",
    engines: {
      funnelEngine: "ONLINE",
      leadCapture: "ONLINE",
      ctaEngine: "ADAPTIVE",
      revenueEngine: "ONLINE",
      aiSalesIntelligence: "ONLINE",
    },
    metrics: {
      leadsProcessedToday: leads.filter((l) => {
        const today = new Date().toDateString();
        return new Date(l.capturedAt).toDateString() === today;
      }).length,
      conversionEventsToday: leads.filter((l) => l.convertedAt && new Date(l.convertedAt).toDateString() === new Date().toDateString()).length,
    },
    uptime: "99.97%",
    lastHeartbeat: new Date().toISOString(),
    version: "GXEON_PHASE_7",
  });
});

router.get("/v1/revenue/live", (_req, res) => {
  const converted = leads.filter((l) => l.status === "converted");
  const totalRevenue = converted.reduce((s, l) => s + l.value, 0);
  const today = new Date().toDateString();
  const todayRevenue = leads
    .filter((l) => l.convertedAt && new Date(l.convertedAt).toDateString() === today)
    .reduce((s, l) => s + l.value, 0);
  res.json({
    totalRevenue,
    todayRevenue,
    mrr: 44800 + Math.round(Math.random() * 2000),
    arr: (44800 + Math.round(Math.random() * 2000)) * 12,
    activeSubscriptions: converted.length,
    churnRate: 2.1,
    nrr: 118.4,
    streams: {
      apiUsage: 12800,
      actorRevenue: 8400,
      datasetSales: 3700,
      zapierRevenue: 4200,
      signalSubs: 6100,
    },
    generatedAt: new Date().toISOString(),
  });
});

export default router;
