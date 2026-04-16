import { motion } from 'framer-motion';
import { DollarSign, Shield, Zap, Power, TrendingUp, AlertTriangle } from 'lucide-react';

export function Dashboard({ activeView, renderView }) {
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

        {/* Dashboard Widgets */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Live Yield Ticker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-gold/20 rounded-2xl p-5 relative overflow-hidden group hover:border-gold/40 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-gold" />
                  </div>
                  <span className="text-xs text-gray-400 tracking-wider">LIVE YIELD</span>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-gold text-lg font-bold"
                >
                  +$2,847.53
                </motion.div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">MEV Opportunities</span>
                  <span className="text-cyan font-medium">47 detected</span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-gold to-cyan"
                    initial={{ width: 0 }}
                    animate={{ width: '78%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Smart Contract Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-gold/20 rounded-2xl p-5 relative overflow-hidden group hover:border-gold/40 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan/20 to-cyan/5 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-cyan" />
                  </div>
                  <span className="text-xs text-gray-400 tracking-wider">CONTRACT STATUS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-400 font-medium">Deployed</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-gray-500 truncate font-mono">
                  0x7a25...3f9d
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Mainnet Vault</span>
                  <span className="text-gold font-medium">Active</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Flashbots Connection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-gold/20 rounded-2xl p-5 relative overflow-hidden group hover:border-gold/40 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-xs text-gray-400 tracking-wider">FLASHBOTS</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                  <span className="text-xs text-green-400 font-medium">Connected</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Bundle Success Rate</span>
                  <span className="text-gold font-medium">98.7%</span>
                </div>
                <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-gold"
                    initial={{ width: 0 }}
                    animate={{ width: '98.7%' }}
                    transition={{ duration: 1, delay: 0.6 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Kill Switch */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-dark-800/50 backdrop-blur-xl border border-red-500/30 rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:border-red-500/60 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center">
                    <Power className="w-5 h-5 text-red-400" />
                  </div>
                  <span className="text-xs text-gray-400 tracking-wider">EMERGENCY STOP</span>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="space-y-2">
                <button className="w-full py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors">
                  KILL ALL OPERATIONS
                </button>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Status</span>
                  <span className="text-green-400 font-medium">Armed</span>
                </div>
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
