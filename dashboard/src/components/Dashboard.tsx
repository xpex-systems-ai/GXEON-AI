import { motion } from 'framer-motion';
import { DollarSign, Shield, Zap, Power, TrendingUp, AlertTriangle, Users, Activity, Wallet } from 'lucide-react';
import { useSupabaseStats, useRevenueChart } from '../hooks/useSupabaseStats';

/**
 * 🌑 GXEON SOVEREIGN DASHBOARD
 * Real-time data from Supabase — No mocks, pure intelligence
 */
export function Dashboard({ activeView, renderView }) {
  // Real-time stats from Supabase
  const { stats, loading, error } = useSupabaseStats(5000);
  const { data: revenueChart } = useRevenueChart(7);

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
              
              <div className="space-y-2">
                <div className="text-lg font-bold text-purple drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                  {loading ? '...' : `$${stats.vaultBalance.toFixed(2)}`}
                </div>
                <div className="text-xs text-gray-500 truncate font-mono bg-dark-900/50 p-1.5 rounded">
                  {stats.vaultAddress}
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
