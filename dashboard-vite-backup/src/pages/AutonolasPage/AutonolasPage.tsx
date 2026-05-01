import { useEffect, useState } from 'react';
import { 
  Brain, 
  Sparkles,
  TrendingUp,
  Clock,
  Search,
  Cpu
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AITask {
  id: string;
  task_id: string;
  network: string;
  reward_amount: number;
  reward_token: string;
  gas_spent_usd: number;
  net_profit_usd: number;
  status: string;
  created_at: string;
  resolved_answer?: string | null;
  source?: string;
  metadata?: {
    ai_capability?: string;
    task_prompt?: string;
  };
}

export function AutonolasPage() {
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [stats, setStats] = useState({
    totalAIProfit: 0,
    totalAITasks: 0,
    resolvedCount: 0,
    pendingCount: 0,
  });

  const fetchAITasks = async () => {
    // DEBUG: Fetch ALL data without filters to ensure visibility
    const { data, error } = await supabase
      .from('keeper_rewards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[AutonolasPage] Supabase error:', error);
      return;
    }

    if (data) {
      console.log('[AutonolasPage] Raw data count:', data.length);
      // Filter on client-side (case insensitive for status)
      const aiTasks = data.filter(t => 
        t.status?.toLowerCase().includes('ai') ||
        t.source?.toLowerCase().includes('autonolas') ||
        t.resolved_answer !== null
      );
      console.log('[AutonolasPage] Filtered AI tasks:', aiTasks.length);
      
      setTasks(aiTasks as AITask[]);
      
      // Calculate AI-specific stats
      const totalAIProfit = aiTasks.reduce((sum, t) => sum + (t.net_profit_usd || 0), 0);
      const totalAITasks = aiTasks.length;
      const resolvedCount = aiTasks.filter(t => t.resolved_answer).length;
      const pendingCount = aiTasks.filter(t => !t.resolved_answer).length;
      
      setStats({ totalAIProfit, totalAITasks, resolvedCount, pendingCount });
    }
  };

  useEffect(() => {
    fetchAITasks();
    const interval = setInterval(fetchAITasks, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Autonolas AI</h1>
            <p className="text-slate-400">AI Task Resolver with Hugging Face Brain</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">AI Profit Total</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            ${stats.totalAIProfit.toFixed(4)}
          </div>
          <div className="text-xs text-emerald-400 mt-1">USD acumulado</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">AI Tasks</span>
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.totalAITasks}
          </div>
          <div className="text-xs text-purple-400 mt-1">Tarefas detectadas</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">HF Brain</span>
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.resolvedCount}
          </div>
          <div className="text-xs text-cyan-400 mt-1">Respostas geradas</div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Pending</span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.pendingCount}
          </div>
          <div className="text-xs text-amber-400 mt-1">Aguardando IA</div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 overflow-hidden">
        <div className="p-6 border-b border-slate-800/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            AI Task Feed
          </h2>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma tarefa de IA detectada</p>
              <p className="text-sm text-slate-500 mt-2">
                O Autonolas AI Worker está monitorando Gnosis e Base...
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Rede</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Lucro</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">IA Response</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border bg-purple-500/10 border-purple-500/30 text-purple-400">
                        <Brain className="w-3 h-3" />
                        <span>AI Processed</span>
                      </div>
                      {task.resolved_answer && (
                        <div className="mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 flex items-center gap-1 w-fit">
                            <Sparkles className="w-2 h-2" />
                            HF Brain
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300 capitalize">{task.network}</span>
                        {task.source && (
                          <span className="text-xs text-purple-400">{task.source}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-emerald-400">
                        +${task.net_profit_usd?.toFixed(4)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.resolved_answer ? (
                        <span className="text-xs text-slate-300 line-clamp-2 max-w-xs">
                          {task.resolved_answer.substring(0, 80)}...
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Processando...</span>
                      )}
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
