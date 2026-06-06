import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { activationPlan, buildGxeonPlaceholderPath, gxeonNavigation, infrastructureStack, integrationProviders } from "@/data/gxeon-os";
import { Activity, ArrowRight, Bell, CheckCircle2, CircleDot, Lock, Search, Sparkles } from "lucide-react";

const statusLabel = {
  mock_ready: "Mock ready",
  placeholder_only: "Placeholder only",
  all_disconnected: "Disconnected",
};

const accentClasses: Record<string, string> = {
  amber: "from-amber-500/25 to-orange-500/10 border-amber-400/30 text-amber-200",
  blue: "from-blue-500/25 to-cyan-500/10 border-blue-400/30 text-blue-200",
  cyan: "from-cyan-500/25 to-blue-500/10 border-cyan-400/30 text-cyan-200",
  emerald: "from-emerald-500/25 to-green-500/10 border-emerald-400/30 text-emerald-200",
  fuchsia: "from-fuchsia-500/25 to-pink-500/10 border-fuchsia-400/30 text-fuchsia-200",
  green: "from-green-500/25 to-emerald-500/10 border-green-400/30 text-green-200",
  indigo: "from-indigo-500/25 to-violet-500/10 border-indigo-400/30 text-indigo-200",
  orange: "from-orange-500/25 to-red-500/10 border-orange-400/30 text-orange-200",
  rose: "from-rose-500/25 to-red-500/10 border-rose-400/30 text-rose-200",
  sky: "from-sky-500/25 to-cyan-500/10 border-sky-400/30 text-sky-200",
  slate: "from-slate-500/25 to-slate-300/10 border-slate-400/30 text-slate-200",
  teal: "from-teal-500/25 to-emerald-500/10 border-teal-400/30 text-teal-200",
  violet: "from-violet-500/25 to-purple-500/10 border-violet-400/30 text-violet-200",
  yellow: "from-yellow-500/25 to-amber-500/10 border-yellow-400/30 text-yellow-200",
};

type GxeonOSPageProps = {
  moduleId?: string;
};

