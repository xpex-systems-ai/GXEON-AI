import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { connectorGatewayActivationOrder, connectorGatewayProviders, connectorGatewaySafetyRules, type ConnectorGatewayStatus } from "@/data/connector-gateway";
import { ArrowRight, CheckCircle2, ClipboardList, LockKeyhole, PlugZap, ShieldCheck, Workflow } from "lucide-react";

const statusTone: Record<ConnectorGatewayStatus, string> = {
  READY_TO_PREPARE: "border-emerald-300/35 bg-emerald-400/10 text-emerald-100",
  NEEDS_REVIEW: "border-amber-300/35 bg-amber-400/10 text-amber-100",
  LOCKED: "border-red-300/35 bg-red-400/10 text-red-100",
  FUTURE: "border-stone-300/25 bg-stone-400/10 text-stone-200",
  CONNECTED_MANUAL: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
};

const buttonTone: Record<ConnectorGatewayStatus, string> = {
  READY_TO_PREPARE: "border-emerald-300/30 bg-emerald-400/10 text-emerald-50 hover:bg-emerald-400/15",
  NEEDS_REVIEW: "border-amber-300/30 bg-amber-400/10 text-amber-50 hover:bg-amber-400/15",
  LOCKED: "border-red-300/30 bg-red-400/10 text-red-50 hover:bg-red-400/15",
  FUTURE: "border-stone-300/20 bg-stone-400/10 text-stone-200 hover:bg-stone-400/15",
  CONNECTED_MANUAL: "border-cyan-300/30 bg-cyan-400/10 text-cyan-50 hover:bg-cyan-400/15",
};

export default function ConnectorGatewayPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-[#05070d]/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_10%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.16),transparent_34%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge className="border-cyan-300/35 bg-cyan-400/10 text-cyan-100">P0 Controlled Activation</Badge>
              <Badge className="border-emerald-300/35 bg-emerald-400/10 text-emerald-100">No OAuth flow</Badge>
              <Badge className="border-amber-300/35 bg-amber-400/10 text-amber-100">No frontend secrets</Badge>
              <Badge className="border-rose-300/35 bg-rose-400/10 text-rose-100">No external API calls</Badge>
            </div>
            <p className="text-xs uppercase tracking-[0.48em] text-cyan-200/70">GXEON QG · Connector Gateway</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">GXEON Connector Gateway</h1>
            <p className="mt-4 text-base text-slate-300 md:text-lg">
              Fundação segura para preparar GitHub, Vercel, Railway, Supabase e Microsoft 365 em ativação controlada. Esta tela é apenas superfície visual/operacional: não coleta tokens, não dispara OAuth, não grava banco e não chama APIs externas.
            </p>
          </div>
          <Card className="min-w-[280px] border-cyan-300/20 bg-black/30 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><PlugZap className="h-5 w-5 text-cyan-200" /> Runtime boundary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>Railway: runtime futuro para jobs server-side.</p>
              <p>Supabase: state store futuro após schema/RLS.</p>
              <p>Microsoft 365: proposal/email/calendar layer manual-first.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="border-amber-300/20 bg-[#080705]/85 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Workflow className="h-5 w-5 text-amber-200" /> Activation order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectorGatewayActivationOrder.map((connector) => (
              <div key={connector.id} className="rounded-2xl border border-amber-100/10 bg-amber-100/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-amber-300/25 bg-amber-400/10 text-sm font-bold text-amber-100">{connector.priority}</span>
                    <span className="font-semibold">{connector.name}</span>
                  </div>
                  <Badge variant="outline" className={statusTone[connector.status]}>{connector.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-stone-400">{connector.nextManualAction}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-emerald-300/20 bg-emerald-400/10 text-white backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-200" /> Safety rules</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {connectorGatewaySafetyRules.map((rule) => (
              <div key={rule} className="flex gap-3 rounded-2xl border border-emerald-300/20 bg-black/25 p-3 text-sm text-emerald-50">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                <span>{rule}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        {connectorGatewayProviders.map((connector) => (
          <Card key={connector.id} className="flex flex-col border-cyan-300/15 bg-[#070b14]/90 text-white backdrop-blur-xl">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/60">Priority {connector.priority}</p>
                  <CardTitle className="mt-1 text-xl">{connector.name}</CardTitle>
                </div>
                <Badge variant="outline" className={statusTone[connector.status]}>{connector.status}</Badge>
              </div>
              <p className="text-sm text-slate-300">{connector.purpose}</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="space-y-2 text-xs text-slate-300">
                <p><span className="text-cyan-100">Activation:</span> {connector.activationStyle}</p>
                <p><span className="text-cyan-100">Frontend:</span> {connector.frontendBehavior}</p>
                <p><span className="text-cyan-100">Backend futuro:</span> {connector.backendFuture}</p>
              </div>

              <div className="rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.04] p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Next manual action</p>
                <p className="mt-2 text-sm text-slate-200">{connector.nextManualAction}</p>
              </div>

              <div className="space-y-2">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"><ClipboardList className="h-3 w-3" /> Activation steps</p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {connector.activationSteps.map((step) => (
                    <li key={step} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-cyan-200" />{step}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Risks</p>
                <div className="flex flex-wrap gap-2">
                  {connector.risks.map((risk) => (
                    <Badge key={risk} variant="outline" className="border-rose-300/20 bg-rose-400/10 text-rose-100">{risk}</Badge>
                  ))}
                </div>
              </div>

              <Button type="button" variant="outline" className={`mt-auto justify-between ${buttonTone[connector.status]}`} disabled={connector.status === "LOCKED"} asChild={connector.id === "github"}>
                {connector.id === "github" ? (
                  <Link href="/ops/connectors/github">
                    <span>{connector.buttonLabel}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    {connector.buttonLabel}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-[11px] text-slate-500">Checklist: {connector.checklistHref}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
