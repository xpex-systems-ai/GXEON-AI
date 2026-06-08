import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { connectorGatewayProviders, type ConnectorGatewayId, type ConnectorGatewayStatus } from "@/data/connector-gateway";
import { cn } from "@/lib/utils";
import { Activity, ArrowRight, CheckCircle2, Clock3, KeyRound, LockKeyhole, Plug, ShieldCheck } from "lucide-react";
import { FaMicrosoft } from "react-icons/fa";
import { SiGithub, SiRailway, SiSupabase, SiVercel } from "react-icons/si";

const statusTone: Record<ConnectorGatewayStatus, string> = {
  NOT_CONFIGURED: "border-stone-400/25 bg-stone-500/10 text-stone-200",
  READY: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  CONNECTING: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
  CONNECTED: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  ERROR: "border-red-300/30 bg-red-400/10 text-red-100",
  LOCKED: "border-stone-400/25 bg-stone-500/10 text-stone-200",
};

const brandIcon: Record<ConnectorGatewayId, typeof SiGithub> = {
  github: SiGithub,
  vercel: SiVercel,
  railway: SiRailway,
  supabase: SiSupabase,
  microsoft365: FaMicrosoft,
};

export default function ConnectorDetailPage({ connectorId }: { connectorId: ConnectorGatewayId }) {
  const connector = connectorGatewayProviders.find((item) => item.id === connectorId) ?? connectorGatewayProviders[0];
  const BrandIcon = brandIcon[connector.id];

  const widgets = [
    { label: "Connection Status", value: connector.status.replaceAll("_", " "), icon: Plug },
    { label: "Health Score", value: `${connector.healthScore}%`, icon: Activity },
    { label: "Last Sync", value: connector.lastSync ?? "never", icon: Clock3 },
    { label: "Credential Indicator", value: connector.credentialIndicator.replaceAll("_", " "), icon: KeyRound },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-amber-300/15 bg-[#070707]/90 p-5 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("border", statusTone[connector.status])}>{connector.status.replaceAll("_", " ")}</Badge>
              <Badge variant="outline" className="border-emerald-300/30 text-emerald-100"><ShieldCheck className="mr-1 h-3 w-3" /> backend credentials only</Badge>
            </div>
            <div className="mt-4 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white text-black"><BrandIcon className="h-9 w-9" /></div>
              <div><h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">{connector.name}</h1><p className="mt-2 text-stone-400">{connector.purpose}</p></div>
            </div>
          </div>
          <Button className="bg-amber-300 text-stone-950 hover:bg-amber-200" disabled={connector.status === "LOCKED"}>{connector.buttonLabel}<ArrowRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {widgets.map((widget) => {
          const Icon = widget.icon;
          return <Card key={widget.label} className="border-white/10 bg-[#090909]/85 text-white"><CardContent className="p-5"><Icon className="h-5 w-5 text-amber-200" /><p className="mt-5 text-xs uppercase tracking-[0.22em] text-stone-500">{widget.label}</p><p className="mt-2 text-lg font-black">{widget.value}</p></CardContent></Card>;
        })}
      </section>

      <Tabs defaultValue="ready" className="space-y-4">
        <TabsList className="bg-white/[0.04] text-stone-300"><TabsTrigger value="ready">Ready Screen</TabsTrigger><TabsTrigger value="health">Health</TabsTrigger><TabsTrigger value="security">Security</TabsTrigger><TabsTrigger value="activity">Activity</TabsTrigger></TabsList>

        <TabsContent value="ready" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-white">
          <h2 className="text-lg font-bold">{connector.name} Ready Screen</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {connector.readyScreen.map((item) => <div key={item.label} className="rounded-2xl border border-white/10 bg-[#090909]/80 p-4"><div className="flex items-center justify-between gap-3"><span className="font-semibold">{item.label}</span><Badge variant="outline" className={cn("border", statusTone[item.state])}>{item.state.replaceAll("_", " ")}</Badge></div><p className="mt-3 text-sm text-stone-400">{item.value}</p></div>)}
          </div>
        </TabsContent>

        <TabsContent value="health" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-white">
          <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-white/10 p-4"><p className="text-stone-500">Project Health</p><p className="text-2xl font-black">{connector.healthScore}%</p></div><div className="rounded-2xl border border-white/10 p-4"><p className="text-stone-500">Uptime</p><p className="text-2xl font-black">{connector.uptime}</p></div><div className="rounded-2xl border border-white/10 p-4"><p className="text-stone-500">Last Sync</p><p className="text-2xl font-black">{connector.lastSync ?? "never"}</p></div></div>
        </TabsContent>

        <TabsContent value="security" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-white">
          <div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4"><LockKeyhole className="h-5 w-5 text-emerald-100" /><p className="mt-3 font-bold">{connector.credentialLabel}</p></div>{connector.risks.map((risk) => <div key={risk} className="rounded-2xl border border-white/10 p-4 text-sm text-stone-300">{risk}</div>)}</div>
        </TabsContent>

        <TabsContent value="activity" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-white">
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-stone-400">EMPTY_REAL_DATA: nenhuma ação de operador, conexão, deploy ou sincronização real registrada para {connector.name}.</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
