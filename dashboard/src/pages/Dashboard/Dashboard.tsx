import { Cpu, Zap, Activity, BarChart3, Users, CheckCircle, Clock, Wallet } from 'lucide-react';
import { StatusCard, AgentsList, SystemLogs } from '../../components';
import { useState, useEffect } from 'react';
import { API_BASE, safeFetchWrapper } from '../../utils/safeFetch';

interface Stats {
  agents: number;
  tasks: number;
  completed: number;
  pending: number;
  balance: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    agents: 0,
    tasks: 0,
    completed: 0,
    pending: 0,
    balance: 0
  });

  // Fetch stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await safeFetchWrapper(`${API_BASE}/api/stats`);
        console.log("[Dashboard] API DATA:", data);
        
        if (data?.success) {
          setStats({
            agents: data.stats?.agents || 0,
            tasks: data.stats?.tasks || 0,
            completed: data.stats?.completed || 0,
            pending: data.stats?.pending || 0,
            balance: data.stats?.balance || 0
          });
        }
      } catch (error) {
        console.error('[Dashboard] Failed to fetch stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-600 bg-dark-800/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neon/10 rounded-lg border border-neon/30">
                <Cpu className="w-6 h-6 text-neon" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">GXEON Dashboard</h1>
                <p className="text-xs text-gray-500">AI Control Center</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
                <Activity className="w-4 h-4 text-green-400" />
                <span>System Active</span>
              </div>
              <div className="h-4 w-px bg-dark-600 hidden sm:block" />
              <button className="btn-secondary text-sm">
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Row - Real Data */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Active Agents</p>
                <p className="text-2xl font-bold text-gray-200">{stats.agents}</p>
              </div>
              <div className="p-2 bg-neon/10 rounded-lg">
                <Users className="w-5 h-5 text-neon" />
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-200">{stats.tasks}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
            </div>
          </div>
          
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Balance</p>
                <p className="text-2xl font-bold text-neon">{stats.balance.toFixed(4)} ETH</p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Wallet className="w-5 h-5 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Status & Health */}
          <div className="space-y-6">
            <StatusCard />
            
            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-200 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full btn-primary text-left flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Run Task
                </button>
                <button className="w-full btn-secondary text-left flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Deploy Agent
                </button>
                <button className="w-full btn-secondary text-left flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  View Analytics
                </button>
              </div>
            </div>
          </div>

          {/* Middle Column - Agents */}
          <div className="lg:col-span-1">
            <AgentsList className="h-full" />
          </div>

          {/* Right Column - Logs */}
          <div className="lg:col-span-1">
            <SystemLogs className="h-full" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-600 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>GXEON Dashboard v1.0</p>
            <p>Connected to Railway Backend</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
