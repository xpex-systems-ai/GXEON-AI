import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronRight, Copy, Filter, Download } from 'lucide-react';
import { useState, useEffect } from 'react';

export function TransactionLog() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Simulate real-time transaction logs from GXEonAtomicMiner backend
    const generateLogs = () => [
      { id: 1, timestamp: '2026-04-13 19:45:23', type: 'SUCCESS', message: 'Flashloan executed successfully on Uniswap V3', hash: '0x8f3a...2b1c', profit: '+$1,247.50' },
      { id: 2, timestamp: '2026-04-13 19:45:18', type: 'INFO', message: 'MEV bundle submitted to Flashbots relay', hash: '0x7d2e...9a4f', profit: null },
      { id: 3, timestamp: '2026-04-13 19:45:12', type: 'WARNING', message: 'Gas price spike detected (45.2 Gwei)', hash: null, profit: null },
      { id: 4, timestamp: '2026-04-13 19:45:05', type: 'SUCCESS', message: 'Arbitrage opportunity captured on Curve', hash: '0x4c1b...5e8d', profit: '+$892.30' },
      { id: 5, timestamp: '2026-04-13 19:44:58', type: 'ERROR', message: 'Transaction reverted: insufficient liquidity', hash: '0x9a5f...3c7e', profit: null },
      { id: 6, timestamp: '2026-04-13 19:44:52', type: 'SUCCESS', message: 'Liquidation executed on Aave V3', hash: '0x2e8c...7d4a', profit: '+$3,456.00' },
      { id: 7, timestamp: '2026-04-13 19:44:45', type: 'INFO', message: 'Strategy rebalancing initiated', hash: null, profit: null },
      { id: 8, timestamp: '2026-04-13 19:44:38', type: 'SUCCESS', message: 'Flashbots bundle included in block #18294567', hash: '0x6b3d...1f9b', profit: '+$2,134.50' },
    ];

    setLogs(generateLogs());

    const interval = setInterval(() => {
      setLogs(generateLogs());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getLogTypeColor = (type) => {
    switch (type) {
      case 'SUCCESS': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'ERROR': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'WARNING': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'INFO': return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(log => log.type === filter);

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center border border-green-500/20">
            <Terminal className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h3 className="text-gold font-bold text-xl tracking-wider">MEV BRIBE LOGS</h3>
            <p className="text-gray-500 text-xs tracking-widest">TRANSACTION HISTORY</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-dark-800 border border-gold/20 hover:border-gold/40 transition-colors"
          >
            <Filter className="w-5 h-5 text-gray-400" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-dark-800 border border-gold/20 hover:border-gold/40 transition-colors"
          >
            <Download className="w-5 h-5 text-gray-400" />
          </motion.button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['all', 'SUCCESS', 'ERROR', 'WARNING', 'INFO'].map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === type
                ? 'bg-gold/20 border border-gold/40 text-gold'
                : 'bg-dark-800 border border-gold/10 text-gray-400 hover:border-gold/30'
            }`}
          >
            {type}
          </motion.button>
        ))}
      </div>

      {/* Logs Container */}
      <div className="flex-1 overflow-auto bg-dark-900/50 rounded-xl border border-gold/10 p-4 font-mono">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-dark-800/30 hover:bg-dark-800/50 transition-colors border border-transparent hover:border-gold/10"
              >
                <ChevronRight className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{log.timestamp}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getLogTypeColor(log.type)}`}>
                      {log.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 break-words">{log.message}</div>
                  {log.hash && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-cyan font-mono">{log.hash}</span>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-1 rounded hover:bg-gold/10"
                      >
                        <Copy className="w-3 h-3 text-gray-500" />
                      </motion.button>
                    </div>
                  )}
                  {log.profit && (
                    <div className="mt-1 text-sm font-bold text-gold">{log.profit}</div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Total: {logs.length} entries</span>
          <span className="text-green-400">Success: {logs.filter(l => l.type === 'SUCCESS').length}</span>
          <span className="text-red-400">Errors: {logs.filter(l => l.type === 'ERROR').length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Live updates enabled</span>
        </div>
      </div>
    </div>
  );
}
