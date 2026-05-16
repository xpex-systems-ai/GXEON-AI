import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import {
  Activity, CreditCard, DollarSign, Users, RefreshCw,
  TrendingUp, Key, Database, Clock, AlertCircle
} from "lucide-react";

type Transaction = {
  id: string;
  transaction_id: string;
  actor_code: string;
  base_amount: number;
  status: string;
  created_at: string;
  paid_at?: string;
  gateway_provider?: string;
};

type DashboardMetrics = {
  totalRevenue: number;
  revenueToday: number;
  totalTransactions: number;
  totalActors: number;
  activeApiKeys: number;
  conversionRate: number;
  avgTicket: number;
  pendingTransactions: number;
};

type DashboardData = {
  metrics: DashboardMetrics;
  latestTransactions: Transaction[];
  error: string | null;
  lastUpdated: Date | null;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    metrics: {
      totalRevenue: 0,
      revenueToday: 0,
      totalTransactions: 0,
      totalActors: 0,
      activeApiKeys: 0,
      conversionRate: 0,
      avgTicket: 0,
      pendingTransactions: 0,
    },
    latestTransactions: [],
    error: null,
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setData((prev) => ({ ...prev, error: null }));

    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error("Supabase environment variables not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Replit secrets.");
      }

      const supabase = createClient(url, key);
      const today = new Date().toISOString().split('T')[0];

      const [
        transactionsResult,
        paidTransactionsResult,
        todayRevenueResult,
        latestTransactionsResult,
        actorsResult,
        apiKeysResult,
        pendingResult,
      ] = await Promise.all([
        supabase.from("global_transactions").select("*", { count: "exact", head: true }),
        supabase.from("global_transactions").select("base_amount").eq("status", "PAID"),
        supabase.from("global_transactions").select("base_amount").eq("status", "PAID").gte("paid_at", today),
        supabase.from("global_transactions").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("actors").select("*", { count: "exact", head: true }),
        supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("global_transactions").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
      ]);

      const totalRevenue = paidTransactionsResult.data?.reduce((sum, tx) => sum + (tx.base_amount || 0), 0) || 0;
      const revenueToday = todayRevenueResult.data?.reduce((sum, tx) => sum + (tx.base_amount || 0), 0) || 0;
      const totalTransactions = transactionsResult.count || 0;
      const paidCount = paidTransactionsResult.data?.length || 0;
      const conversionRate = totalTransactions > 0 ? (paidCount / totalTransactions) * 100 : 0;
      const avgTicket = paidCount > 0 ? totalRevenue / paidCount : 0;

      setData({
        metrics: {
          totalRevenue,
          revenueToday,
          totalTransactions,
          totalActors: actorsResult.count || 0,
          activeApiKeys: apiKeysResult.count || 0,
          conversionRate,
          avgTicket,
          pendingTransactions: pendingResult.count || 0,
        },
        latestTransactions: latestTransactionsResult.data || [],
        error: null,
        lastUpdated: new Date(),
      });
    } catch (error) {
      setData((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to fetch data",
        lastUpdated: new Date(),
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    let interval: ReturnType<typeof setInterval>;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 30000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [fetchDashboardData, autoRefresh]);

  if (loading && !data.lastUpdated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GXEON Command Center</h1>
          <p className="text-muted-foreground">Real-time operating system control panel</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            Auto-refresh
          </div>
          <Button onClick={() => setAutoRefresh(!autoRefresh)} variant="outline" size="sm">
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button onClick={fetchDashboardData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {data.error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
          <p className="font-medium">Error: {data.error}</p>
          <p className="text-sm">Check your Supabase connection and try again.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(data.metrics.revenueToday)} today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">{data.metrics.pendingTransactions} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Avg: {formatCurrency(data.metrics.avgTicket)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.metrics.activeApiKeys}</div>
            <p className="text-xs text-muted-foreground">{data.metrics.totalActors} actors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Online</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest Transactions</CardTitle>
            <Badge variant="outline" className="text-xs">Live</Badge>
          </CardHeader>
          <CardContent>
            {data.latestTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No transactions found</p>
                <p className="text-xs text-muted-foreground mt-1">Data will appear when payments are processed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.latestTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium font-mono text-sm">{tx.transaction_id || tx.id.substring(0, 8)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{tx.actor_code}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(tx.base_amount)}</p>
                      <Badge
                        variant={tx.status === "PAID" ? "default" : tx.status === "PENDING" ? "secondary" : "destructive"}
                        className={`text-xs ${tx.status === "PAID" ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : tx.status === "PENDING" ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" : ""}`}
                      >
                        {tx.status === "PAID" && "✓ "}
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>System Activity</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-sm">Database connection: <span className="text-green-500 font-medium">Active</span></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <p className="text-sm">PIX Webhook: <span className="text-green-500 font-medium">Listening</span></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-sm">Auto-refresh: <span className="font-medium">{autoRefresh ? 'Enabled (30s)' : 'Disabled'}</span></p>
              </div>
              {data.lastUpdated && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <p className="text-sm text-muted-foreground">Last updated: {data.lastUpdated.toLocaleTimeString('pt-BR')}</p>
                </div>
              )}
              {data.error && (
                <div className="flex items-start gap-3 mt-4 p-3 bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm text-destructive font-medium">Connection Error</p>
                    <p className="text-xs text-destructive/80">{data.error}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
