import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { connectorGatewayProviders, ecosystemReadiness } from "@/data/connector-gateway";
import { Activity, Database, Github, Server, ShieldCheck } from "lucide-react";

const iconById = {
  github: Github,
  vercel: Server,
  railway: Activity,
  supabase: Database,
  microsoft365: ShieldCheck,
} as const;

export default function HealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge className="border-cyan-300/30 bg-cyan-400/10 text-cyan-100">System Health Center</Badge>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Connector Health</h1>
        <p className="text-muted-foreground">Health scores remain zero until real connector heartbeats, syncs and backend telemetry exist.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Global Health Score</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{ecosystemReadiness.globalHealthScore}%</div><p className="text-xs text-muted-foreground">EMPTY_REAL_DATA</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Connected</CardTitle><ShieldCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{ecosystemReadiness.connected}</div><p className="text-xs text-muted-foreground">real integrations</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ready</CardTitle><Server className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{ecosystemReadiness.ready}</div><p className="text-xs text-muted-foreground">operator cutover surfaces</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Operational Uptime</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-bold">not measured</div><p className="text-xs text-muted-foreground">requires first real heartbeat</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Component Status</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connectorGatewayProviders.map((connector) => {
              const Icon = iconById[connector.id];
              return (
                <div key={connector.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div><p className="font-medium">{connector.name} Health</p><p className="text-sm text-muted-foreground">last sync: {connector.lastSync ?? "never"}</p></div>
                  </div>
                  <Badge variant="outline">{connector.healthScore}% · {connector.status.replaceAll("_", " ")}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
