import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CheckCircle2,
  CircleDashed,
  Cloud,
  DollarSign,
  Gauge,
  GitBranch,
  KeyRound,
  Lock,
  PlayCircle,
  RadioTower,
  RefreshCw,
  Rocket,
  ServerCog,
  ShieldAlert,
  TerminalSquare,
  Workflow,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { gxeoneDeployEngine, vercelEnvAliases } from "@/data/gxeone-deploy-engine";

type HealthState = "checking" | "online" | "offline";

type HealthResult = {
  label: string;
  path: string;
  state: HealthState;
  status?: number;
};

type EnvCheck = {
  name: string;
  aliases: readonly string[];
  present: boolean;
};

const stateClass = {
  ready: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  warning: "border-yellow-400/40 bg-yellow-500/15 text-yellow-100",
  blocked: "border-red-400/40 bg-red-500/15 text-red-100",
  neutral: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
  purple: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100",
};

function statusClass(status: string) {
  if (["ACTIVE", "online", "set", "READY", "AUTONOMOUS_DEPLOYMENT_READY"].includes(status)) return stateClass.ready;
  if (["checking", "READY_BUT_INACTIVE", "zero_touch_after_config"].includes(status)) return stateClass.warning;
  if (["offline", "missing", "locked"].includes(status)) return stateClass.blocked;
  return stateClass.neutral;
}

