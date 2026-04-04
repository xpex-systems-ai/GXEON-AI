import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Zap, Cpu, Shield, Server } from 'lucide-react';
import PipelineOverview from './components/PipelineOverview';
import Web3FinancialLayer from './components/Web3FinancialLayer';
import MarketplaceLedger from './components/MarketplaceLedger';
import ActivityTimeline from './components/ActivityTimeline';
import SystemStatus from './components/SystemStatus';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [metrics, setMetrics] = useState({
    pendingTasks: 0,
    executedTasks: 0,
    totalRewards: 0,
    paidRewards: 0,
    activeAgents: 7,
    systemHealth: 98
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    
    const channel = supabase
      .channel('gxeon-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        fetchMetrics();
        addLog('task', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rewards' }, (payload) => {
        fetchMetrics();
        addLog('reward', payload);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);

  async function fetchMetrics() {
    try {
      const { count: pendingCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      const { count: executedCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      
      const { count: rewardsCount } = await supabase
        .from('rewards')
        .select('*', { count: 'exact', head: true });
      
      const { count: paidCount } = await supabase
        .from('rewards')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid');

      setMetrics({
        pendingTasks: pendingCount || 0,
        executedTasks: executedCount || 0,
        totalRewards: rewardsCount || 0,
        paidRewards: paidCount || 0,
        activeAgents: 7,
        systemHealth: 98
      });
    } catch (err) {
      console.error('Metrics fetch error:', err);
    }
  }

  function addLog(type: string, payload: any) {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type,
      event: payload.eventType,
      details: JSON.stringify(payload.new).slice(0, 100)
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  }

  return (
    <div className="min-h-screen bg-cyber-black text-cyber-text font-sans">
      {/* Header */}
      <header className="border-b border-cyber-border bg-cyber-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-DEFAULT to-neon-dark flex items-center justify-center animate-glow">
                  <Zap className="w-6 h-6 text-cyber-black" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-neon-DEFAULT rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wider">
                  GXEON <span className="text-neon-DEFAULT">SUPREME</span> CONTROL PANEL
                </h1>
                <p className="text-xs text-cyber-muted tracking-widest">AUTONOMOUS EXECUTION SYSTEM v2.0.0</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-neon-DEFAULT animate-pulse' : 'bg-red-500'}`} />
                <span className={isConnected ? 'text-neon-DEFAULT' : 'text-red-400'}>
                  {isConnected ? 'REALTIME ACTIVE' : 'OFFLINE'}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-cyber-panel border border-cyber-border">
                <Shield className="w-4 h-4 text-neon-DEFAULT" />
                <span className="text-sm font-medium">SECURE</span>
              </div>
              
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-cyber-panel border border-cyber-border">
                <Server className="w-4 h-4 text-neon-DEFAULT" />
                <span className="text-sm font-medium">{metrics.activeAgents} AGENTS</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Pipeline Overview */}
        <PipelineOverview metrics={metrics} />
        
        {/* Web3 Financial Layer */}
        <Web3FinancialLayer />
        
        {/* Marketplace & Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketplaceLedger supabase={supabase} />
          <ActivityTimeline logs={logs} />
        </div>
        
        {/* System Status */}
        <SystemStatus metrics={metrics} />
        
      </main>

      {/* Footer */}
      <footer className="border-t border-cyber-border bg-cyber-dark mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-cyber-muted">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4" />
              <span>GXEON Neural Core Active</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>System Health: {metrics.systemHealth}%</span>
              <span>Last Sync: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
