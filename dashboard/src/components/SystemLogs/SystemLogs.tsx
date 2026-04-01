import { Terminal, RefreshCw, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { useState } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  module: string;
  message: string;
}

interface SystemLogsProps {
  className?: string;
}

const mockLogs: LogEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000).toISOString(),
    level: 'info',
    module: 'orchestrator',
    message: 'Agent orchestrator initialized successfully',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 5000).toISOString(),
    level: 'info',
    module: 'agents',
    message: 'Connected to Supabase database',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 10000).toISOString(),
    level: 'warn',
    module: 'wallet',
    message: 'Wallet connection pending user confirmation',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 15000).toISOString(),
    level: 'info',
    module: 'microtasks',
    message: 'Auto-execution enabled for 5 task types',
  },
];

const levelIcons = {
  info: <Info className="w-4 h-4 text-blue-400" />,
  warn: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
};

const levelClasses = {
  info: 'border-l-blue-500/50 bg-blue-500/5',
  warn: 'border-l-yellow-500/50 bg-yellow-500/5',
  error: 'border-l-red-500/50 bg-red-500/5',
};

export function SystemLogs({ className = '' }: SystemLogsProps) {
  const [logs] = useState<LogEntry[]>(mockLogs);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={`card-hover ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-neon" />
          System Logs
          <span className="text-sm text-gray-500">({filteredLogs.length})</span>
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-dark-700 text-gray-300 text-sm px-3 py-1.5 rounded-lg border border-dark-600 focus:border-neon/50 focus:outline-none"
          >
            <option value="all">All levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
          <button
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className={`p-3 rounded-lg border-l-2 ${levelClasses[log.level]} bg-dark-700/30`}
          >
            <div className="flex items-start gap-3">
              {levelIcons[log.level]}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500 font-mono">
                    {formatTime(log.timestamp)}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-dark-600 rounded text-gray-400">
                    {log.module}
                  </span>
                </div>
                <p className="text-sm text-gray-300 break-words">{log.message}</p>
              </div>
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No logs available</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-dark-600 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3 text-blue-400" />
            {logs.filter(l => l.level === 'info').length}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            {logs.filter(l => l.level === 'warn').length}
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-red-400" />
            {logs.filter(l => l.level === 'error').length}
          </span>
        </div>
        <span>Last 24 hours</span>
      </div>
    </div>
  );
}
