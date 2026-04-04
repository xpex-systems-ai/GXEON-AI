import { Cpu, Activity, Wifi, Database, Shield } from 'lucide-react';

interface SystemMetrics {
  activeAgents: number;
  systemHealth: number;
  pendingTasks: number;
  executedTasks: number;
}

export default function SystemStatus({ metrics }: { metrics: SystemMetrics }) {
  const modules = [
    { name: 'Task Ingestion', status: 'online', latency: '12ms' },
    { name: 'Execution Agent', status: 'online', latency: '45ms' },
    { name: 'Reward Engine', status: 'online', latency: '8ms' },
    { name: 'Payment Engine', status: 'online', latency: '120ms' },
    { name: 'Marketplace', status: 'online', latency: '15ms' },
    { name: 'AI Decision', status: 'online', latency: '23ms' },
    { name: 'Task Generator', status: 'online', latency: '67ms' }
  ];

  return (
    <section className="bg-cyber-panel border border-cyber-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-DEFAULT to-neon-dark flex items-center justify-center">
            <Cpu className="w-5 h-5 text-cyber-black" />
          </div>
          <h2 className="text-lg font-semibold text-white">System Status</h2>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-400/20 border border-green-400/30">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Health Score */}
        <div className="bg-gradient-to-br from-neon-DEFAULT/10 to-transparent border border-neon-DEFAULT/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-neon-DEFAULT" />
            <span className="text-xs text-neon-DEFAULT">HEALTH</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-white">{metrics.systemHealth}</span>
            <span className="text-sm text-cyber-muted">%</span>
          </div>
          <div className="mt-2 h-1.5 bg-cyber-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-neon-DEFAULT to-neon-light rounded-full transition-all duration-1000"
              style={{ width: `${metrics.systemHealth}%` }}
            />
          </div>
        </div>

        {/* Active Connections */}
        <div className="bg-cyber-dark border border-cyber-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Wifi className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-blue-400">CONNECTIONS</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-white">{metrics.activeAgents}</span>
            <span className="text-sm text-cyber-muted">agents</span>
          </div>
          <p className="mt-2 text-xs text-cyber-muted">All modules connected</p>
        </div>

        {/* Database Status */}
        <div className="bg-cyber-dark border border-cyber-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-purple-400">DATABASE</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-white">Connected</span>
          </div>
          <p className="mt-2 text-xs text-cyber-muted">Supabase realtime active</p>
        </div>

        {/* Security Status */}
        <div className="bg-cyber-dark border border-cyber-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-xs text-green-400">SECURITY</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-white">Secure</span>
          </div>
          <p className="mt-2 text-xs text-cyber-muted">Encrypted connections</p>
        </div>
      </div>

      {/* Module Status List */}
      <div className="border-t border-cyber-border pt-4">
        <h3 className="text-sm font-medium text-white mb-3">Module Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((module) => (
            <div 
              key={module.name}
              className="flex items-center justify-between p-3 bg-cyber-dark border border-cyber-border rounded-lg hover:border-neon-DEFAULT/30 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-white">{module.name}</span>
              </div>
              <span className="text-xs text-cyber-muted font-mono">{module.latency}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
