import { Bot, Brain, Database, Sparkles, Zap, RefreshCw, AlertCircle, Cpu } from 'lucide-react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { apiClient } from '../../utils/api';

interface AgentsListProps {
  className?: string;
}

const agentIcons: Record<string, React.ReactNode> = {
  orchestrator: <Brain className="w-4 h-4" />,
  vectordb: <Database className="w-4 h-4" />,
  huggingface: <Sparkles className="w-4 h-4" />,
  deepseek: <Sparkles className="w-4 h-4" />,
  grok: <Zap className="w-4 h-4" />,
  chatgpt: <Bot className="w-4 h-4" />,
  bitensor: <Cpu className="w-4 h-4" />,
  default: <Bot className="w-4 h-4" />,
};

export function AgentsList({ className = '' }: AgentsListProps) {
  const { data, loading, error, refresh } = useAutoRefresh({
    fetchFn: apiClient.getAgents,
    interval: 5000,
  });

  const agents = data?.agents || [];
  const status = data?.status;

  return (
    <div className={`card-hover ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Bot className="w-5 h-5 text-neon" />
          Active Agents
          <span className="text-sm text-gray-500">({agents.length})</span>
        </h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && agents.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-neon" />
          <span className="ml-2 text-gray-400">Loading agents...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Failed to load agents</span>
          </div>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg border border-dark-600 hover:border-neon/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-dark-600 rounded-lg text-neon">
                {agentIcons[agent.id] || agentIcons.default}
              </div>
              <div>
                <p className="text-gray-200 font-medium">{agent.name}</p>
                <p className="text-xs text-gray-500">{agent.type}</p>
              </div>
            </div>
            <span
              className={`status-badge ${
                agent.status === 'active'
                  ? 'status-online'
                  : agent.status === 'error'
                  ? 'status-offline'
                  : 'status-warning'
              }`}
            >
              {agent.status}
            </span>
          </div>
        ))}

        {agents.length === 0 && !loading && !error && (
          <div className="text-center py-8 text-gray-500">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No agents available</p>
          </div>
        )}
      </div>

      {status && (
        <div className="mt-4 pt-4 border-t border-dark-600">
          <h4 className="text-sm font-medium text-gray-400 mb-2">System Status</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-dark-700/50 rounded">
              <span className="text-gray-500">Brain</span>
              <span className={status.brain === 'active' ? 'text-green-400' : 'text-gray-400'}>
                {status.brain}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-dark-700/50 rounded">
              <span className="text-gray-500">Vector DB</span>
              <span className={status.vector_db === 'active' ? 'text-green-400' : 'text-gray-400'}>
                {status.vector_db}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
