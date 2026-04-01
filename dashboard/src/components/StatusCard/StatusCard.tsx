import { Activity, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { apiClient } from '../../utils/api';

interface StatusCardProps {
  className?: string;
}

export function StatusCard({ className = '' }: StatusCardProps) {
  const { data, loading, error, lastUpdated, refresh } = useAutoRefresh({
    fetchFn: apiClient.getHealth,
    interval: 5000,
  });

  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="w-5 h-5 animate-spin text-neon" />;
    if (error) return <AlertCircle className="w-5 h-5 text-red-400" />;
    if (data?.status === 'healthy') return <CheckCircle className="w-5 h-5 text-green-400" />;
    return <Activity className="w-5 h-5 text-yellow-400" />;
  };

  const getStatusClass = () => {
    if (error) return 'status-offline';
    if (data?.status === 'healthy') return 'status-online';
    return 'status-warning';
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (error) return 'Offline';
    if (data?.status === 'healthy') return 'Online';
    return 'Degraded';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className={`card-hover ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Activity className="w-5 h-5 text-neon" />
          System Health
        </h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
          title="Refresh now"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Status</span>
          <span className={getStatusClass()}>
            {getStatusIcon()}
            <span className="ml-1.5">{getStatusText()}</span>
          </span>
        </div>

        {data && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Uptime
              </span>
              <span className="text-gray-200 font-medium">
                {formatUptime(data.uptime)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Version</span>
              <span className="text-neon font-mono text-sm">
                {data.version}
              </span>
            </div>
          </>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {lastUpdated && (
          <p className="text-xs text-gray-500 text-right">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
