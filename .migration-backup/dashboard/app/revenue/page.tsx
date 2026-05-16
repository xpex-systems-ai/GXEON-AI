"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { DollarSign, TrendingUp, Users, RefreshCw, AlertCircle, BarChart3 } from "lucide-react";

type RevenueEvent = {
  id: string;
  event_type: string;
  amount: number;
  actor_code: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type RevenueByActor = {
  actor_code: string;
  total: number;
  count: number;
};

export default function RevenuePage() {
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchRevenueData() {
    setLoading(true);
    setError(null);

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error("Supabase environment variables not configured");
      }

      const supabase = createClient(url, key);

      const { data, error } = await supabase
        .from("revenue_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      setEvents(data || []);
    } catch (err) {
      console.error("[Revenue] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch revenue data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRevenueData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const totalRevenue = events.reduce((sum, e) => sum + (e.amount || 0), 0);
  const eventCount = events.length;
  const uniqueActors = new Set(events.map((e) => e.actor_code)).size;

  // Group by actor
  const byActor: Record<string, RevenueByActor> = {};
  events.forEach((e) => {
    if (!byActor[e.actor_code]) {
      byActor[e.actor_code] = { actor_code: e.actor_code, total: 0, count: 0 };
    }
    byActor[e.actor_code].total += e.amount || 0;
    byActor[e.actor_code].count += 1;
  });

  const actorStats = Object.values(byActor).sort((a, b) => b.total - a.total);

  // Group by event type
  const byType: Record<string, { count: number; amount: number }> = {};
  events.forEach((e) => {
    if (!byType[e.event_type]) {
      byType[e.event_type] = { count: 0, amount: 0 };
    }
    byType[e.event_type].count += 1;
    byType[e.event_type].amount += e.amount || 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Analytics</h1>
          <p className="text-muted-foreground">Track revenue events and commissions</p>
        </div>
        <Button onClick={fetchRevenueData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Events</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Actors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueActors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg per Event</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(eventCount > 0 ? totalRevenue / eventCount : 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Actor</CardTitle>
          </CardHeader>
          <CardContent>
            {actorStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No revenue events found</p>
            ) : (
              <div className="space-y-3">
                {actorStats.slice(0, 10).map((actor) => (
                  <div
                    key={actor.actor_code}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <Badge variant="secondary">{actor.actor_code}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{actor.count} events</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(actor.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(byType).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No revenue data available</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(byType)
                  .sort(([, a], [, b]) => b.amount - a.amount)
                  .map(([type, stats]) => (
                    <div key={type} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <Badge variant="outline" className="capitalize">
                          {type.replace(/_/g, " ")}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{stats.count} events</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(stats.amount)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Revenue Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No recent events</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 20).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {event.event_type}
                    </Badge>
                    <span className="text-muted-foreground">{event.actor_code}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{formatCurrency(event.amount)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
