import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { Database, RefreshCw, ShoppingCart, TrendingUp, AlertCircle } from "lucide-react";

type Dataset = { id: string; name: string; description: string; category: string; price: number; status: string; created_at: string; };
type Purchase = { dataset_id: string; status: string; amount: number; };
type DatasetWithAnalytics = Dataset & { sales_count: number; revenue: number; };

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchDatasets() {
    setLoading(true);
    setError(null);
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Supabase environment variables not configured");
      const supabase = createClient(url, key);
      const { data: datasetsData, error: dsError } = await supabase.from("marketplace_datasets").select("*").order("created_at", { ascending: false });
      if (dsError) throw dsError;
      const { data: purchasesData, error: pError } = await supabase.from("dataset_purchases").select("dataset_id, status, amount");
      if (pError) throw pError;
      const analytics = (datasetsData || []).map((ds: Dataset) => {
        const dsPurchases = (purchasesData || []).filter((p: Purchase) => p.dataset_id === ds.id && p.status === "paid");
        const revenue = dsPurchases.reduce((sum: number, p: Purchase) => sum + (p.amount || 0), 0);
        return { ...ds, sales_count: dsPurchases.length, revenue };
      });
      setDatasets(analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch datasets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDatasets(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const totalRevenue = datasets.reduce((sum, ds) => sum + ds.revenue, 0);
  const totalSales = datasets.reduce((sum, ds) => sum + ds.sales_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Datasets</h1>
          <p className="text-muted-foreground">Manage and monitor your marketplace datasets</p>
        </div>
        <Button onClick={fetchDatasets} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>
      {error && <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2"><AlertCircle className="h-4 w-4" /><p className="font-medium">{error}</p></div>}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Datasets</CardTitle><Database className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{datasets.length}</div><p className="text-xs text-muted-foreground">Active products</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Sales</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalSales}</div><p className="text-xs text-muted-foreground">Completed purchases</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Revenue</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div><p className="text-xs text-muted-foreground">From all datasets</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Dataset Performance</CardTitle></CardHeader>
        <CardContent>
          {datasets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No datasets found.</p>
          ) : (
            <div className="space-y-4">
              {datasets.map((ds) => (
                <div key={ds.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{ds.name}</p>
                      <Badge variant={ds.status === "active" ? "default" : "secondary"}>{ds.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{ds.category} • {formatCurrency(ds.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{ds.sales_count} sales</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(ds.revenue)} revenue</p>
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
