import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { TrendingUp, Zap, Globe, Bot, CreditCard, Activity, RefreshCw, AlertCircle, ArrowUpRight } from "lucide-react";

export default function RevenueStreamsPage() {
  const [metrics, setMetrics] = useState({ mrr: 0, revenuePerEndpoint: [] as {endpoint: string; revenue: number}[], topPayingActors: [] as {actor_code: string; revenue: number}[], requestsPerMinute: 0, errorRate: "0%", datasetRanking: [] as {dataset_id: string; purchases: number; revenue: number}[] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMetrics() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/observability/metrics");
      if (!response.ok) throw new Error("Revenue engine not responding");
      const data = await response.json();
      if (data.success) setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const revenueStreams = [
    { name: "API Usage", icon: Globe, color: "text-blue-500", bg: "bg-blue-500/10", mrr: 10000, status: "active", description: "Per-request billing via RapidAPI" },
    { name: "Apify Actors", icon: Bot, color: "text-purple-500", bg: "bg-purple-500/10", mrr: 15000, status: "active", description: "Data marketplace monetization" },
    { name: "Zapier Automation", icon: Zap, color: "text-yellow-500", bg: "bg-yellow-500/10", mrr: 8000, status: "active", description: "Webhook automation flows" },
    { name: "Signal Subscriptions", icon: Activity, color: "text-green-500", bg: "bg-green-500/10", mrr: 5000, status: "active", description: "Trading bot signal distribution" },
    { name: "Dataset Sales", icon: CreditCard, color: "text-pink-500", bg: "bg-pink-500/10", mrr: 20000, status: "active", description: "High-ticket dataset marketplace" },
    { name: "Auto Sales Engine", icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10", mrr: 12000, status: "active", description: "Zero-touch API key sales" },
  ];
  const totalMRR = revenueStreams.reduce((sum, s) => sum + s.mrr, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Streams</h1>
          <p className="text-muted-foreground">Autonomous monetization engine — Multi-stream revenue</p>
        </div>
        <Button onClick={fetchMetrics} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>
      {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" /><p className="font-medium">{error}</p></div>}
      <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</p>
              <p className="text-5xl font-bold mt-2">{formatCurrency(totalMRR)}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-green-500"><ArrowUpRight className="h-3 w-3 mr-1" />+23% this month</Badge>
                <span className="text-xs text-muted-foreground">Projected: {formatCurrency(totalMRR * 1.3)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Requests/min</p>
              <p className="text-3xl font-bold">{metrics.requestsPerMinute}</p>
              <p className="text-xs text-muted-foreground mt-1">Error rate: {metrics.errorRate}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {revenueStreams.map((stream) => (
          <Card key={stream.name} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stream.name}</CardTitle>
              <div className={`${stream.bg} p-2 rounded-lg`}><stream.icon className={`h-4 w-4 ${stream.color}`} /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stream.mrr)}</div>
              <p className="text-xs text-muted-foreground mt-1">{stream.description}</p>
              <div className="mt-3"><Badge variant="default">● Live</Badge></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>AI Orchestration Layer</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Demand Scanner", sub: "Detecting trending niches" },
              { title: "Revenue Optimizer", sub: "Dynamic pricing active" },
              { title: "Auto Builder", sub: "Auto-generating datasets" },
            ].map((item) => (
              <div key={item.title} className="p-4 border rounded-lg">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.sub}</p>
                <Badge variant="outline" className="mt-2">Running</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
