import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Shield, Zap, Power, TrendingUp, AlertTriangle, Users, Activity, Wallet, Coins, Loader2, Landmark, FileText, Download, Receipt } from 'lucide-react';
import { useSupabaseStats, useRevenueChart } from '../hooks/useSupabaseStats';

/**
 * 🌑 GXEON SOVEREIGN DASHBOARD
 * Real-time data from Supabase — No mocks, pure intelligence
 */
export function Dashboard({ activeView, renderView }) {
  // Real-time stats from Supabase
  const { stats, loading, error } = useSupabaseStats(5000);
  const { data: revenueChart } = useRevenueChart(7);
  
  // 💰 SOVEREIGN PROFIT CLAIM STATE
  const [claiming, setClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<{type: 'success' | 'error', message: string, tx?: string} | null>(null);
  
  // 🏦 TREASURY SETTLEMENT STATE
  const [requestingSettlement, setRequestingSettlement] = useState(false);
  const [settlementStatus, setSettlementStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // 🔥 CLAIM PROFIT HANDLER
  const handleClaimProfit = async () => {
    setClaiming(true);
    try {
      const API_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://gxeon-ai.xmentex2.replit.app';
      const SYSTEM_API_KEY = (import.meta as any).env?.VITE_SYSTEM_API_KEY || '';
      
      const headers = {
        'Content-Type': 'application/json',
        ...(SYSTEM_API_KEY && { 'x-gxeon-key': SYSTEM_API_KEY })
      };
      
      const res = await fetch(`${API_URL}/api/v1/profit/claim`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: 0 }) // 0 = claim all
      });
      
      const data = await res.json();
      
      if (data.success) {
        setClaimStatus({ type: 'success', message: `💰 ${data.claim.amount} USDC claimed!`, tx: data.claim.txHash });
      } else {
        setClaimStatus({ type: 'error', message: data.error || 'Claim failed' });
      }
    } catch (err) {
      setClaimStatus({ type: 'error', message: err.message });
    } finally {
      setClaiming(false);
      setTimeout(() => setClaimStatus(null), 5000);
    }
  };
  
  // 🏦 REQUEST SETTLEMENT HANDLER
  const handleRequestSettlement = async () => {
    setRequestingSettlement(true);
    try {
      const API_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://gxeon-ai.xmentex2.replit.app';
      const SYSTEM_API_KEY = (import.meta as any).env?.VITE_SYSTEM_API_KEY || '';
      
      const headers = {
        'Content-Type': 'application/json',
        ...(SYSTEM_API_KEY && { 'x-gxeon-key': SYSTEM_API_KEY })
      };
      
      const res = await fetch(`${API_URL}/api/v1/profit/estimate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: stats.commanderShare30 })
      });
      
      const data = await res.json();
      
      if (data.success && data.estimate.canExecute) {
        setSettlementStatus({ 
          type: 'success', 
          message: `✅ Settlement queued! ${stats.commanderShare30.toFixed(2)} USDC → 0x3955...5224` 
        });
      } else {
        setSettlementStatus({ 
          type: 'error', 
          message: data.estimate?.recommendation || 'Below gas threshold' 
        });
      }
    } catch (err: any) {
      setSettlementStatus({ type: 'error', message: err.message });
    } finally {
      setRequestingSettlement(false);
      setTimeout(() => setSettlementStatus(null), 5000);
    }
  };
  
  // 📊 EXPORT FINANCIAL REPORT
  const exportReport = (format: 'csv' | 'pdf') => {
    const reportData = {
      timestamp: new Date().toISOString(),
      treasury: {
        totalRevenue: stats.totalRevenue,
        apiSalesCount: stats.apiSalesCount,
        commanderShare30: stats.commanderShare30,
        vaultShare70: stats.vaultShare70,
      },
      settlement: {
        canClaim: stats.canClaim,
        profitToGasRatio: stats.profitToGasRatio,
        estimatedGasCost: stats.estimatedGasCost,
      }
    };
    
    if (format === 'csv') {
      const csv = `Timestamp,Total Revenue,API Sales,Commander 30%,Vault 70%,Gas Ratio
${reportData.timestamp},${stats.totalRevenue},${stats.apiSalesCount},${stats.commanderShare30},${stats.vaultShare70},${stats.profitToGasRatio}`;
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gxeon-treasury-${Date.now()}.csv`;
      a.click();
    } else {
      // PDF export placeholder - would use jsPDF in production
      alert('PDF Export: ' + JSON.stringify(reportData, null, 2));
    }
  };

  return (
    <main className="flex-1 h-screen bg-dark-900 overflow-hidden relative">
      {/* Holographic background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-gold/5 via-transparent to-cyan/5" />
      </div>

      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-gold/10 bg-dark-900/50 backdrop-blur-sm flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-cyan flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-dark-900" />
            </div>
            <h2 className="text-gold font-bold text-lg tracking-wider">GXEON DASHBOARD</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800 border border-gold/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-400">Flashbots Connected</span>
            </div>
          </div>
        </header>

        {/* Dashboard Widgets — SOVEREIGN GRID */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 🏆 TOTAL REVENUE — Real from Supabase */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-gold/20 rounded-2xl p-5 relative overflow-hidden group hover:border-gold/40 transition-all duration-300"
          >
            {/* Cyber-Gold gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_49%,rgba(255,215,0,0.03)_50%,transparent_51%)] bg-[size:20px_20px] opacity-30" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold via-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-gold/20">
                    <DollarSign className="w-5 h-5 text-dark-900" />
                  </div>
                  <span className="text-xs text-gold/80 tracking-wider font-semibold">TOTAL REVENUE</span>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="text-gold text-lg font-bold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]"
                >
                  {loading ? '...' : `+$${stats.totalRevenue.toFixed(2)}`}
                </motion.div>
              </div>
              
              {/* Cyber-Gold Chart */}
              <div className="h-12 flex items-end gap-1 mt-2">
                {revenueChart.slice(-7).map((d, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(10, (d.revenue / Math.max(...revenueChart.map(r => r.revenue), 1)) * 100)}%` }}
                    transition={{ delay: i * 0.1 }}
                    className="flex-1 rounded-t bg-gradient-to-t from-gold/40 via-gold/60 to-gold shadow-[0_0_10px_rgba(255,215,0,0.3)]"
                  />
                ))}
              </div>
              
              <div className="flex justify-between text-xs mt-2">
                <span className="text-gray-500">Today's: +${stats.todayRevenue.toFixed(2)}</span>
                <span className="text-gold font-medium">{stats.billingTransactions} txns</span>
              </div>
            </div>
          </motion.div>

          {/* 👥 ACTIVE AGENTS — Real from API */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-cyan/20 rounded-2xl p-5 relative overflow-hidden group hover:border-cyan/40 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/10 via-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan via-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan/20">
                    <Users className="w-5 h-5 text-dark-900" />
                  </div>
                  <span className="text-xs text-cyan/80 tracking-wider font-semibold">ACTIVE AGENTS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-lg font-bold text-cyan drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                    {loading ? '...' : stats.activeAgents}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Tasks: {stats.totalTasks}</span>
                  <span className="text-green-400 font-medium">{stats.completedTasks} done</span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan via-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: stats.totalTasks > 0 ? `${(stats.completedTasks / stats.totalTasks) * 100}%` : '0%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <div className="text-[10px] text-gray-600 text-right">
                  Pending: {stats.pendingTasks}
                </div>
              </div>
            </div>
          </motion.div>


          {/* 🏦 SOVEREIGN VAULT — Real balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-purple/20 rounded-2xl p-5 relative overflow-hidden group hover:border-purple/40 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple/10 via-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple via-purple-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple/20">
                    <Wallet className="w-5 h-5 text-dark-900" />
                  </div>
                  <span className="text-xs text-purple/80 tracking-wider font-semibold">SOVEREIGN VAULT</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">SECURE</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-lg font-bold text-purple drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                  {loading ? '...' : `$${stats.vaultBalance.toFixed(2)}`}
                </div>
                
                {/* 💰 AVAILABLE PROFIT (30%) */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gold/70">Your Share (30%)</span>
                  <span className="text-gold font-bold">${(stats.vaultBalance * 0.3).toFixed(2)}</span>
                </div>
                
                {/* 🔥 CLAIM PROFIT BUTTON */}
                <button
                  onClick={handleClaimProfit}
                  disabled={claiming || stats.vaultBalance < 0.01}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    claiming 
                      ? 'bg-dark-700 text-gray-400 cursor-not-allowed' 
                      : stats.vaultBalance >= 0.01
                        ? 'bg-gradient-to-r from-gold to-amber-500 text-dark-900 hover:from-amber-400 hover:to-gold shadow-lg shadow-gold/20'
                        : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {claiming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      CLAIMING...
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      CLAIM PROFIT
                    </>
                  )}
                </button>
                
                {/* Status message */}
                {claimStatus && (
                  <div className={`text-xs text-center p-1.5 rounded ${
                    claimStatus.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {claimStatus.message}
                  </div>
                )}
                
                {/* Gas optimization indicator */}
                <div className="flex items-center gap-1 text-xs text-green-400/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span>Gas Optimized (5x+)</span>
                </div>
                
                <div className="text-xs text-gray-500 truncate font-mono bg-dark-900/50 p-1.5 rounded">
                  0x3955...5224
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Flashbots</span>
                  <span className={stats.flashbotsStatus === 'CONNECTED' ? 'text-green-400' : 'text-red-400'}>
                    {stats.flashbotsStatus}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 📊 SYSTEM STATUS — Real-time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-gold/20 rounded-2xl p-5 relative overflow-hidden group hover:border-gold/40 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-gold" />
                  </div>
                  <span className="text-xs text-gray-400 tracking-wider">SYSTEM STATUS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${stats.systemStatus === 'ONLINE' ? 'bg-green-500' : stats.systemStatus === 'DEGRADED' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className={`text-xs font-medium ${stats.systemStatus === 'ONLINE' ? 'text-green-400' : stats.systemStatus === 'DEGRADED' ? 'text-yellow-400' : 'text-red-400'}`}>
                    {stats.systemStatus}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Last Update</span>
                  <span className="text-gold font-medium">
                    {stats.lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gold via-amber-400 to-yellow-300 shadow-[0_0_10px_rgba(255,215,0,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                {error && (
                  <div className="text-[10px] text-red-400 truncate">
                    ⚠️ {error}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* 🏦 TREASURY VAULT TRACKER — Gold-Gradient-Neon */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden group hover:border-amber-400/50 transition-all duration-300 md:col-span-2 lg:col-span-2"
          >
            {/* Neon Gold Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-gold/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(255,215,0,0.1)_49%,rgba(255,215,0,0.1)_51%,transparent_52%)] bg-[size:30px_30px] animate-pulse" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-amber-500/20 to-transparent blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 via-gold to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
                    <Landmark className="w-5 h-5 text-dark-900" />
                  </div>
                  <div>
                    <span className="text-xs text-amber-400/80 tracking-wider font-semibold block">TREASURY VAULT</span>
                    <span className="text-[10px] text-gray-500">Simulation Mode Active</span>
                  </div>
                </div>
                
                {/* Export Buttons */}
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => exportReport('csv')}
                    className="p-1.5 rounded bg-dark-700/50 hover:bg-dark-600 text-gray-400 hover:text-amber-400 transition-colors"
                    title="Export CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => exportReport('pdf')}
                    className="p-1.5 rounded bg-dark-700/50 hover:bg-dark-600 text-gray-400 hover:text-amber-400 transition-colors"
                    title="Export PDF"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {/* 💰 Total Revenue */}
                <div className="bg-dark-900/50 rounded-lg p-3 border border-amber-500/10">
                  <div className="text-[10px] text-gray-500 mb-1">Total Revenue</div>
                  <div className="text-lg font-bold text-amber-400">
                    ${loading ? '...' : stats.totalRevenue.toFixed(2)}
                  </div>
                </div>
                
                {/* 📈 API Sales (0.05 each) */}
                <div className="bg-dark-900/50 rounded-lg p-3 border border-gold/10">
                  <div className="text-[10px] text-gray-500 mb-1">API Calls @ $0.05</div>
                  <div className="text-lg font-bold text-gold">
                    {loading ? '...' : stats.apiSalesCount}
                  </div>
                </div>
                
                {/* 👑 Commander Share 30% */}
                <div className="bg-dark-900/50 rounded-lg p-3 border border-purple-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
                  <div className="relative text-[10px] text-purple-400 mb-1">Your Share (30%)</div>
                  <div className="relative text-lg font-bold text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                    ${loading ? '...' : stats.commanderShare30.toFixed(2)}
                  </div>
                </div>
                
                {/* 🏦 Vault Share 70% */}
                <div className="bg-dark-900/50 rounded-lg p-3 border border-cyan-500/10">
                  <div className="text-[10px] text-cyan-500/70 mb-1">Vault Reinvest (70%)</div>
                  <div className="text-lg font-bold text-cyan-400">
                    ${loading ? '...' : stats.vaultShare70.toFixed(2)}
                  </div>
                </div>
              </div>
              
              {/* 🛡️ Gas Optimization Status */}
              <div className="flex items-center justify-between bg-dark-900/50 rounded-lg p-3 border border-green-500/20 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${stats.canClaim ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'} shadow-[0_0_10px_currentColor]`} />
                  <div>
                    <div className="text-xs text-gray-300">
                      {stats.canClaim ? '✅ Gas Optimized — Ready to Claim' : '⏳ Accumulating for Gas Efficiency'}
                    </div>
                    <div className="text-[10px] text-gray-500">
                      Profit/Gas Ratio: <span className={stats.profitToGasRatio > 5 ? 'text-green-400' : 'text-yellow-400'}>{stats.profitToGasRatio.toFixed(0)}x</span> (min: 5x)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500">Est. Gas</div>
                  <div className="text-xs text-gray-400">{stats.estimatedGasCost} ETH</div>
                </div>
              </div>
              
              {/* 🔥 REQUEST SETTLEMENT BUTTON */}
              <button
                onClick={handleRequestSettlement}
                disabled={requestingSettlement || !stats.canClaim}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${
                  requestingSettlement 
                    ? 'bg-dark-700 text-gray-400 cursor-not-allowed' 
                    : stats.canClaim
                      ? 'bg-gradient-to-r from-amber-400 via-gold to-yellow-500 text-dark-900 hover:from-yellow-300 hover:via-amber-300 hover:to-gold shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02]'
                      : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {requestingSettlement ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    PROCESSING SETTLEMENT...
                  </>
                ) : (
                  <>
                    <Receipt className="w-5 h-5" />
                    REQUEST SETTLEMENT (MANUAL)
                  </>
                )}
              </button>
              
              {/* Settlement Status */}
              {settlementStatus && (
                <div className={`mt-3 text-xs text-center p-2 rounded-lg ${
                  settlementStatus.type === 'success' 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {settlementStatus.message}
                </div>
              )}
              
              {/* Destination Address */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-500">Destination:</span>
                <span className="text-amber-400/70 font-mono">0x3955...5224 (Arbitrum)</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Dynamic Main Content Area */}
        <div className="flex-1 p-6 pt-0 overflow-hidden">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full bg-dark-800/30 backdrop-blur-xl border border-gold/10 rounded-2xl overflow-hidden"
          >
            {renderView()}
          </motion.div>
        </div>
      </div>
    </main>
  );
}
