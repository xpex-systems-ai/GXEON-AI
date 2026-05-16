import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { CreditCard, RefreshCw, AlertCircle, Search, Filter } from "lucide-react";

type Transaction = {
  id: string;
  transaction_id: string;
  actor_code: string;
  base_amount: number;
  status: string;
  gateway_provider: string;
  external_reference: string;
  created_at: string;
  paid_at?: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Supabase environment variables not configured");
      const supabase = createClient(url, key);
      // @ts-ignore
      let query = supabase.from("global_transactions").select("*").order("created_at", { ascending: false }).limit(100);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTransactions(); }, [statusFilter]);

  const filteredTransactions = transactions.filter((tx) => {
    const searchTerm = filter.toLowerCase();
    return (
      tx.transaction_id?.toLowerCase().includes(searchTerm) ||
      tx.actor_code?.toLowerCase().includes(searchTerm) ||
      tx.status?.toLowerCase().includes(searchTerm)
    );
  });

  const statusCounts = {
    all: transactions.length,
    PAID: transactions.filter((t) => t.status === "PAID").length,
    PENDING: transactions.filter((t) => t.status === "PENDING").length,
    FAILED: transactions.filter((t) => t.status === "FAILED").length,
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Monitor all payment transactions</p>
        </div>
        <Button onClick={fetchTransactions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /><p className="font-medium">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "All", count: statusCounts.all, filter: "all", color: "" },
          { label: "Paid", count: statusCounts.PAID, filter: "PAID", color: "text-green-500" },
          { label: "Pending", count: statusCounts.PENDING, filter: "PENDING", color: "text-yellow-500" },
          { label: "Failed", count: statusCounts.FAILED, filter: "FAILED", color: "text-red-500" },
        ].map((s) => (
          <Card key={s.filter} className={`cursor-pointer ${statusFilter === s.filter ? "ring-2 ring-primary" : ""}`} onClick={() => setStatusFilter(s.filter)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search transactions..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10 w-64" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setStatusFilter("all")}>
              <Filter className="h-4 w-4 mr-2" />Reset Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No transactions found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4"><code className="font-mono text-xs">{tx.transaction_id || tx.id.substring(0, 8)}</code></td>
                      <td className="py-3 px-4"><Badge variant="secondary">{tx.actor_code}</Badge></td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(tx.base_amount)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={tx.status === "PAID" ? "default" : "secondary"} className={tx.status === "PAID" ? "bg-green-500/10 text-green-500" : tx.status === "PENDING" ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
