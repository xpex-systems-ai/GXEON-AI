import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Activity, Wifi, WifiOff } from "lucide-react";

export function Topbar() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.warn("[Topbar] Supabase not configured");
      return;
    }

    const supabase = createClient(url, key);

    async function fetchTotalRevenue() {
      const { data } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'PAID');

      if (data) {
        const total = data.reduce((sum, tx) => sum + (tx.amount || 0), 0);
        setTotalRevenue(total);
      }
    }

    fetchTotalRevenue();

    const channel = supabase
      .channel('dashboard-topbar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchTotalRevenue();
          setLastUpdate(new Date());
        }
      )
      .subscribe((status: string) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected ? "LIVE" : "OFFLINE"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Last update: {lastUpdate.toLocaleTimeString()}
        </span>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
          <Activity className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}
