import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { activationPlan, buildGxeonPlaceholderPath, gxeonNavigation, infrastructureStack, integrationProviders } from "@/data/gxeon-os";
import { activationPlan, gxeonNavigation, infrastructureStack, integrationProviders } from "@/data/gxeon-os";
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
              <Badge variant="outline" className="border-emerald-300/40 text-emerald-200">Frontend-first architecture</Badge>
              <Badge variant="outline" className="border-fuchsia-300/40 text-fuchsia-200">External APIs disabled</Badge>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-cyan-200/70">Captura · Prediz · Executa · Monetiza · Escala</p>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">Quantum Command Center</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
                Ecossistema visual completo do GXEON com todos os módulos navegáveis, dashboards mockados, badges de status e botões de conexão prontos para ativação gradual.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Módulos renderizados", "14/14", "100%"],
                ["Integrações externas", "0 ativas", "Seguro"],
                ["Prontidão visual", "98%", "Vercel preview"],
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
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-cyan-200">{hint}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Activation mode</p>
                <p className="text-lg font-semibold text-white">Visual only · No live calls</p>
              </div>
              <Lock className="h-8 w-8 text-emerald-300" />
            </div>
            <div className="mt-5 space-y-3">
              {activationPlan.map((step, index) => (
                <Link key={step} href={buildGxeonPlaceholderPath("command_center", step)}>
                  <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-emerald-300/30 hover:bg-emerald-400/10">
                    {index < 3 ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <CircleDot className="h-4 w-4 text-amber-300" />}
                    <span className="flex-1 text-sm text-slate-200">{step}</span>
                    <ArrowRight className="h-3 w-3 text-emerald-200 transition group-hover:translate-x-1" />
                  </div>
                </Link>
                <div key={step} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  {index < 3 ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <CircleDot className="h-4 w-4 text-amber-300" />}
                  <span className="text-sm text-slate-200">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {gxeonNavigation.map((module) => {
          const ModuleIcon = module.icon;
          return (
            <Link key={module.id} href={module.route}>
              <Card className={`group h-full cursor-pointer overflow-hidden border bg-gradient-to-br ${accentClasses[module.accent]} transition hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-950/30 ${module.id === activeModule.id ? "ring-2 ring-cyan-300/70" : ""}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                      <ModuleIcon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="border-current/30 text-[10px] uppercase tracking-wider">
                      {statusLabel[module.status ?? "mock_ready"]}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-white">{module.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="min-h-12 text-sm text-slate-300">{module.description}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{module.widgets.length} widgets</span>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card className={`overflow-hidden border bg-gradient-to-br ${accentClasses[activeModule.accent]}`}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                  <Icon className="h-7 w-7" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">{activeModule.name}</CardTitle>
                  <p className="text-sm text-slate-300">{activeModule.description}</p>
                </div>
              </div>
              <Link href={buildGxeonPlaceholderPath(activeModule.id, "Connect later")}>
                <Button className="border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20">
                  Connect later
                </Button>
              </Link>
              <Button className="border border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20">
                Connect later
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeModule.widgets.map((widget, index) => (
                <Link key={widget} href={buildGxeonPlaceholderPath(activeModule.id, widget)}>
                  <div className="group rounded-2xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-white">{widget}</p>
                      <Activity className="h-4 w-4 text-cyan-200" />
                    </div>
                    <p className="mt-3 text-3xl font-black text-white">{index % 3 === 0 ? "98" : index % 3 === 1 ? "1.842" : "24/7"}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mock data · no API call</p>
                      <ArrowRight className="h-3 w-3 text-cyan-200 transition group-hover:translate-x-1" />
                    </div>
                    <Progress value={72 + (index % 4) * 6} className="mt-4 h-2" />
                  </div>
                </Link>
              ))}
            </div>
            {isIntegrationSurface && (
              <Link href={buildGxeonPlaceholderPath(activeModule.id, "Modo seguro ativado")}>
                <div className="group rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-400/15">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">Modo seguro ativado</p>
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                  <p className="text-sm text-amber-100/80">Este módulo está renderizado como camada visual. Nenhuma chave, webhook, carteira, runtime externo ou API real é acionada nesta fase.</p>
                </div>
              </Link>
                <div key={widget} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white">{widget}</p>
                    <Activity className="h-4 w-4 text-cyan-200" />
                  </div>
                  <p className="mt-3 text-3xl font-black text-white">{index % 3 === 0 ? "98" : index % 3 === 1 ? "1.842" : "24/7"}</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Mock data · no API call</p>
                  <Progress value={72 + (index % 4) * 6} className="mt-4 h-2" />
                </div>
              ))}
            </div>
            {isIntegrationSurface && (
              <div className="rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-amber-100">
                <p className="font-semibold">Modo seguro ativado</p>
                <p className="text-sm text-amber-100/80">Este módulo está renderizado como camada visual. Nenhuma chave, webhook, carteira, runtime externo ou API real é acionada nesta fase.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-cyan-300/20 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Search className="h-5 w-5 text-cyan-200" /> Global Search & Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href={buildGxeonPlaceholderPath("command_center", "Global Search")}>
                <div className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-300 transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
                  <Search className="h-4 w-4" />
                  <span className="flex-1">Buscar módulo, widget, agente, receita ou integração...</span>
                  <ArrowRight className="h-3 w-3 text-cyan-200 transition group-hover:translate-x-1" />
                </div>
              </Link>
              {["War Room monitorando 5 alertas críticos mockados", "Radar X aguardando conexão de sinais externos", "Financial Core pronto para validar jornada de billing"].map((notification) => (
                <Link key={notification} href={buildGxeonPlaceholderPath("command_center", notification)}>
                  <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200 transition hover:border-fuchsia-300/30 hover:bg-fuchsia-400/10">
                    <Bell className="h-4 w-4 text-fuchsia-200" />
                    <span className="flex-1">{notification}</span>
                    <ArrowRight className="h-3 w-3 text-fuchsia-200 transition group-hover:translate-x-1" />
                  </div>
                </Link>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-slate-300">
                <Search className="h-4 w-4" />
                Buscar módulo, widget, agente, receita ou integração...
              </div>
              {["War Room monitorando 5 alertas críticos mockados", "Radar X aguardando conexão de sinais externos", "Financial Core pronto para validar jornada de billing"].map((notification) => (
                <div key={notification} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-200">
                  <Bell className="h-4 w-4 text-fuchsia-200" /> {notification}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-emerald-300/20 bg-slate-950/75 backdrop-blur-xl">
            <CardHeader>
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
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                  <p className="text-lg font-bold text-white">{item.value}</p>
                  <p className="text-xs text-emerald-200">{item.state}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="rounded-[2rem] border border-orange-300/20 bg-orange-500/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-orange-200/70">Future connections</p>
            <h2 className="text-2xl font-bold text-white">Integrações prontas para conectar depois</h2>
          </div>
          <Badge className="bg-orange-300 text-orange-950">All disconnected</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {integrationProviders.map((provider) => (
            <Link key={provider} href={buildGxeonPlaceholderPath("integrations", provider)}>
              <div className="group rounded-2xl border border-orange-200/15 bg-black/25 p-4 transition hover:border-orange-200/45 hover:bg-orange-400/10">
                <p className="font-semibold text-white">{provider}</p>
                <p className="text-sm text-orange-100/75">pending · connect button visible</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-orange-200/30 px-3 py-1.5 text-xs font-semibold text-orange-100">
                  Connect later
                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
            <div key={provider} className="rounded-2xl border border-orange-200/15 bg-black/25 p-4">
              <p className="font-semibold text-white">{provider}</p>
              <p className="text-sm text-orange-100/75">pending · connect button visible</p>
              <Button variant="outline" size="sm" className="mt-3 border-orange-200/30 bg-transparent text-orange-100 hover:bg-orange-200/10">Connect later</Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