export default function GxeonOSPage({ moduleId = "command_center" }: GxeonOSPageProps) {
  const activeModule = gxeonNavigation.find((module) => module.id === moduleId) ?? gxeonNavigation[0];
  const Icon = activeModule.icon;
  const isIntegrationSurface = activeModule.id === "integrations" || activeModule.id === "api_gateway" || activeModule.id === "blockchain" || activeModule.id === "radar_x";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,rgba(34,211,238,0.24),transparent_35%),radial-gradient(circle_at_20%_25%,rgba(168,85,247,0.18),transparent_32%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100">GXEON OS v2.0.0</Badge>
              <Badge variant="outline" className="border-emerald-300/40 text-emerald-200">Investor visual demo</Badge>
              <Badge variant="outline" className="border-fuchsia-300/40 text-fuchsia-200">APIs disabled</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-cyan-200/70">Opportunity → Task → Execution → Revenue → Analytics</p>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">GXEON OS Investor Demo</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Investor-ready visual demo of an Intelligent Execution Operating System. The dashboard shows modular architecture and activation roadmap while APIs, databases, payments and external providers remain disabled.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Core flow", "5 stages", "Opportunity to Analytics"],
                ["External APIs", "0 active", "Safe preview"],
                ["Investor demo", "Visual-ready", "Vercel preview"],
              ].map(([label, value, hint]) => (
                <Link key={label} href={buildGxeonPlaceholderPath("command_center", label)}>
                  <div className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-cyan-200">{hint}</p>
                      <ArrowRight className="h-3 w-3 text-cyan-200 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Activation mode</p>
                <p className="text-lg font-semibold text-white">Visual-only safe preview</p>
                <p className="text-lg font-semibold text-white">Visual-only safe mode</p>
              </div>
              <Lock className="h-7 w-7 text-emerald-300" />
            </div>
            <Progress value={98} className="mt-5 h-2" />
            <div className="mt-5 grid gap-3">
              {activationPlan.slice(0, 3).map((step) => (
                <Link key={step} href={buildGxeonPlaceholderPath("command_center", step)}>
                  <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200 transition hover:border-emerald-300/30 hover:bg-emerald-400/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <span className="flex-1">{step}</span>
                    <ArrowRight className="h-3 w-3 text-emerald-200 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/10 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Icon className="h-5 w-5" /> {activeModule.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`rounded-3xl border bg-gradient-to-br p-5 ${accentClasses[activeModule.accent] ?? accentClasses.cyan}`}>
              <Badge variant="outline" className="border-current text-current">{statusLabel[activeModule.status ?? "mock_ready"]}</Badge>
              <p className="mt-4 text-2xl font-black text-white">{activeModule.description}</p>
              <p className="mt-3 text-sm text-slate-200">No external calls run from this screen. Each widget is an auditable visual placeholder for the activation roadmap.</p>
            </div>
            {isIntegrationSurface ? (
              <div className="rounded-2xl border border-orange-300/20 bg-orange-400/10 p-4 text-sm text-orange-100">
                Integration blocked by policy: buttons and states are visual-only until explicit activation approval.
              <p className="mt-3 text-sm text-slate-200">Nenhuma chamada externa é executada nesta tela; cada widget aponta para um placeholder profissional auditável.</p>
            </div>
            {isIntegrationSurface ? (
              <div className="rounded-2xl border border-orange-300/20 bg-orange-400/10 p-4 text-sm text-orange-100">
                Integração bloqueada por política: botões e estados são apenas visuais até autorização explícita.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Activity className="h-5 w-5 text-cyan-200" /> Module Widgets</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {activeModule.widgets.map((widget) => (
              <Link key={widget} href={buildGxeonPlaceholderPath(activeModule.id, widget)}>
                <div className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{widget}</p>
                    <ArrowRight className="h-4 w-4 text-cyan-200 transition group-hover:translate-x-1" />
                  </div>
                  <p className="mt-2 text-sm text-slate-400">Visual demo block · activation pending</p>
                  <p className="mt-2 text-sm text-slate-400">Mock dashboard block · ready for future activation</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="border-fuchsia-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Search className="h-5 w-5 text-cyan-200" /> Global Search & Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href={buildGxeonPlaceholderPath("command_center", "Global Search")}>
              <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                <Search className="h-4 w-4" />
                <span className="flex-1">Search modules, widgets, agents, revenue model or integration roadmap...</span>
                <span className="flex-1">Buscar módulo, widget, agente, receita ou integração...</span>
                <ArrowRight className="h-3 w-3 text-cyan-200 transition group-hover:translate-x-1" />
              </div>
            </Link>
            {[
              "War Room shows investor demo risks and activation gates",
              "Radar X shows opportunity intake before external sources connect",
              "Financial Core models revenue tracking before Supabase activation",
              "War Room monitorando 5 alertas críticos mockados",
              "Radar X aguardando conexão de sinais externos",
              "Financial Core pronto para validar jornada de billing",
            ].map((notification) => (
              <Link key={notification} href={buildGxeonPlaceholderPath("command_center", notification)}>
                <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200 transition hover:border-fuchsia-300/30 hover:bg-fuchsia-400/10">
                  <Bell className="h-4 w-4 text-fuchsia-200" />
                  <span className="flex-1">{notification}</span>
                  <ArrowRight className="h-3 w-3 text-fuchsia-200 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-emerald-200" /> Lean stack readiness</CardTitle>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-emerald-200" /> Infrastructure readiness</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {infrastructureStack.map((item) => (
              <Link key={item.label} href={buildGxeonPlaceholderPath("command_center", `${item.label} ${item.value}`)}>
                <div className="group rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-emerald-300/40 hover:bg-emerald-400/10">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                  <p className="text-lg font-bold text-white">{item.value}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-emerald-200">{item.state}</p>
                    <ArrowRight className="h-3 w-3 text-emerald-200 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[2rem] border border-orange-300/20 bg-orange-500/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-orange-200/70">Future connections</p>
            <h2 className="text-2xl font-bold text-white">Integrations pending explicit activation</h2>
          </div>
          <Badge className="bg-orange-300 text-orange-950">All disconnected</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {integrationProviders.map((provider) => (
            <Link key={provider} href={buildGxeonPlaceholderPath("integrations", provider)}>
              <div className="group rounded-2xl border border-orange-200/15 bg-black/25 p-4 transition hover:border-orange-200/45 hover:bg-orange-400/10">
                <p className="font-semibold text-white">{provider}</p>
                <p className="text-sm text-orange-100/75">pending · visual-only activation gate</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-orange-200/30 px-3 py-1.5 text-xs font-semibold text-orange-100">
                  Activate later
                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5">
        <div className="flex flex-wrap items-center gap-3">
          {activationPlan.map((step, index) => (
            <Link key={step} href={buildGxeonPlaceholderPath("command_center", step)}>
              <div className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                <CircleDot className="h-3 w-3 text-cyan-200" />
                <span>{index + 1}. {step}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
