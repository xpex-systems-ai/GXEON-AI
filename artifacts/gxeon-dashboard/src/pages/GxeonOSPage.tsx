import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { activationPlan, buildGxeonPlaceholderPath, gxeonNavigation, infrastructureStack } from "@/data/gxeon-os";
import { connectorsReadiness, connectorCredentialBoundary } from "@/data/connectors-readiness";
import { operationalMode, operationalStatusCards } from "@/data/operational-mode";
import { qgMissionCards, qgRevenuePipeline, qgSafetyBoundaries, qgStatusBadges } from "@/data/qg-theme";
import { ArrowRight, BrainCircuit, CheckCircle2, CircleDot, Lock, Search, ShieldCheck, Sparkles } from "lucide-react";

const statusLabel = {
  operational: "Operacional",
  pending: "Pendente",
  locked: "Bloqueado",
  future: "Futuro",
  ready_to_connect: "Pronto para conectar",
};

const connectorTone: Record<string, string> = {
  READY_TO_CONNECT: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  NEEDS_REVIEW: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  LOCKED: "border-red-300/30 bg-red-400/10 text-red-100",
  CONNECTED_MANUAL: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  FUTURE: "border-stone-300/20 bg-stone-400/10 text-stone-200",
};

type GxeonOSPageProps = {
  moduleId?: string;
};

