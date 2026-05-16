import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Terminal, RefreshCw, AlertCircle, Info, AlertTriangle, Search } from "lucide-react";

type LogEntry = { id: string; timestamp: string; level: "info" | "warning" | "error"; source: string; message: string; };

const generateInitialLogs = (): LogEntry[] => [
  { id: "1", timestamp: new Date(Date.now() - 3600000).toISOString(), level: "info", source: "server", message: "GXEON Dashboard started" },
  { id: "2", timestamp: new Date(Date.now() - 3500000).toISOString(), level: "info", source: "database", message: "Supabase connection established" },
  { id: "3", timestamp: new Date(Date.now() - 3400000).toISOString(), level: "info", source: "webhook", message: "PIX webhook listener activated" },
  { id: "4", timestamp: new Date(Date.now() - 1800000).toISOString(), level: "info", source: "payment", message: "Transaction GX1777 created - R$ 49.90" },
  { id: "5", timestamp: new Date(Date.now() - 1700000).toISOString(), level: "info", source: "webhook", message: "PIX payment confirmed via webhook" },
  { id: "6", timestamp: new Date(Date.now() - 1600000).toISOString(), level: "info", source: "payment", message: "Transaction status updated: PENDING → PAID" },
  { id: "7", timestamp: new Date(Date.now() - 1500000).toISOString(), level: "info", source: "commission", message: "Commission applied: R$ 4.99 to actor wallet" },
  { id: "8", timestamp: new Date(Date.now() - 900000).toISOString(), level: "warning", source: "api", message: "Rate limit warning for API key GX_PRO_001" },
  { id: "9", timestamp: new Date(Date.now() - 600000).toISOString(), level: "info", source: "system", message: "Auto-refresh cycle completed" },
  { id: "10", timestamp: new Date(Date.now() - 300000).toISOString(), level: "info", source: "database", message: "Dashboard metrics synced successfully" },
];

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(generateInitialLogs);
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    const matchLevel = levelFilter === "all" || log.level === levelFilter;
    const matchSearch = !filter || log.message.toLowerCase().includes(filter.toLowerCase()) || log.source.toLowerCase().includes(filter.toLowerCase());
    return matchLevel && matchSearch;
  });

  function addLog() {
    const sources = ["server", "database", "webhook", "payment", "api", "commission"];
    const messages = ["Heartbeat check passed", "Metrics updated", "Connection pool healthy", "Cache refreshed", "Background job completed"];
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      level: "info",
      source: sources[Math.floor(Math.random() * sources.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
    };
    setLogs((prev) => [...prev, newLog]);
  }

  const levelIcon = (level: string) => {
    if (level === "error") return <AlertCircle className="h-3 w-3" />;
    if (level === "warning") return <AlertTriangle className="h-3 w-3" />;
    return <Info className="h-3 w-3" />;
  };

  const levelColor = (level: string) => {
    if (level === "error") return "text-red-500";
    if (level === "warning") return "text-yellow-500";
    return "text-blue-500";
  };

  const levelBg = (level: string) => {
    if (level === "error") return "bg-red-500/10 text-red-500";
    if (level === "warning") return "bg-yellow-500/10 text-yellow-500";
    return "bg-blue-500/10 text-blue-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">Monitor system events and activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={addLog} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Simulate Log</Button>
          <Button onClick={() => setAutoScroll(!autoScroll)} variant={autoScroll ? "default" : "outline"} size="sm">Auto-scroll: {autoScroll ? "On" : "Off"}</Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          {["all", "info", "warning", "error"].map((level) => (
            <Button key={level} variant={levelFilter === level ? "default" : "outline"} size="sm" onClick={() => setLevelFilter(level)}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" />Live Log Stream ({filteredLogs.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                <span className="text-muted-foreground text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString("pt-BR")}</span>
                <span className={`${levelColor(log.level)} flex items-center gap-1`}>{levelIcon(log.level)}</span>
                <Badge variant="outline" className={`text-xs px-1 py-0 ${levelBg(log.level)}`}>{log.source}</Badge>
                <span className="text-foreground">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
