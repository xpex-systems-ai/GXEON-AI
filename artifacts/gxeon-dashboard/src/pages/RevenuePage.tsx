import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { DollarSign, TrendingUp, Users, RefreshCw, AlertCircle, BarChart3 } from "lucide-react";

type RevenueEvent = { id: string; event_type: string; amount: number; actor_code: string; metadata: Record<string, unknown>; created_at: string; };
type RevenueByActor = { actor_code: string; total: number; count: number; };

export default function RevenuePage() {
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchRevenueData() {
    setLoading(true);
    setError(null);
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Supabase environment variables not configured");
      const supabase = createClient(url, key);
      const { data, error } = await supabase.from("revenue_events").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch revenue data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRevenueData(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const totalRevenue = events.reduce((sum, e) => sum + (e.amount || 0), 0);
  const uniqueActors = new Set(events.map((e) => e.actor_code)).size;
  const byActor: Record<string, RevenueByActor> = {};
  events.forEach((e) => {
    if (!byActor[e.actor_code]) byActor[e.actor_code] = { actor_code: e.actor_code, total: 0, count: 0 };
    byActor[e.actor_code].total += e.amount || 0;
    byActor[e.actor_code].count += 1;
  });
  const actorStats = Object.values(byActor).sort((a, b) => b.total - a.total);
  const byType: Record<string, { count: number; amount: number }> = {};
  events.forEach((e) => {
    if (!byType[e.event_type]) byType[e.event_type] = { count: 0, amount: 0 };
    byType[e.event_type].count += 1;
    byType[e.event_type].amount += e.amount || 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue</h1>
          <p className="text-muted-foreground">Revenue events and actor performance</p>
        </div>
        <Button onClick={fetchRevenueData} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>
      {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" /><p className="font-medium">{error}</p></div>}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Revenue</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Events</CardTitle><BarChart3 className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{events.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Actors</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{uniqueActors}</div></CardContent></Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue by Actor</CardTitle></CardHeader>
          <CardContent>
            {actorStats.length === 0 ? <p className="text-muted-foreground text-center py-8">No data</p> : (
              <div className="space-y-4">
                {actorStats.map((a) => (
                  <div key={a.actor_code} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div><Badge variant="secondary">{a.actor_code}</Badge><p className="text-xs text-muted-foreground mt-1">{a.count} events</p></div>
                    <div className="text-right"><p className="font-medium">{formatCurrency(a.total)}</p></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Revenue by Event Type</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(byType).length === 0 ? <p className="text-muted-foreground text-center py-8">No data</p> : (
              <div className="space-y-4">
                {Object.entries(byType).sort(([, a], [, b]) => b.amount - a.amount).map(([type, stats]) => (
                  <div key={type} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div><Badge variant="outline">{type}</Badge><p className="text-xs text-muted-foreground mt-1">{stats.count} events</p></div>
                    <div className="text-right"><p className="font-medium">{formatCurrency(stats.amount)}</p></div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent Revenue Events</CardTitle></CardHeader>
        <CardContent>
          {events.length === 0 ? <p className="text-muted-foreground text-center py-8">No events found</p> : (
            <div className="space-y-3">
              {events.slice(0, 20).map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{e.event_type}</Badge><Badge variant="secondary" className="text-xs">{e.actor_code}</Badge></div>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(e.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-right"><p className="font-medium text-green-500">+{formatCurrency(e.amount)}</p></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
