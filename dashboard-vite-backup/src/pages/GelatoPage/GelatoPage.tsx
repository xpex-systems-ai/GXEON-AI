import { useEffect, useState } from 'react';
import { 
  Target, 
  Zap, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface GelatoTask {
  id: string;
  task_id: string;
  network: string;
  reward_amount: number;
  reward_token: string;
  gas_spent_usd: number;
  net_profit_usd: number;
  status: string;
  created_at: string;
  protocol: string;
}

export function GelatoPage() {
  const [tasks, setTasks] = useState<GelatoTask[]>([]);
  const [stats, setStats] = useState({
    totalProfit: 0,
    totalZeroGas: 0,
    detected: 0,
    executed: 0,
  });

  const fetchGelatoTasks = async () => {
    const { data, error } = await supabase
      .from('keeper_rewards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[GelatoPage] Supabase error:', error);
      return;
    }

    if (data) {
      // Filter on client-side for now (case insensitive)
      const gelatoTasks = data.filter(t => 
        t.protocol?.toLowerCase().includes('gelato') || 
        t.protocol?.toLowerCase().includes('automate') ||
        t.source?.toLowerCase().includes('gelato')
      );
      
      setTasks(gelatoTasks as GelatoTask[]);
      
      // Calculate Gelato-specific stats
      const totalProfit = gelatoTasks.reduce((sum, t) => sum + (t.net_profit_usd || 0), 0);
      const totalZeroGas = gelatoTasks.length;
      const detected = gelatoTasks.filter(t => t.status?.toLowerCase() === 'detected').length;
      const executed = gelatoTasks.filter(t => t.status?.toLowerCase() === 'executed').length;
      
      setStats({ totalProfit, totalZeroGas, detected, executed });
    }
  };

  useEffect(() => {
    fetchGelatoTasks();

    fetchGelatoTasks();
    const interval = setInterval(fetchGelatoTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'detected': return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
      case 'executed': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
      case 'confirmed': return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
      default: return 'bg-slate-500/10 border-slate-500/30 text-slate-400';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Target className="w-8 h-8 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Gelato Sniper</h1>
            <p className="text-slate-400">Zero-Gas Task Hunter</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Zero-Gas Profit</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${stats.totalProfit.toFixed(4)}
          </div>
          <div className="text-xs text-emerald-400 mt-1">Total acumulado</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Zero-Gas Tasks</span>
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.totalZeroGas}
          </div>
          <div className="text-xs text-cyan-400 mt-1">Tarefas detectadas</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Pending</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.detected}
          </div>
          <div className="text-xs text-amber-400 mt-1">Aguardando execução</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Executed</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.executed}
          </div>
          <div className="text-xs text-emerald-400 mt-1">Concluídas</div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Zero-Gas Feed
          </h2>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma tarefa Zero-Gas detectada</p>
              <p className="text-sm text-slate-500 mt-2">
                O Gelato Scanner está monitorando Polygon, Ethereum e Arbitrum...
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Rede</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Lucro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Gas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status === 'detected' && <AlertCircle className="w-3 h-3" />}
                        {task.status === 'executed' && <CheckCircle2 className="w-3 h-3" />}
                        <span>{task.status === 'detected' ? 'Detectado' : task.status === 'executed' ? 'Executado' : task.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-300 capitalize">{task.network}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-400">{task.reward_token}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-emerald-400">
                        +${task.net_profit_usd?.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-400">
                        ${task.gas_spent_usd?.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {new Date(task.created_at).toLocaleTimeString('pt-BR')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
