"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Terminal, RefreshCw, Download, AlertCircle, Info, AlertTriangle, Search } from "lucide-react";

type LogEntry = {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
};

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Simulated logs for demonstration
  useEffect(() => {
    const generateInitialLogs = (): LogEntry[] => [
      {
        id: "1",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: "info",
        source: "server",
        message: "GXEON Production Server v2.0 started on port 3001",
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 3500000).toISOString(),
        level: "info",
        source: "database",
        message: "Supabase connection established successfully",
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 3400000).toISOString(),
        level: "info",
        source: "webhook",
        message: "PIX webhook listener activated",
      },
      {
        id: "4",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        level: "info",
        source: "payment",
        message: "Transaction GX1777855493643 created - R$ 49.90",
        metadata: { txId: "GX1777855493643", amount: 49.90 },
      },
      {
        id: "5",
        timestamp: new Date(Date.now() - 1700000).toISOString(),
        level: "info",
        source: "webhook",
        message: "PIX payment confirmed via webhook",
      },
      {
        id: "6",
        timestamp: new Date(Date.now() - 1600000).toISOString(),
        level: "info",
        source: "payment",
        message: "Transaction status updated: PENDING → PAID",
      },
      {
        id: "7",
        timestamp: new Date(Date.now() - 1500000).toISOString(),
        level: "info",
        source: "commission",
        message: "Commission applied: R$ 4.99 to actor wallet",
      },
      {
        id: "8",
        timestamp: new Date(Date.now() - 1400000).toISOString(),
        level: "info",
        source: "api_keys",
        message: "API key activated: gx_test_9713...",
      },
      {
        id: "9",
        timestamp: new Date(Date.now() - 600000).toISOString(),
        level: "info",
        source: "dashboard",
        message: "Dashboard connected to production API",
      },
      {
        id: "10",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        level: "warning",
        source: "health",
        message: "High latency detected in database queries (>500ms)",
      },
      {
        id: "11",
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: "info",
        source: "revenue",
        message: "Revenue summary updated: R$ 44.91 total",
      },
    ];

    setLogs(generateInitialLogs());

    // Simulate live log streaming
    const interval = setInterval(() => {
      const sources = ["server", "database", "webhook", "payment", "api_keys", "revenue"];
      const messages = [
        "Health check passed",
        "Auto-refresh triggered",
        "Database query executed",
        "Cache invalidated",
        "Metrics updated",
      ];

      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: "info",
        source: sources[Math.floor(Math.random() * sources.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
      };

      setLogs((prev) => [...prev.slice(-99), newLog]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter =
      filter === "" ||
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.source.toLowerCase().includes(filter.toLowerCase());

    const matchesLevel = levelFilter === "all" || log.level === levelFilter;

    return matchesFilter && matchesLevel;
  });

  function exportLogs() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gxeon-logs-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getLevelIcon(level: string) {
    switch (level) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  }

  function getLevelColor(level: string) {
    switch (level) {
      case "error":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">Real-time system activity monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 rounded-md border bg-background"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
        <Button
          variant={autoScroll ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoScroll(!autoScroll)}
        >
          {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Live Log Stream
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {filteredLogs.length} entries
            </Badge>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="font-mono text-sm space-y-2 max-h-[600px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No logs matching the current filter
              </p>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 p-2 rounded-md border ${getLevelColor(
                    log.level
                  )}`}
                >
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString("pt-BR")}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {log.source}
                      </Badge>
                    </div>
                    <p className="mt-1">{log.message}</p>
                    {log.metadata && (
                      <pre className="mt-2 text-xs bg-black/20 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
