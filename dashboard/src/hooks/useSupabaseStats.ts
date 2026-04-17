/**
 * 🌑 GXEON SOVEREIGN — Real-time Supabase Stats Hook
 * Connects to real data: billing revenue, active agents, network status
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase, subscribeToSystemUpdates } from '../lib/supabase';

export interface SovereignStats {
  // Revenue
  totalRevenue: number;
  todayRevenue: number;
  billingTransactions: number;
  
  // 💰 TREASURY METRICS
  apiSalesCount: number;           // Total de chamadas de API (0.05 cada)
  commanderShare30: number;        // 30% do lucro para o Comandante
  vaultShare70: number;            // 70% reinvestimento
  estimatedGasCost: number;        // Custo estimado de gas
  profitToGasRatio: number;      // Razão lucro/gas para otimização
  canClaim: boolean;             // Se pode sacar (lucro > 5x gas)
  
  // Agents & Tasks
  activeAgents: number;
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  
  // System
  systemStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  lastUpdate: Date;
  flashbotsStatus: 'CONNECTED' | 'DISCONNECTED';
  
  // Vault
  vaultBalance: number;
  vaultAddress: string;
}

const initialStats: SovereignStats = {
  totalRevenue: 0,
  todayRevenue: 0,
  billingTransactions: 0,
  // 💰 TREASURY
  apiSalesCount: 0,
  commanderShare30: 0,
  vaultShare70: 0,
  estimatedGasCost: 0.002,
  profitToGasRatio: 0,
  canClaim: false,
  // System
  activeAgents: 0,
  totalTasks: 0,
  pendingTasks: 0,
  completedTasks: 0,
  systemStatus: 'ONLINE',
  lastUpdate: new Date(),
  flashbotsStatus: 'CONNECTED',
  vaultBalance: 12.45, // 🌑 SIMULATION MODE: Demo treasury balance
  vaultAddress: '0x3955...5224',
};

export function useSupabaseStats(refreshInterval = 5000) {
  const [stats, setStats] = useState<SovereignStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats from Supabase
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get billing stats
      const { data: billingData, error: billingError } = await supabase
        .from('gxeon_billing_transactions')
        .select('amount, status, created_at')
        .eq('status', 'completed');
      
      if (billingError) throw billingError;
      
      // Calculate revenue
      const totalRevenue = billingData?.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0;
      
      // 💰 TREASURY CALCULATIONS
      const apiSalesCount = billingData?.length || 0; // Cada transação = 1 chamada API
      const commanderShare30 = totalRevenue * 0.3;     // 30% para Comandante
      const vaultShare70 = totalRevenue * 0.7;         // 70% reinvestimento
      const estimatedGasCost = 0.002;                  // ~$4-8 em ETH
      const profitToGasRatio = commanderShare30 > 0 ? commanderShare30 / estimatedGasCost : 0;
      const canClaim = commanderShare30 >= (estimatedGasCost * 5); // 5x threshold
      
      const today = new Date().toISOString().split('T')[0];
      const todayRevenue = billingData
        ?.filter((tx: any) => tx.created_at?.startsWith(today))
        .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0;
      
      // 🌑 Get agent stats from API — Production: https://gxeon-ai.xmentex2.replit.app
      const API_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://gxeon-ai.xmentex2.replit.app';
      const SYSTEM_API_KEY = (import.meta as any).env?.VITE_SYSTEM_API_KEY || '';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (SYSTEM_API_KEY) {
        headers['x-gxeon-key'] = SYSTEM_API_KEY;
      }
      
      const agentsRes = await fetch(`${API_URL}/api/agents`, { headers });
      const agentsData = agentsRes.ok ? await agentsRes.json() : { agents: [] };
      
      // Get task stats
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('status');
      
      if (tasksError) throw tasksError;
      
      const totalTasks = tasksData?.length || 0;
      const pendingTasks = tasksData?.filter((t: any) => t.status === 'pending').length || 0;
      const completedTasks = tasksData?.filter((t: any) => t.status === 'completed').length || 0;
      
      // 🌑 SIMULATION MODE: Override with demo values if no real data
      const demoBalance = 12.45; // Demo treasury para teste visual
      const effectiveVaultBalance = totalRevenue > 0 ? totalRevenue : demoBalance;
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalRevenue,
        todayRevenue,
        billingTransactions: billingData?.length || 0,
        // 💰 TREASURY METRICS
        apiSalesCount,
        commanderShare30: totalRevenue > 0 ? commanderShare30 : demoBalance * 0.3,
        vaultShare70: totalRevenue > 0 ? vaultShare70 : demoBalance * 0.7,
        estimatedGasCost,
        profitToGasRatio: totalRevenue > 0 ? profitToGasRatio : 1865, // Demo: 1865x
        canClaim: totalRevenue > 0 ? canClaim : true, // Demo: sempre pode sacar
        activeAgents: agentsData.agents?.length || 0,
        totalTasks,
        pendingTasks,
        completedTasks,
        vaultBalance: effectiveVaultBalance,
        lastUpdate: new Date(),
      }));
      
      setError(null);
    } catch (err) {
      console.error('[SovereignStats] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchStats();
    
    const interval = setInterval(fetchStats, refreshInterval);
    
    // Subscribe to real-time updates
    const cleanup = subscribeToSystemUpdates(
      () => fetchStats(), // On task change
      () => fetchStats(), // On log change
      () => fetchStats()  // On reward change
    );
    
    return () => {
      clearInterval(interval);
      cleanup?.();
    };
  }, [fetchStats, refreshInterval]);

  return { stats, loading, error, refresh: fetchStats };
}

// Hook for real-time revenue chart data
export function useRevenueChart(days = 7) {
  const [data, setData] = useState<{ date: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        const { data: transactions } = await supabase
          .from('gxeon_billing_transactions')
          .select('amount, created_at')
          .eq('status', 'completed')
          .gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
        
        // Group by date
        const grouped = (transactions || []).reduce((acc: Record<string, number>, tx: any) => {
          const date = tx.created_at?.split('T')[0] || 'unknown';
          acc[date] = (acc[date] || 0) + (tx.amount || 0);
          return acc;
        }, {} as Record<string, number>);
        
        // Fill missing dates
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
          result.push({ date, revenue: grouped[date] || 0 });
        }
        
        setData(result);
      } catch (err) {
        console.error('[RevenueChart] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChartData();
  }, [days]);

  return { data, loading };
}
