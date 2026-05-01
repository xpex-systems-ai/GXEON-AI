import { useEffect, useState } from 'react';
import { 
  Radar, 
  Target, 
  Zap,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Activity,
  Search,
  Brain,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface KeeperReward {
  id: string;
  task_id: string;
  protocol: string;
  network: string;
  reward_amount: number;
  reward_token: string;
  gas_spent_usd: number;
  net_profit_usd: number;
  status: 'detected' | 'executed' | 'confirmed' | 'AI_TASK_DETECTED';
  tx_hash: string | null;
  created_at: string;
  executed_at: string | null;
  resolved_answer?: string | null;
  source?: string;
  metadata?: {
    ai_capability?: string;
    task_prompt?: string;
  };
}

interface AgentStatus {
  name: string;
  status: 'online' | 'hunting' | 'idle' | 'offline';
  lastActivity: string;
}

export function CommandCenter() {
  const [rewards, setRewards] = useState<KeeperReward[]>([]);
  const [agents, _setAgents] = useState<AgentStatus[]>([
    { name: 'Bounty Scanner', status: 'hunting', lastActivity: 'Ativo agora' },
    { name: 'Keeper Sniper', status: 'online', lastActivity: 'Aguardando alvos' },
  ]);
  const [stats, setStats] = useState({
    totalProfit: 0,
    totalExecutions: 0,
    pendingBounties: 0,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('command-center-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'keeper_rewards' },
        (payload) => {
          console.log('[Realtime] Keeper reward update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setRewards(prev => [payload.new as KeeperReward, ...prev]);
            setStats(prev => ({
              ...prev,
              pendingBounties: prev.pendingBounties + 1,
            }));
          } else if (payload.eventType === 'UPDATE') {
            setRewards(prev => 
              prev.map(r => r.id === payload.new.id ? payload.new as KeeperReward : r)
            );
            
            if (payload.new.status === 'executed') {
              setStats(prev => ({
                ...prev,
                totalExecutions: prev.totalExecutions + 1,
                totalProfit: prev.totalProfit + (payload.new.net_profit_usd || 0),
                pendingBounties: Math.max(0, prev.pendingBounties - 1),
              }));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Command center subscription:', status);
      });

    // Initial fetch
    fetchRewards();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRewards = async () => {
    const { data, error } = await supabase
      .from('keeper_rewards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setRewards(data as KeeperReward[]);
      
      // Calculate stats
      const totalProfit = data.reduce((sum, r) => sum + (r.net_profit_usd || 0), 0);
      const totalExecutions = data.filter(r => r.status === 'executed').length;
      const pendingBounties = data.filter(r => r.status === 'detected').length;
      
      setStats({ totalProfit, totalExecutions, pendingBounties });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'detected':
        return 'bg-amber-500 text-amber-500 border-amber-500/30';
      case 'executed':
        return 'bg-emerald-500 text-emerald-500 border-emerald-500/30';
      case 'confirmed':
        return 'bg-blue-500 text-blue-500 border-blue-500/30';
      case 'AI_TASK_DETECTED':
        return 'bg-purple-500 text-purple-500 border-purple-500/30';
      default:
        return 'bg-slate-500 text-slate-500 border-slate-500/30';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'detected':
        return 'bg-amber-500/10 border-amber-500/20';
      case 'executed':
        return 'bg-emerald-500/10 border-emerald-500/20';
      case 'confirmed':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'AI_TASK_DETECTED':
        return 'bg-purple-500/10 border-purple-500/20';
      default:
        return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  const handleForceRefresh = () => {
    console.log('[CommandCenter] Force refresh triggered');
    setRewards([]);
    setStats({ totalProfit: 0, totalExecutions: 0, pendingBounties: 0 });
    fetchRewards();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Radar className="w-8 h-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-white">Centro de Comando</h1>
          </div>
          <button
            onClick={handleForceRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Force Refresh</span>
          </button>
        </div>
        <p className="text-slate-400">
          Monitoramento em tempo real dos Agentes GXeon
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Lucro Total</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${stats.totalProfit.toFixed(4)}
          </div>
          <div className="text-xs text-emerald-400 mt-1">USD acumulado</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Execuções</span>
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.totalExecutions}
          </div>
          <div className="text-xs text-cyan-400 mt-1">Transações simuladas</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Bounties Pendentes</span>
            <Target className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.pendingBounties}
          </div>
          <div className="text-xs text-amber-400 mt-1">Aguardando execução</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Agentes Ativos</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {agents.filter(a => a.status !== 'offline').length}
          </div>
          <div className="text-xs text-emerald-400 mt-1">Online agora</div>
        </div>
      </div>

      {/* Agent Status Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Agent Status */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Agentes Online
          </h2>
          <div className="space-y-3">
            {agents.map((agent) => (
              <div
                key={agent.name}
                className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-slate-800/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`
                        w-3 h-3 rounded-full
                        ${agent.status === 'hunting' ? 'bg-emerald-400 animate-pulse' : ''}
                        ${agent.status === 'online' ? 'bg-cyan-400 animate-pulse' : ''}
                        ${agent.status === 'idle' ? 'bg-amber-400' : ''}
                        ${agent.status === 'offline' ? 'bg-slate-500' : ''}
                      `} />
                      <div className={`
                        absolute inset-0 rounded-full blur-sm opacity-50
                        ${agent.status === 'hunting' ? 'bg-emerald-400' : ''}
                        ${agent.status === 'online' ? 'bg-cyan-400' : ''}
                      `} />
                    </div>
                    <span className="font-medium text-white">{agent.name}</span>
                  </div>
                  <span className={`
                    text-xs px-2 py-1 rounded-full
                    ${agent.status === 'hunting' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                    ${agent.status === 'online' ? 'bg-cyan-500/20 text-cyan-400' : ''}
                    ${agent.status === 'idle' ? 'bg-amber-500/20 text-amber-400' : ''}
                  `}>
                    {agent.status === 'hunting' ? 'Caçando' : 
                     agent.status === 'online' ? 'Online' : 
                     agent.status === 'idle' ? 'Ocioso' : 'Offline'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 pl-6">{agent.lastActivity}</p>
              </div>
            ))}
            {/* Autonolas AI Agent */}
            <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
                    <div className="absolute inset-0 rounded-full blur-sm opacity-50 bg-purple-400" />
                  </div>
                  <span className="font-medium text-white">Autonolas AI Worker</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Pensando
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 pl-6">Processando tarefas de IA na Gnosis/Base</p>
            </div>
          </div>
        </div>

        {/* Live Feed */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Feed de Execuções
            <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Realtime
            </span>
          </h2>
          
          <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800/50 overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              {rewards.length === 0 ? (
                <div className="p-8 text-center">
                  <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Nenhuma oportunidade detectada ainda</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Os Scanners (Gelato + Autonolas AI) estão caçando...
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-800/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Rede/Fonte</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Lucro</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Gas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Tempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {rewards.map((reward, index) => (
                      <tr 
                        key={reward.id}
                        className={`
                          transition-all duration-500
                          ${reward.status === 'executed' && index === 0 ? 'animate-pulse bg-emerald-500/5' : ''}
                          hover:bg-slate-800/30
                        `}
                      >
                        <td className="px-4 py-3">
                          <div className={`
                            inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
                            border ${getStatusBg(reward.status)}
                          `}>
                            {reward.status === 'detected' && <AlertCircle className="w-3 h-3" />}
                            {reward.status === 'executed' && <CheckCircle2 className="w-3 h-3" />}
                            {reward.status === 'AI_TASK_DETECTED' && <Brain className="w-3 h-3" />}
                            <span className={getStatusColor(reward.status).split(' ')[1]}>
                              {reward.status === 'detected' ? 'Detectado' : 
                               reward.status === 'executed' ? 'Executado' : 
                               reward.status === 'AI_TASK_DETECTED' ? 'AI Processed' : 'Confirmado'}
                            </span>
                          </div>
                          {reward.resolved_answer && (
                            <div className="mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-1 w-fit">
                                <Brain className="w-2 h-2" />
                                HF Brain
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-300 capitalize">{reward.network}</span>
                            {reward.source && (
                              <span className="text-xs text-purple-400">{reward.source}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-emerald-400">
                            +${reward.net_profit_usd?.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-400">
                            ${reward.gas_spent_usd?.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">
                            {new Date(reward.created_at).toLocaleTimeString('pt-BR')}
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
      </div>
    </div>
  );
}
