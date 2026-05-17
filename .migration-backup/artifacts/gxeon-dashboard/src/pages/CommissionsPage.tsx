import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import { Wallet, Users, TrendingUp, RefreshCw, AlertCircle, Percent } from "lucide-react";

type ActorWallet = {
  id: string;
  actor_code: string;
  balance: number;
  total_earned: number;
  commission_rate: number;
  updated_at: string;
};

export default function CommissionsPage() {
  const [wallets, setWallets] = useState<ActorWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchWallets() {
    setLoading(true);
    setError(null);
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error("Supabase environment variables not configured");
      const supabase = createClient(url, key);
      const { data, error } = await supabase.from("actor_wallets").select("*").order("total_earned", { ascending: false });
      if (error) throw error;
      setWallets(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch wallets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchWallets(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
  const totalEarned = wallets.reduce((sum, w) => sum + (w.total_earned || 0), 0);
  const avgCommission = wallets.length > 0 ? totalEarned / wallets.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commissions</h1>
          <p className="text-muted-foreground">Actor wallet balances and commission tracking</p>
        </div>
        <Button onClick={fetchWallets} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /><p className="font-medium">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{wallets.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{formatCurrency(totalEarned)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Commission</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(avgCommission)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Actor Wallet Balances</CardTitle></CardHeader>
        <CardContent>
          {wallets.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No wallets found</p>
          ) : (
            <div className="space-y-4">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{wallet.actor_code}</Badge>
                      <span className="text-sm text-muted-foreground">{wallet.commission_rate * 100}% rate</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Updated: {new Date(wallet.updated_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(wallet.balance)}</p>
                    <p className="text-sm text-muted-foreground">Earned: {formatCurrency(wallet.total_earned)}</p>
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
