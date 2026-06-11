import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Bot, CheckCircle2, ExternalLink, PlugZap, ShieldCheck, Sparkles } from "lucide-react";
import { fetchHomeCenterAgentGrokReadiness, fetchHomeCenterAgentPermissions, fetchHomeCenterAgentRegistry, fetchHomeCenterAgentStatus, fallbackHomeCenterAgents, type AgentReadinessStatus, type GrokBuilderPreparationStatus, type HomeCenterAgentPermissionsResponse, type HomeCenterAgentRegistryResponse } from "@/services/homeCenterAgentsService";

const connectors = [
  { name: "GitHub", status: "CONNECTED_READONLY", detail: "Repository visibility preserved without write actions." },
  { name: "Vercel", status: "CONNECTED_READONLY", detail: "Deployment visibility preserved without dashboard secrets." },
  { name: "Railway", status: "NEXT", detail: "Backend runtime connector activation remains operator controlled." },
  { name: "Supabase", status: "NEXT", detail: "Database activation remains outside this P0 monetization boundary." },
  { name: "Mercado Pago", status: "MONETIZATION_NEXT", detail: "Backend-only credentials and webhook setup can be added after approval." },
  { name: "Stripe", status: "MONETIZATION_NEXT", detail: "Backend-only checkout and webhook readiness can be added after approval." },
];

const lifecycle = ["discover", "prepare", "validate", "connect", "test", "monitor", "evidence", "dashboard"];
const bridgeLinks = [
  { label: "Opportunity Inbox", href: "/ops/opportunities" },
  { label: "Radar X", href: "/ops/radar-x" },
  { label: "Monetization Board", href: "/ops/monetization" },
];

type HomeCenterAgentsState = {
  status: AgentReadinessStatus;
  registry: HomeCenterAgentRegistryResponse;
  permissions: HomeCenterAgentPermissionsResponse;
  grokReadiness: GrokBuilderPreparationStatus;
  fallback: boolean;
  error: string | null;
};

const initialState: HomeCenterAgentsState = {
  status: fallbackHomeCenterAgents.status,
  registry: fallbackHomeCenterAgents.registry,
  permissions: fallbackHomeCenterAgents.permissions,
  grokReadiness: fallbackHomeCenterAgents.grokReadiness,
  fallback: true,
  error: null,
};

