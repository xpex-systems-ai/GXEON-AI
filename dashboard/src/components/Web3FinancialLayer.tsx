import { useState } from 'react';
import { Wallet, Hash, TrendingUp, Gauge, Shield, ExternalLink } from 'lucide-react';

interface WalletData {
  address: string;
  balance: string;
  network: string;
  txCount: number;
  gasEfficiency: number;
  totalSettled: number;
}

export default function Web3FinancialLayer() {
  const [wallet] = useState<WalletData>({
    address: '0x3955...dB224',
    balance: '0.00',
    network: 'Ethereum',
    txCount: 3,
    gasEfficiency: 98.5,
    totalSettled: 0.045
  });

  const [txHashes] = useState([
    { hash: '0x1875a490', status: 'confirmed', time: '2m ago' },
    { hash: '0x932b7af8', status: 'confirmed', time: '5m ago' },
    { hash: '0x01d7d315', status: 'confirmed', time: '8m ago' }
  ]);

  return (
    <section className="bg-cyber-panel border border-cyber-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Web3 Financial Layer</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-neon-DEFAULT" />
          <span className="text-xs text-neon-DEFAULT">Encrypted</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet Info */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-cyber-dark border border-cyber-border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 uppercase tracking-wider">Active Wallet</span>
            </div>
            <p className="text-sm text-cyber-muted mb-1">Address</p>
            <p className="text-lg font-mono text-white">{wallet.address}</p>
            <div className="mt-3 pt-3 border-t border-cyber-border">
              <p className="text-xs text-cyber-muted">Network</p>
              <p className="text-sm font-medium text-white">{wallet.network}</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-neon-DEFAULT/20 to-neon-dark/20 border border-neon-DEFAULT/30 rounded-lg p-4">
            <p className="text-xs text-neon-DEFAULT uppercase tracking-wider mb-1">Total Settled ROI</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-bold text-white">{wallet.totalSettled}</span>
              <span className="text-sm text-cyber-muted">ETH</span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-cyber-dark border border-cyber-border rounded-lg p-4 text-center">
              <Hash className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{wallet.txCount}</p>
              <p className="text-xs text-cyber-muted">TX Hashes</p>
            </div>
            <div className="bg-cyber-dark border border-cyber-border rounded-lg p-4 text-center">
              <Gauge className="w-5 h-5 text-neon-DEFAULT mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{wallet.gasEfficiency}%</p>
              <p className="text-xs text-cyber-muted">Gas Efficiency</p>
            </div>
            <div className="bg-cyber-dark border border-cyber-border rounded-lg p-4 text-center">
              <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-xs text-cyber-muted">Success Rate</p>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-cyber-dark border border-cyber-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Recent Transactions</h3>
            <div className="space-y-2">
              {txHashes.map((tx, index) => (
                <div 
                  key={tx.hash}
                  className="flex items-center justify-between py-2 px-3 bg-cyber-panel rounded-lg hover:bg-cyber-border/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-cyber-muted w-6">#{index + 1}</span>
                    <span className="font-mono text-sm text-neon-DEFAULT">{tx.hash}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tx.status === 'confirmed' 
                        ? 'bg-green-400/20 text-green-400' 
                        : 'bg-yellow-400/20 text-yellow-400'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <span className="text-xs text-cyber-muted">{tx.time}</span>
                </div>
              ))}
            </div>
            <button className="mt-3 w-full py-2 text-xs text-cyber-muted hover:text-white transition-colors border border-dashed border-cyber-border rounded-lg hover:border-neon-DEFAULT/50">
              <div className="flex items-center justify-center space-x-1">
                <ExternalLink className="w-3 h-3" />
                <span>View on Etherscan</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