export default function GxeonOSPage({ moduleId = "command_center" }: GxeonOSPageProps) {
  const activeModule = gxeonNavigation.find((module) => module.id === moduleId) ?? gxeonNavigation[0];
  const Icon = activeModule.icon;
  const isCommandCenter = activeModule.id === "command_center";

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-amber-300/20 bg-[#080705]/90 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_12%,rgba(245,158,11,0.26),transparent_34%),radial-gradient(circle_at_16%_20%,rgba(120,53,15,0.28),transparent_34%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              {qgStatusBadges.map((badge) => (
                <Badge key={badge} variant="outline" className="border-amber-300/35 bg-amber-400/10 text-amber-100">{badge}</Badge>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.5em] text-amber-200/70">OPORTUNIDADE → TAREFA → EXECUÇÃO → VALIDAÇÃO → RELEASE → LEDGER</p>
              <h1 className="max-w-5xl text-4xl font-black tracking-tight text-white md:text-6xl">GXEON QG Operacional</h1>
              <p className="mt-4 max-w-3xl text-base text-stone-300 md:text-lg">
                Centro de comando privado para capturar oportunidades, transformar em execução, validar entregas e controlar receita.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {operationalStatusCards.map(({ label, value }) => (
                <Link key={label} href={buildGxeonPlaceholderPath("command_center", label)}>
                  <div className="group rounded-2xl border border-amber-100/10 bg-amber-100/[0.04] p-4 backdrop-blur transition hover:border-amber-300/40 hover:bg-amber-400/10">
                    <p className="text-xs uppercase tracking-[0.25em] text-stone-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-amber-200">{operationalMode.noSecretsBoundary}</p>
                      <ArrowRight className="h-3 w-3 text-amber-200 transition group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-amber-300/20 bg-black/35 p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18),transparent_62%)]" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Golden neural core</p>
                <p className="text-xl font-semibold text-white">Sound-of-intelligence cockpit</p>
              </div>
              <BrainCircuit className="h-10 w-10 text-amber-200 drop-shadow-[0_0_18px_rgba(245,158,11,0.65)]" />
            </div>
            <div className="relative mt-6 grid place-items-center py-6">
              <div className="absolute h-44 w-44 rounded-full border border-amber-300/20" />
              <div className="absolute h-32 w-32 rounded-full border border-amber-300/25" />
              <div className="grid h-24 w-24 place-items-center rounded-full border border-amber-300/45 bg-amber-400/10 shadow-[0_0_55px_rgba(245,158,11,0.28)]">
                <BrainCircuit className="h-12 w-12 text-amber-100" />
              </div>
            </div>
            <Progress value={100} className="relative mt-2 h-2" />
            <p className="relative mt-3 text-sm text-stone-300">Operação privada: aguardando dados reais, conectores em ativação controlada e primeira receita pendente.</p>
          </div>
        </div>
      </section>

      {isCommandCenter && (
        <>
          <section className="rounded-[2rem] border border-amber-300/20 bg-[#080705]/80 p-5 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Operator Mission Control</p>
                <h2 className="text-2xl font-bold text-white">Prioridades imediatas do QG</h2>
              </div>
              <Badge className="bg-amber-300 text-black">Operação Manual</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {qgMissionCards.map((mission) => (
                <Link key={mission.title} href={mission.route}>
                  <div className="group flex h-full flex-col rounded-2xl border border-amber-100/10 bg-amber-100/[0.04] p-4 transition hover:border-amber-300/40 hover:bg-amber-400/10">
                    <p className="font-bold text-white">{mission.title}</p>
                    <p className="mt-2 flex-1 text-sm text-stone-400">{mission.detail}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">{mission.callToAction}<ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-300/20 bg-[#080705]/80 p-5 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Revenue Pipeline Map</p>
                <h2 className="text-2xl font-bold text-white">P0 → P5 execução de receita</h2>
              </div>
              <Badge variant="outline" className="border-amber-300/40 text-amber-100">operacional · conectores controlados</Badge>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-6">
              {qgRevenuePipeline.map((stage, index) => {
                const StageIcon = stage.icon;
                return (
                  <Link key={stage.stage} href={stage.route}>
                    <div className="group relative h-full rounded-2xl border border-amber-300/18 bg-black/25 p-4 transition hover:border-amber-300/45 hover:bg-amber-400/10">
                      {index < qgRevenuePipeline.length - 1 && <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-amber-300/50 lg:block" />}
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-100">{stage.stage}</span>
                        <StageIcon className="h-5 w-5 text-amber-200" />
                      </div>
                      <p className="mt-3 font-bold text-white">{stage.title}</p>
                      <p className="mt-1 text-sm text-stone-400">{stage.detail}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      <section className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
        <Card className="border-amber-300/20 bg-[#080705]/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Icon className="h-5 w-5 text-amber-200" /> {activeModule.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline" className="border-amber-300/40 text-amber-100">{statusLabel[activeModule.status ?? "operational"]}</Badge>
            <p className="text-stone-300">{activeModule.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeModule.widgets.map((widget) => (
                <Link key={widget} href={buildGxeonPlaceholderPath(activeModule.id, widget)}>
                  <div className="group rounded-2xl border border-amber-100/10 bg-amber-100/[0.03] p-4 transition hover:border-amber-300/40 hover:bg-amber-400/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{widget}</p>
                      <ArrowRight className="h-4 w-4 text-amber-200 transition group-hover:translate-x-1" />
                    </div>
                    <p className="mt-2 text-sm text-stone-400">Bloco visual do QG · ativação futura controlada</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-300/20 bg-[#080705]/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Search className="h-5 w-5 text-amber-200" /> Search, notifications & infrastructure</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Link href={buildGxeonPlaceholderPath("command_center", "Private QG Search")}>
              <div className="group rounded-2xl border border-amber-100/10 bg-amber-100/[0.04] p-4 text-stone-300 transition hover:border-amber-300/40 hover:bg-amber-400/10 md:col-span-2">
                <div className="flex items-center gap-3"><Search className="h-4 w-4 text-amber-200" /><span>Buscar missão, módulo, tarefa, receita ou conector...</span><ArrowRight className="ml-auto h-3 w-3 text-amber-200 transition group-hover:translate-x-1" /></div>
              </div>
            </Link>
            {["Sala de Guerra pronta para checklist manual", "Radar X aguardando fontes consentidas", "Financial Core em controle visual de receita"].map((notification) => (
              <Link key={notification} href={buildGxeonPlaceholderPath("command_center", notification)}>
                <div className="group flex items-center gap-3 rounded-xl border border-amber-100/10 bg-amber-100/[0.03] p-3 text-sm text-stone-200 transition hover:border-amber-300/30 hover:bg-amber-400/10">
                  <CircleDot className="h-4 w-4 text-amber-200" />
                  <span className="flex-1">{notification}</span>
                </div>
              </Link>
            ))}
            {infrastructureStack.map((item) => (
              <Link key={item.label} href={buildGxeonPlaceholderPath("command_center", `${item.label} ${item.value}`)}>
                <div className="group rounded-xl border border-amber-100/10 bg-amber-100/[0.03] p-3 transition hover:border-amber-300/40 hover:bg-amber-400/10">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{item.label}</p>
                  <p className="text-lg font-bold text-white">{item.value}</p>
                  <p className="text-xs text-amber-200">{item.state}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="rounded-[2rem] border border-amber-300/20 bg-[#080705]/85 p-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-200/70">Connectors Hub</p>
            <h2 className="text-2xl font-bold text-white">Conectores privados preparados para ativação controlada</h2>
            <p className="mt-1 text-sm text-stone-400">{connectorCredentialBoundary}</p>
          </div>
          <Badge className="bg-amber-300 text-black">No auth flow · no API calls</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {connectorsReadiness.map((connector) => (
            <Link key={connector.id} href="/ops/connectors">
              <div className="group rounded-2xl border border-amber-200/15 bg-black/25 p-4 transition hover:border-amber-200/45 hover:bg-amber-400/10">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{connector.name}</p>
                  <Lock className="h-4 w-4 text-amber-200" />
                </div>
                <Badge variant="outline" className={`mt-3 border ${connectorTone[connector.status]}`}>{connector.status}</Badge>
                <p className="mt-3 text-xs text-stone-400">{connector.nextAction}</p>
                <p className="mt-2 text-xs text-amber-100">Risco: {connector.activationRisk}</p>
                <p className="mt-2 text-xs text-stone-300">Operador: {connector.requiredOperatorAction}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">{connector.destinationDashboardHint}</p>
                <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-200/30 px-3 py-1.5 text-xs font-semibold text-amber-100">
                  {connector.buttonLabel}
                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-emerald-300/20 bg-emerald-400/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5 text-emerald-200" /> QG safety boundary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {qgSafetyBoundaries.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-emerald-300/20 bg-black/25 p-3 text-sm text-emerald-50">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-300/20 bg-[#080705]/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-amber-200" /> Controlled activation plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activationPlan.map((step, index) => (
              <Link key={step} href={buildGxeonPlaceholderPath("command_center", step)}>
                <div className="group flex items-center gap-2 rounded-full border border-amber-100/10 bg-amber-100/[0.03] px-3 py-2 text-sm text-stone-200 transition hover:border-amber-300/40 hover:bg-amber-400/10">
                  <CheckCircle2 className="h-3 w-3 text-amber-200" />
                  <span>{index + 1}. {step}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
