"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { Activity, CreditCard, DollarSign, Users, RefreshCw } from "lucide-react";

type Transaction = {
  id: string;
  external_reference: string;
  actor_code: string;
  amount: number;
  status: string;
  created_at: string;
};

type DashboardData = {
  totalTransactions: number;
  totalRevenue: number;
  latestTransactions: Transaction[];
  totalActors: number;
  error: string | null;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    totalTransactions: 0,
    totalRevenue: 0,
    latestTransactions: [],
    totalActors: 0,
    error: null,
  });
  const [loading, setLoading] = useState(true);

  async function fetchDashboardData() {
    setLoading(true);
    setData((prev) => ({ ...prev, error: null }));

    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        throw new Error("Supabase environment variables not configured");
      }

      const supabase = createClient(url, key);

      const [
        transactionsResult,
        revenueResult,
        latestTransactionsResult,
        actorsResult,
      ] = await Promise.all([
        supabase.from("transactions").select("*", { count: "exact", head: true }),
        supabase.from("transactions").select("amount").eq("status", "PAID"),
        supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("actors").select("*", { count: "exact", head: true }),
      ]);

      const totalRevenue =
        revenueResult.data?.reduce((sum, tx) => sum + (tx.amount || 0), 0) || 0;

      setData({
        totalTransactions: transactionsResult.count || 0,
        totalRevenue,
        latestTransactions: latestTransactionsResult.data || [],
        totalActors: actorsResult.count || 0,
        error: null,
      });
    } catch (error) {
      console.error("[Dashboard] Error fetching data:", error);
      setData((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to fetch data",
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of your GXEON system
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
            <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">All time revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalActors}</div>
            <p className="text-xs text-muted-foreground">Active actors</p>
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

      <Card>
        <CardHeader>
          <CardTitle>Latest Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.latestTransactions.length === 0 ? (
            <p className="text-muted-foreground">No transactions found</p>
          ) : (
            <div className="space-y-4">
              {data.latestTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">{tx.external_reference || tx.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {tx.actor_code} • {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(tx.amount)}</p>
                    <p
                      className={`text-xs ${
                        tx.status === "PAID"
                          ? "text-green-500"
                          : tx.status === "PENDING"
                          ? "text-yellow-500"
                          : "text-red-500"
                      }`}
                    >
                      {tx.status}
                    </p>
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
