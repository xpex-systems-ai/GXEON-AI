import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { connectorGatewayProviders, type ConnectorGatewayStatus } from "@/data/connector-gateway";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Clock3, Eye, GitBranch, LockKeyhole, Plug, ShieldCheck, Wrench } from "lucide-react";

const connectorRoutes: Record<string, string> = {
  github: "/ops/connectors/github",
  vercel: "/ops/connectors/vercel",
  railway: "/ops/connectors/railway",
  supabase: "/ops/connectors/supabase",
  microsoft365: "/ops/connectors/m365",
};

const statusTone: Record<ConnectorGatewayStatus, string> = {
  CONNECTED_MANUAL: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  READY_TO_PREPARE: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  NEEDS_REVIEW: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  LOCKED: "border-stone-400/25 bg-stone-500/10 text-stone-200",
  FUTURE: "border-violet-300/25 bg-violet-400/10 text-violet-100",
};

const healthByStatus: Record<ConnectorGatewayStatus, string> = {
  CONNECTED_MANUAL: "Healthy",
  READY_TO_PREPARE: "Ready",
  NEEDS_REVIEW: "Review",
  LOCKED: "Locked",
  FUTURE: "Future",
};

export default function ConnectorGatewayPage() {
  const [location] = useLocation();

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-amber-300/15 bg-[#070707]/90 p-5 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-amber-300/30 bg-amber-400/10 text-amber-100"><Plug className="mr-1 h-3 w-3" /> Connector Hub</Badge>
              <Badge variant="outline" className="border-emerald-300/30 text-emerald-100"><ShieldCheck className="mr-1 h-3 w-3" /> Controlled</Badge>
              <Badge variant="outline" className="border-cyan-300/30 text-cyan-100">No activation</Badge>
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">Connectors</h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-white">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><p className="text-2xl font-black">5</p><p className="text-xs text-stone-400">Providers</p></div>
            <div className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-3"><p className="text-2xl font-black">2</p><p className="text-xs text-amber-100">Ready</p></div>
            <div className="rounded-2xl border border-stone-300/15 bg-stone-400/10 p-3"><p className="text-2xl font-black">2</p><p className="text-xs text-stone-300">Locked</p></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {connectorGatewayProviders.map((connector) => {
          const href = connectorRoutes[connector.id];
          const active = location === href;
          const connected = connector.status === "CONNECTED_MANUAL";
          return (
            <Link key={connector.id} href={href}>
              <Card
                className={cn(
                  "group h-full cursor-pointer overflow-hidden border-white/10 bg-[#090909]/85 text-white transition duration-200 hover:-translate-y-1 hover:border-amber-300/35 hover:bg-amber-400/[0.08] hover:shadow-[0_22px_55px_rgba(245,158,11,0.12)]",
                  active && "border-amber-300/45 bg-amber-400/10 shadow-[0_0_34px_rgba(245,158,11,0.16)]",
                  connected && "border-emerald-300/35",
                )}
              >
                <CardContent className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/20 bg-amber-400/10 text-amber-100">
                      {connector.id === "github" ? <GitBranch className="h-5 w-5" /> : <Plug className="h-5 w-5" />}
                    </div>
                    <Badge variant="outline" className={cn("border", statusTone[connector.status])}>{connector.status.replaceAll("_", " ")}</Badge>
                  </div>

                  <h2 className="mt-6 text-2xl font-black">{connector.name}</h2>
                  <div className="mt-5 grid gap-3 text-sm">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-stone-500">Health</span><span className="font-semibold">{healthByStatus[connector.status]}</span></div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-stone-500">Permissions</span><span className="font-semibold">Least</span></div>
                    <div className="flex items-center justify-between border-b border-white/10 pb-2"><span className="text-stone-500">Last Sync</span><span className="font-semibold">—</span></div>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
                    <Button variant="outline" size="sm" className="border-amber-300/25 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20"><Eye className="mr-1 h-3 w-3" />Open</Button>
                    <Button variant="outline" size="sm" className="border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"><CheckCircle2 className="mr-1 h-3 w-3" />Review</Button>
                    <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.035] text-stone-200 hover:bg-white/10"><Wrench className="mr-1 h-3 w-3" />Prepare</Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {["No OAuth", "No token input", "No API calls", "No database writes"].map((rule) => (
          <div key={rule} className="flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.06] p-4 text-sm font-semibold text-emerald-50">
            <LockKeyhole className="h-4 w-4 text-emerald-200" />
            {rule}
          </div>
        ))}
      </section>
    </div>
  );
}
