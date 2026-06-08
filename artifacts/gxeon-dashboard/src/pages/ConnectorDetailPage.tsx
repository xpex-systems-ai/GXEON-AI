import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { connectorGatewayProviders, type ConnectorGatewayId, type ConnectorGatewayStatus } from "@/data/connector-gateway";
import { cn } from "@/lib/utils";
import { Activity, ArrowRight, CheckCircle2, Clock3, LockKeyhole, Plug, ShieldCheck } from "lucide-react";

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

export default function ConnectorDetailPage({ connectorId }: { connectorId: ConnectorGatewayId }) {
  const connector = connectorGatewayProviders.find((item) => item.id === connectorId) ?? connectorGatewayProviders[0];

  const widgets = [
    { label: "Connection Status", value: connector.status.replaceAll("_", " "), icon: Plug },
    { label: "Security Boundary", value: "Manual", icon: ShieldCheck },
    { label: "Last Activity", value: "—", icon: Clock3 },
    { label: "Next Action", value: connector.buttonLabel, icon: ArrowRight },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-amber-300/15 bg-[#070707]/90 p-5 shadow-2xl shadow-black/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge variant="outline" className={cn("border", statusTone[connector.status])}>{connector.status.replaceAll("_", " ")}</Badge>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">{connector.name}</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 text-white">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><p className="text-xs uppercase tracking-[0.22em] text-stone-500">Status</p><p className="text-lg font-black">{connector.status.replaceAll("_", " ")}</p></div>
            <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3"><p className="text-xs uppercase tracking-[0.22em] text-emerald-100/70">Health</p><p className="text-lg font-black">{healthByStatus[connector.status]}</p></div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="border border-white/10 bg-white/[0.035]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {widgets.map((widget) => {
            const Icon = widget.icon;
            return (
              <Card key={widget.label} className="border-white/10 bg-[#090909]/85 text-white transition hover:-translate-y-1 hover:border-amber-300/30 hover:bg-amber-400/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-amber-200" />
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  </div>
                  <p className="mt-6 text-xs uppercase tracking-[0.25em] text-stone-500">{widget.label}</p>
                  <p className="mt-2 text-2xl font-black">{widget.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="permissions" className="grid gap-3 md:grid-cols-3">
          {["Read-only", "Least privilege", "Server-side only"].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-4 text-cyan-50">
              <CheckCircle2 className="h-4 w-4 text-cyan-200" />
              <span className="font-semibold">{item}</span>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="readiness" className="grid gap-3 md:grid-cols-4">
          {connector.activationSteps.map((step) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm font-semibold text-white">{step}</div>
          ))}
        </TabsContent>

        <TabsContent value="activity" className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><Activity className="h-5 w-5 text-amber-200" /><span className="font-bold">No sync events</span></div>
            <LockKeyhole className="h-4 w-4 text-emerald-200" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
