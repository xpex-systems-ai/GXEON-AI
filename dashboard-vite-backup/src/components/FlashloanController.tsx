import { motion } from 'framer-motion';
import { Cpu, Zap, Play, Pause, Settings, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export function FlashloanController() {
  const [isRunning, setIsRunning] = useState(true);
  const [flashloanStatus, setFlashloanStatus] = useState('active');
  const [metrics, setMetrics] = useState({
    totalLoans: 127,
    successRate: 98.7,
    avgExecutionTime: '0.45s',
    totalVolume: '$2.4M',
    activeStrategies: 5,
  });

  const strategies = [
    { id: 1, name: 'Uniswap V3 Arbitrage', status: 'active', profit: '$12,450', apy: '245%' },
    { id: 2, name: 'Curve Finance Triangular', status: 'active', profit: '$8,920', apy: '189%' },
    { id: 3, name: 'Balancer Pool Exploit', status: 'paused', profit: '$5,670', apy: '167%' },
    { id: 4, name: 'SushiSwap Cross-DEX', status: 'active', profit: '$15,230', apy: '312%' },
    { id: 5, name: 'Aave Liquidation Bot', status: 'active', profit: '$22,890', apy: '428%' },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-400" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'paused': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'error': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center border border-gold/20">
            <Cpu className="w-6 h-6 text-gold animate-pulse" />
          </div>
          <div>
            <h3 className="text-gold font-bold text-xl tracking-wider">ATOMIC ENGINE</h3>
            <p className="text-gray-500 text-xs tracking-widest">FLASHLOAN CONTROLLER</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-dark-800 border border-gold/20 hover:border-gold/40 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsRunning(!isRunning)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              isRunning
                ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                : 'bg-green-500/20 border border-green-500/40 text-green-400'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'STOP ENGINE' : 'START ENGINE'}
          </motion.button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="text-xs text-gray-500 mb-1">TOTAL LOANS</div>
          <div className="text-2xl font-bold text-gold">{metrics.totalLoans}</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="text-xs text-gray-500 mb-1">SUCCESS RATE</div>
          <div className="text-2xl font-bold text-green-400">{metrics.successRate}%</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="text-xs text-gray-500 mb-1">EXECUTION TIME</div>
          <div className="text-2xl font-bold text-cyan">{metrics.avgExecutionTime}</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="text-xs text-gray-500 mb-1">TOTAL VOLUME</div>
          <div className="text-2xl font-bold text-gold">{metrics.totalVolume}</div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="text-xs text-gray-500 mb-1">ACTIVE STRATEGIES</div>
          <div className="text-2xl font-bold text-cyan">{metrics.activeStrategies}</div>
        </div>
      </div>

      {/* Strategies List */}
      <div className="flex-1 overflow-auto">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">ACTIVE STRATEGIES</h4>
        </div>
        <div className="space-y-3">
          {strategies.map((strategy, index) => (
            <motion.div
              key={strategy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-dark-800/50 backdrop-blur-xl border border-gold/10 rounded-xl p-4 hover:border-gold/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan/20 to-cyan/5 flex items-center justify-center border border-cyan/20">
                    <Zap className="w-5 h-5 text-cyan" />
                  </div>
                  <div>
                    <h5 className="text-white font-medium">{strategy.name}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(strategy.status)}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(strategy.status)}`}>
                        {strategy.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Profit</div>
                    <div className="text-gold font-bold">{strategy.profit}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">APY</div>
                    <div className="text-cyan font-bold">{strategy.apy}</div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-lg bg-dark-700 border border-gold/20 hover:bg-gold/10 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
