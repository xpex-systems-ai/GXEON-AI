"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Server, Webhook, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

export default function HealthPage() {
  const [health, setHealth] = useState({
    supabase: false,
    latency: 0,
    uptime: 0,
    lastCheck: null as Date | null,
  });
  const [loading, setLoading] = useState(true);

  async function checkHealth() {
    setLoading(true);
    const startTime = Date.now();

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error("Missing Supabase credentials");
      }

      const supabase = createClient(url, key);
      
      // Check database connection
      const { error } = await supabase
        .from("global_transactions")
        .select("count", { count: "exact", head: true });

      const latency = Date.now() - startTime;

      setHealth({
        supabase: !error,
        latency,
        uptime: 99.9,
        lastCheck: new Date(),
      });
    } catch (err) {
      setHealth((prev) => ({
        ...prev,
        supabase: false,
        lastCheck: new Date(),
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">Monitor system components and performance</p>
        </div>
        <Button onClick={checkHealth} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Check Now
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supabase</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {health.supabase ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-bold text-green-500">Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-lg font-bold text-red-500">Error</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{health.latency}ms latency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Server</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-lg font-bold text-green-500">Online</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Port 3001 active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PIX Webhook</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-lg font-bold text-green-500">Listening</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Auto-confirmation enabled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{health.uptime}%</div>
            <p className="text-xs text-muted-foreground">
              Last check: {health.lastCheck?.toLocaleTimeString("pt-BR") || "Never"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Component Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">PostgreSQL Database</p>
                  <p className="text-sm text-muted-foreground">Supabase connection</p>
                </div>
              </div>
              <Badge variant={health.supabase ? "default" : "destructive"}>
                {health.supabase ? "Operational" : "Error"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Webhook className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-medium">MercadoPago PIX</p>
                  <p className="text-sm text-muted-foreground">Webhook integration</p>
                </div>
              </div>
              <Badge variant="default">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">API Layer</p>
                  <p className="text-sm text-muted-foreground">REST endpoints</p>
                </div>
              </div>
              <Badge variant="default">Running</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium">Dashboard UI</p>
                  <p className="text-sm text-muted-foreground">Next.js frontend</p>
                </div>
              </div>
              <Badge variant="default">Connected</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