export default function AgentConectouPage() {
  const [state, setState] = useState<HomeCenterAgentsState>(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadHomeCenterAgents() {
      try {
        const [statusResult, registryResult, permissionsResult, grokResult] = await Promise.all([
          fetchHomeCenterAgentStatus(controller.signal),
          fetchHomeCenterAgentRegistry(controller.signal),
          fetchHomeCenterAgentPermissions(controller.signal),
          fetchHomeCenterAgentGrokReadiness(controller.signal),
        ]);
        setState({
          status: statusResult.data,
          registry: registryResult.data,
          permissions: permissionsResult.data,
          grokReadiness: grokResult.data,
          fallback: statusResult.fallback || registryResult.fallback || permissionsResult.fallback || grokResult.fallback,
          error: statusResult.error ?? registryResult.error ?? permissionsResult.error ?? grokResult.error,
        });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadHomeCenterAgents();
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_12%_22%,rgba(245,158,11,0.12),transparent_34%)]" />
        <div className="relative space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100">Home Center Agents · P0 pre-install</Badge>
            <Badge variant="outline" className="border-amber-300/40 text-amber-100">Agent Conectou bridge preserved</Badge>
            {state.fallback && <Badge variant="outline" className="border-red-300/40 text-red-100">Safe fallback registry</Badge>}
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">Home Center Agents</h1>
            <p className="mt-3 max-w-4xl text-slate-300">Agent Conectou now acts as the connector/agent bridge: a registry, capability map, permission matrix and Grok Builder preparation layer. P0 prepares the operational home only; no autonomous agents are installed, executing, contacting users, writing to GitHub or moving money.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <Metric label="Agents" value={state.status.agentsTotal.toString()} />
            <Metric label="Ready" value={state.status.readyForInstall.toString()} />
            <Metric label="Installed" value={state.status.installed.toString()} />
            <Metric label="Active" value={state.status.active.toString()} />
            <Metric label="Policy" value="Deny execution" />
          </div>
          <div className="flex flex-wrap gap-3">
            {bridgeLinks.map((link) => (
              <Button key={link.href} asChild variant="outline" className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-400/10">
                <Link href={link.href}>{link.label}<ExternalLink className="ml-2 h-4 w-4" /></Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {state.error && <Card className="border-amber-300/20 bg-amber-400/10"><CardContent className="flex gap-3 p-4 text-sm text-amber-50"><AlertTriangle className="h-5 w-5" />Backend unavailable, so the dashboard is showing the safe local P0 fallback: {state.error}</CardContent></Card>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {state.registry.agents.map((agent) => (
          <Card key={agent.id} className="border-white/10 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-white">{agent.name}</CardTitle>
                  <p className="mt-2 text-sm text-slate-400">{agent.purpose}</p>
                </div>
                <Badge variant="outline" className="shrink-0 border-emerald-300/30 text-emerald-100">{agent.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <PanelList title="Allowed capabilities" tone="emerald" items={agent.capabilities.map((capability) => `${capability.label} · ${capability.permission}`)} />
              <PanelList title="Forbidden actions" tone="red" items={agent.forbiddenActions} />
              <PanelList title="Connector access" tone="cyan" items={agent.connectorAccess.map((connector) => `${connector.connector} · ${connector.access}${connector.required ? " · required" : " · optional"}`)} />
              <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3 text-amber-50">
                <p className="font-bold">Manual approval required</p>
                <p className="mt-1 text-xs text-amber-100/80">{agent.manualApprovalGates.map((gate) => gate.label).join(" · ")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-fuchsia-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-fuchsia-200" />Grok Builder readiness</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div className="grid gap-3 md:grid-cols-2">
              <Metric label="Ready for Builder" value={state.grokReadiness.readyForGrokBuilder ? "Yes" : "No"} />
              <Metric label="Install mode" value="Future approval" />
              <Metric label="Install endpoint" value={state.grokReadiness.noInstallEndpoint ? "Absent" : "Present"} />
              <Metric label="Execution endpoint" value={state.grokReadiness.noExecutionEndpoint ? "Absent" : "Present"} />
            </div>
            <PanelList title="Entry conditions" tone="fuchsia" items={state.grokReadiness.entryConditions} />
            <PanelList title="Missing before install" tone="amber" items={state.grokReadiness.missingBeforeInstall.length ? state.grokReadiness.missingBeforeInstall : ["None for P0 preparation"]} />
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Bot className="h-5 w-5 text-cyan-200" />Permission matrix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-red-300/20 bg-red-500/10 p-3 text-red-100">Default policy: {state.permissions.defaultPolicy}. Execution, external contact, GitHub writes and payment actions are disabled by default.</div>
            <div className="grid gap-2">
              {state.permissions.permissions.map((row) => (
                <div key={row.agentId} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-white">{row.agentName}</p>
                    <Badge variant="outline" className="border-amber-300/30 text-amber-100">approval required</Badge>
                  </div>
                  <p className="mt-2 text-xs text-cyan-100">Permissions: {row.permissions.join(" · ")}</p>
                  <p className="mt-1 text-xs text-red-100">Denied: {row.forbiddenActions.join(" · ")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {connectors.map((connector) => (
          <Card key={connector.name} className="border-white/10 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-white">
                <span>{connector.name}</span>
                <Badge variant="outline" className="border-emerald-300/30 text-emerald-100">{connector.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3 text-sm text-slate-300">
              <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
              <span>{connector.detail}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {lifecycle.map((step, index) => (
          <div key={step} className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-amber-100/70">
              <span>Step {index + 1}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
            </div>
            <p className="mt-3 text-lg font-bold capitalize text-white">{step}</p>
          </div>
        ))}
      </section>

      <Card className="border-emerald-300/20 bg-emerald-400/10">
        <CardContent className="flex flex-wrap items-center gap-3 p-5 text-emerald-50">
          <ShieldCheck className="h-5 w-5" />
          <span>{loading ? "Loading Home Center Agents readiness..." : "P0 boundary confirmed: agents are not executing yet; no credential UI, no payment capture and no destructive connector automation are enabled."}</span>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-white">{value}</p></div>;
}

function PanelList({ title, tone, items }: { title: string; tone: "emerald" | "red" | "cyan" | "fuchsia" | "amber"; items: string[] }) {
  const toneClass = {
    emerald: "border-emerald-300/15 bg-emerald-400/10 text-emerald-50",
    red: "border-red-300/15 bg-red-500/10 text-red-50",
    cyan: "border-cyan-300/15 bg-cyan-400/10 text-cyan-50",
    fuchsia: "border-fuchsia-300/15 bg-fuchsia-400/10 text-fuchsia-50",
    amber: "border-amber-300/15 bg-amber-400/10 text-amber-50",
  }[tone];
  return <div className={`rounded-2xl border p-3 ${toneClass}`}><p className="font-bold">{title}</p><ul className="mt-2 space-y-1 text-xs opacity-90">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}