function EngineCard({ title, icon: Icon, children, className = "" }: { title: string; icon: LucideIcon; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`border-white/10 bg-slate-950/70 shadow-[0_0_45px_rgba(59,130,246,0.12)] backdrop-blur-xl ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-white/10 pb-4">
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">{title}</CardTitle>
        <Icon className="h-5 w-5 text-fuchsia-300" />
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

function TargetPanel({ target, icon: Icon }: { target: "railway" | "vercel"; icon: LucideIcon }) {
  const config = gxeoneDeployEngine.deployment_targets[target];

  return (
    <EngineCard title={`${target} · ${config.role}`} icon={Icon}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {"project_root" in config && <Badge className={stateClass.purple}>{config.project_root}</Badge>}
        {"framework" in config && <Badge className={stateClass.neutral}>{config.framework}</Badge>}
        <Badge className={stateClass.ready}>{config.actions.length} actions</Badge>
      </div>
      <div className="grid gap-2">
        {config.actions.map((action, index) => (
          <div key={action} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400/10 font-mono text-xs text-cyan-100">{index + 1}</span>
            <span className="font-mono text-sm text-slate-200">{action}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-3">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-yellow-100">Required env</p>
        <div className="flex flex-wrap gap-2">
          {config.env_required.map((env) => <Badge key={env} className={stateClass.warning}>{env}</Badge>)}
        </div>
      </div>
    </EngineCard>
  );
}

function getClientEnvChecks(): EnvCheck[] {
  const clientEnv = import.meta.env as unknown as Record<string, string | undefined>;

  return gxeoneDeployEngine.deployment_targets.vercel.env_required.map((name) => {
    const aliases = vercelEnvAliases[name] ?? [name];
    return {
      name,
      aliases,
      present: aliases.some((alias) => Boolean(clientEnv[alias])),
    };
  });
}

export default function DeployEnginePage() {
  const [healthResults, setHealthResults] = useState<HealthResult[]>(() =>
    Object.entries(gxeoneDeployEngine.health_checks).map(([label, path]) => ({ label, path, state: "checking" })),
  );
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const clientEnvChecks = useMemo(getClientEnvChecks, []);
  const envReadyCount = clientEnvChecks.filter((check) => check.present).length;
  const healthOnlineCount = healthResults.filter((result) => result.state === "online").length;
  const readinessScore = Math.round(((envReadyCount / clientEnvChecks.length) * 0.45 + (healthOnlineCount / healthResults.length) * 0.35 + 0.2) * 100);

  const runHealthChecks = useCallback(async () => {
    setHealthResults((current) => current.map((result) => ({ ...result, state: "checking" })));

    const checks = await Promise.allSettled(
      Object.entries(gxeoneDeployEngine.health_checks).map(async ([label, path]) => {
        const response = await fetch(path, { method: "GET" });
        return {
          label,
          path,
          state: response.ok ? "online" : "offline",
          status: response.status,
        } satisfies HealthResult;
      }),
    );

    setHealthResults(
      checks.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        const [label, path] = Object.entries(gxeoneDeployEngine.health_checks)[index];
        return { label, path, state: "offline" };
      }),
    );
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    runHealthChecks();
    const interval = setInterval(runHealthChecks, 45000);
    return () => clearInterval(interval);
  }, [runHealthChecks]);

  return (
    <div className="relative -m-6 min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(14,165,233,0.20),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(168,85,247,0.20),transparent_30%),linear-gradient(135deg,#020617,#0f172a_48%,#111827)] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="relative space-y-6">
        <section className="rounded-[2rem] border border-cyan-300/20 bg-white/[0.04] p-6 shadow-[0_0_90px_rgba(14,165,233,0.16)] backdrop-blur-2xl">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge className={statusClass(gxeoneDeployEngine.mode)}>{gxeoneDeployEngine.mode}</Badge>
                <Badge className={stateClass.purple}>{gxeoneDeployEngine.system}</Badge>
                <Badge className={stateClass.neutral}>v{gxeoneDeployEngine.version}</Badge>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">GXEONE Deploy Engine</h1>
              <p className="mt-3 max-w-4xl text-sm text-slate-300 md:text-base">
                Botão operacional de produção: valida configuração, organiza Railway + Vercel, acompanha health checks e mantém monetização travada até as keys reais serem injetadas.
              </p>
            </div>
            <div className="min-w-[300px] rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">production readiness</p>
                  <p className="mt-1 text-5xl font-black text-cyan-100">{readinessScore}%</p>
                </div>
                <Rocket className="h-12 w-12 text-fuchsia-300" />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-emerald-300" style={{ width: `${readinessScore}%` }} />
              </div>
              <Button onClick={runHealthChecks} className="mt-5 w-full bg-cyan-500 text-slate-950 hover:bg-cyan-300">
                <RefreshCw className="mr-2 h-4 w-4" /> Revalidar Deploy Engine
              </Button>
              <p className="mt-3 text-xs text-slate-400">Última leitura: {lastChecked ? lastChecked.toLocaleTimeString() : "iniciando"}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <EngineCard title="Objective" icon={Workflow} className="xl:col-span-2">
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(gxeoneDeployEngine.objective).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{key.replace(/_/g, " ")}</p>
                  <p className="mt-3 text-sm font-semibold text-slate-100">{value}</p>
                </div>
              ))}
            </div>
          </EngineCard>

          <EngineCard title="Final State" icon={PlayCircle}>
            <Badge className={stateClass.warning}>{gxeoneDeployEngine.final_instruction.next_state}</Badge>
            <p className="mt-4 text-sm leading-6 text-slate-300">{gxeoneDeployEngine.final_instruction.summary}</p>
          </EngineCard>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <TargetPanel target="railway" icon={ServerCog} />
          <TargetPanel target="vercel" icon={Cloud} />
        </section>

        <section className="grid gap-6 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-7">
            <EngineCard title="System Boot Sequence" icon={TerminalSquare}>
              <div className="space-y-3">
                {gxeoneDeployEngine.system_boot_sequence.map((step, index) => (
                  <div key={step} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-500/10 font-mono text-sm text-cyan-100">{index + 1}</span>
                    <p className="text-sm font-medium text-slate-100">{step}</p>
                  </div>
                ))}
              </div>
            </EngineCard>

            <EngineCard title="Dashboard Runtime Binding" icon={RadioTower}>
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge className={stateClass.neutral}>source: {gxeoneDeployEngine.dashboard_runtime_binding.source_of_truth}</Badge>
                <Badge className={stateClass.purple}>{gxeoneDeployEngine.dashboard_runtime_binding.render_mode}</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(gxeoneDeployEngine.dashboard_runtime_binding.frontend_binding).map(([label, path]) => (
                  <div key={label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label.replace(/_/g, " ")}</p>
                    <p className="mt-2 font-mono text-sm text-cyan-100">{path}</p>
                  </div>
                ))}
              </div>
            </EngineCard>
          </div>

          <div className="space-y-6 xl:col-span-5">
            <EngineCard title="Frontend Environment Gate" icon={KeyRound}>
              <div className="space-y-3">
                {clientEnvChecks.map((check) => (
                  <div key={check.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm text-white">{check.name}</p>
                        <p className="mt-1 text-xs text-slate-500">aliases: {check.aliases.join(" · ")}</p>
                      </div>
                      <Badge className={statusClass(check.present ? "set" : "missing")}>{check.present ? "set" : "missing"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </EngineCard>

            <EngineCard title="Health Checks" icon={Gauge}>
              <div className="space-y-3">
                {healthResults.map((result) => {
                  const Icon = result.state === "online" ? CheckCircle2 : result.state === "checking" ? CircleDashed : XCircle;
                  return (
                    <div key={result.path} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${result.state === "online" ? "text-emerald-300" : result.state === "checking" ? "text-yellow-300" : "text-red-300"}`} />
                        <div>
                          <p className="text-sm font-semibold text-white">{result.label}</p>
                          <p className="font-mono text-xs text-slate-500">{result.path}</p>
                        </div>
                      </div>
                      <Badge className={statusClass(result.state)}>{result.status ?? result.state}</Badge>
                    </div>
                  );
                })}
              </div>
            </EngineCard>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <EngineCard title="Railway Runtime Map" icon={GitBranch}>
            <div className="space-y-3">
              {gxeoneDeployEngine.railway_runtime_map.services.map((service) => (
                <div key={service.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm text-white">{service.name}</p>
                    <Badge className={statusClass(service.status)}>{service.status}</Badge>
                  </div>
                  <p className="mt-2 font-mono text-xs text-slate-500">{service.entry}</p>
                </div>
              ))}
            </div>
          </EngineCard>

          <EngineCard title="Vercel Frontend Map" icon={Activity}>
            <div className="mb-4 grid gap-2 font-mono text-xs text-slate-300">
              <div className="flex justify-between rounded-lg bg-slate-900/70 px-3 py-2"><span>project</span><span>{gxeoneDeployEngine.vercel_frontend_map.project_name}</span></div>
              <div className="flex justify-between rounded-lg bg-slate-900/70 px-3 py-2"><span>framework</span><span>{gxeoneDeployEngine.vercel_frontend_map.framework}</span></div>
              <div className="rounded-lg bg-slate-900/70 px-3 py-2"><span className="text-slate-500">entry</span><p className="mt-1 text-cyan-100">{gxeoneDeployEngine.vercel_frontend_map.entry_point}</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              {gxeoneDeployEngine.vercel_frontend_map.dashboard_modules.map((module) => <Badge key={module} className={stateClass.neutral}>{module}</Badge>)}
            </div>
          </EngineCard>

          <EngineCard title="Monetization Lock" icon={DollarSign}>
            <div className="flex items-center justify-between rounded-2xl border border-yellow-400/20 bg-yellow-500/10 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-yellow-100">status</p>
                <p className="mt-1 font-semibold text-white">{gxeoneDeployEngine.monetization_activation.status}</p>
              </div>
              <Lock className="h-8 w-8 text-yellow-200" />
            </div>
            <div className="mt-4 space-y-2">
              {gxeoneDeployEngine.monetization_activation.enabled_modules.map((module) => <p key={module} className="text-sm text-emerald-100">✓ {module}</p>)}
            </div>
            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm text-red-100"><ShieldAlert className="h-4 w-4" /> Locked until keys</p>
              <div className="flex flex-wrap gap-2">
                {gxeoneDeployEngine.monetization_activation.locked_until_keys.map((key) => <Badge key={key} className={stateClass.blocked}>{key}</Badge>)}
              </div>
            </div>
          </EngineCard>
        </section>
      </div>
    </div>
  );
}
