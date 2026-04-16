import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Activity, DollarSign, Clock, ArrowUpRight, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

export function MempoolScanner() {
  const [mempoolData, setMempoolData] = useState([]);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    // Simulate real-time mempool data from GXEonAtomicMiner backend
    const generateMempoolData = () => [
      { id: 1, hash: '0x8f3a...2b1c', type: 'Arbitrage', profit: '$1,247.50', gas: '12.5 Gwei', time: '2s ago', risk: 'Low' },
      { id: 2, hash: '0x7d2e...9a4f', type: 'Sandwich', profit: '$892.30', gas: '18.2 Gwei', time: '5s ago', risk: 'Medium' },
      { id: 3, hash: '0x4c1b...5e8d', type: 'Liquidation', profit: '$3,456.00', gas: '25.0 Gwei', time: '8s ago', risk: 'High' },
      { id: 4, hash: '0x9a5f...3c7e', type: 'Arbitrage', profit: '$567.80', gas: '10.1 Gwei', time: '12s ago', risk: 'Low' },
      { id: 5, hash: '0x2e8c...7d4a', type: 'JIT', profit: '$1,892.10', gas: '15.3 Gwei', time: '15s ago', risk: 'Medium' },
      { id: 6, hash: '0x6b3d...1f9b', type: 'Arbitrage', profit: '$2,134.50', gas: '14.8 Gwei', time: '18s ago', risk: 'Low' },
    ];

    setMempoolData(generateMempoolData());

    const interval = setInterval(() => {
      setMempoolData(generateMempoolData());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'High': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5 flex items-center justify-center border border-cyan/20">
            <Radar className="w-6 h-6 text-cyan animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-gold font-bold text-xl tracking-wider">MEMPOOL RADAR</h3>
            <p className="text-gray-500 text-xs tracking-widest">REAL-TIME OPPORTUNITY SCANNER</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsScanning(!isScanning)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isScanning
                ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                : 'bg-green-500/20 border border-green-500/40 text-green-400'
            }`}
          >
            {isScanning ? 'PAUSE SCAN' : 'RESUME SCAN'}
          </motion.button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800 border border-gold/20">
            <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-cyan animate-pulse' : 'bg-gray-500'}`} />
            <span className="text-xs text-gray-400">{isScanning ? 'Scanning' : 'Paused'}</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-cyan" />
            <span className="text-xs text-gray-500">Total Detected</span>
          </div>
          <div className="text-2xl font-bold text-gold">1,247</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gold" />
            <span className="text-xs text-gray-500">Total Profit</span>
          </div>
          <div className="text-2xl font-bold text-gold">$48.2K</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-500">Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-green-400">94.7%</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-cyan" />
            <span className="text-xs text-gray-500">Avg Latency</span>
          </div>
          <div className="text-2xl font-bold text-cyan">0.8s</div>
        </div>
      </div>

      {/* Mempool Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gold/10">
              <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium tracking-wider">TX HASH</th>
              <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium tracking-wider">TYPE</th>
              <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium tracking-wider">PROFIT</th>
              <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium tracking-wider">GAS</th>
              <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium tracking-wider">TIME</th>
              <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium tracking-wider">RISK</th>
              <th className="text-left py-3 px-4 text-xs text-gray-500 font-medium tracking-wider">ACTION</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {mempoolData.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-gold/5 hover:bg-gold/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="text-cyan font-mono text-sm">{item.hash}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-300 text-sm">{item.type}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gold font-bold text-sm">{item.profit}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-400 text-sm">{item.gas}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-500 text-sm">{item.time}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getRiskColor(item.risk)}`}>
                      {item.risk}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-lg bg-gold/20 border border-gold/30 hover:bg-gold/30 transition-colors"
                    >
                      <ArrowUpRight className="w-4 h-4 text-gold" />
                    </motion.button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
