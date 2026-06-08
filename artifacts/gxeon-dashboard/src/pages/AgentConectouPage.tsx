import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, PlugZap, ShieldCheck } from "lucide-react";

const connectors = [
  { name: "GitHub", status: "CONNECTED_READONLY", detail: "Repository visibility preserved without write actions." },
  { name: "Vercel", status: "CONNECTED_READONLY", detail: "Deployment visibility preserved without dashboard secrets." },
  { name: "Railway", status: "NEXT", detail: "Backend runtime connector activation remains operator controlled." },
  { name: "Supabase", status: "NEXT", detail: "Database activation remains outside this P0 monetization boundary." },
  { name: "Mercado Pago", status: "MONETIZATION_NEXT", detail: "Backend-only credentials and webhook setup can be added after approval." },
  { name: "Stripe", status: "MONETIZATION_NEXT", detail: "Backend-only checkout and webhook readiness can be added after approval." },
];

const lifecycle = ["discover", "prepare", "validate", "connect", "test", "monitor", "evidence", "dashboard"];

export default function AgentConectouPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/20 bg-slate-950/85 p-6 shadow-2xl shadow-cyan-950/25">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_12%_22%,rgba(245,158,11,0.12),transparent_34%)]" />
        <div className="relative space-y-4">
          <Badge className="border-cyan-300/40 bg-cyan-400/10 text-cyan-100">Agent Conectou · operational runtime</Badge>
          <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">Connectors without credential exposure</h1>
          <p className="max-w-4xl text-slate-300">Read-only GitHub and Vercel connectors remain visible while payment, database and backend write capabilities stay behind future operator-approved steps. This page intentionally has no credential form.</p>
        </div>
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
          <span>No credential UI, no payment capture and no destructive connector automation are enabled in this P0 runtime.</span>
        </CardContent>
      </Card>
    </div>
  );
}
