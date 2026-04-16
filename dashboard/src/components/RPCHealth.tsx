import { motion } from 'framer-motion';
import { Activity, Server, Database, Network, Wifi, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';

export function RPCHealth() {
  const [nodes, setNodes] = useState([
    { id: 1, name: 'Mainnet RPC (Infura)', status: 'healthy', latency: '12ms', block: '18294567', peers: 45 },
    { id: 2, name: 'Mainnet RPC (Alchemy)', status: 'healthy', latency: '8ms', block: '18294567', peers: 52 },
    { id: 3, name: 'Flashbots Relay', status: 'healthy', latency: '15ms', block: '18294567', peers: 128 },
    { id: 4, name: 'Arbitrum One', status: 'degraded', latency: '45ms', block: '12345678', peers: 23 },
    { id: 5, name: 'Optimism', status: 'healthy', latency: '22ms', block: '98765432', peers: 38 },
    { id: 6, name: 'Polygon', status: 'healthy', latency: '18ms', block: '54321678', peers: 67 },
  ]);

  const [systemHealth, setSystemHealth] = useState({
    cpu: 45,
    memory: 62,
    disk: 38,
    network: '1.2 GB/s',
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'offline': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'border-green-500/30 bg-green-500/10';
      case 'degraded': return 'border-yellow-500/30 bg-yellow-500/10';
      case 'offline': return 'border-red-500/30 bg-red-500/10';
      default: return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const getProgressBarColor = (value) => {
    if (value < 50) return 'from-green-500 to-green-400';
    if (value < 75) return 'from-yellow-500 to-yellow-400';
    return 'from-red-500 to-red-400';
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center border border-green-500/20">
            <Activity className="w-6 h-6 text-green-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-gold font-bold text-xl tracking-wider">NODE STATUS</h3>
            <p className="text-gray-500 text-xs tracking-widest">RPC HEALTH MONITOR</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800 border border-green-500/30">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400">All Systems Operational</span>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-cyan" />
            <span className="text-xs text-gray-500">CPU Usage</span>
          </div>
          <div className="text-2xl font-bold text-gold mb-2">{systemHealth.cpu}%</div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${systemHealth.cpu}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-cyan" />
            <span className="text-xs text-gray-500">Memory</span>
          </div>
          <div className="text-2xl font-bold text-gold mb-2">{systemHealth.memory}%</div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${systemHealth.memory}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-cyan" />
            <span className="text-xs text-gray-500">Disk</span>
          </div>
          <div className="text-2xl font-bold text-gold mb-2">{systemHealth.disk}%</div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${systemHealth.disk}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
        <div className="bg-dark-800/50 rounded-xl p-4 border border-gold/10">
          <div className="flex items-center gap-2 mb-3">
            <Wifi className="w-4 h-4 text-cyan" />
            <span className="text-xs text-gray-500">Network</span>
          </div>
          <div className="text-2xl font-bold text-gold mb-2">{systemHealth.network}</div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-cyan"
              initial={{ width: 0 }}
              animate={{ width: '78%' }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="flex-1 overflow-auto">
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-400 mb-3">CONNECTED NODES</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {nodes.map((node, index) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-dark-800/50 backdrop-blur-xl border rounded-xl p-4 hover:border-gold/30 transition-all ${getStatusColor(node.status)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan/20 to-cyan/5 flex items-center justify-center border border-cyan/20">
                    <Network className="w-5 h-5 text-cyan" />
                  </div>
                  <div>
                    <h5 className="text-white font-medium">{node.name}</h5>
                    <div className="flex items-center gap-1 mt-1">
                      {getStatusIcon(node.status)}
                      <span className={`text-xs capitalize ${node.status === 'healthy' ? 'text-green-400' : node.status === 'degraded' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {node.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Latency</div>
                  <div className="text-gold font-bold">{node.latency}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Block</div>
                  <div className="text-cyan font-mono text-sm">{node.block}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Peers</div>
                  <div className="text-white font-bold">{node.peers}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
