import { Bot, Users, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { apiClient } from '../../utils/api';

interface AgentsListProps {
  className?: string;
}

export function AgentsList({ className = '' }: AgentsListProps) {
  const { data, loading, error, refresh } = useAutoRefresh({
    fetchFn: apiClient.getAgents,
    interval: 5000,
  });

  const agents = Array.isArray(data?.agents) ? data.agents : [];

  // Format relative time
  const getRelativeTime = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={`card-hover ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Users className="w-5 h-5 text-neon" />
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
        {(Array.isArray(agents) ? agents : []).map((agent) => (
          <div
            key={agent.id}
            className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg border border-dark-600 hover:border-neon/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-dark-600 rounded-lg text-neon">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-gray-200 font-medium">{agent.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {getRelativeTime(agent.lastSeen)}
                </p>
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
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No agents connected</p>
            <p className="text-xs mt-1">Agents will appear when they register</p>
          </div>
        )}
      </div>

      {agents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-dark-600">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{(Array.isArray(agents) ? agents.filter(a => a?.status === 'active') : []).length} active</span>
            <span>Auto-refresh: 5s</span>
          </div>
        </div>
      )}
    </div>
  );
}
