import { Terminal, Clock, Zap, Database, DollarSign } from 'lucide-react';

interface Log {
  id: number;
  timestamp: string;
  type: string;
  event: string;
  details: string;
}

export default function ActivityTimeline({ logs }: { logs: Log[] }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Zap className="w-4 h-4 text-neon-DEFAULT" />;
      case 'reward':
        return <DollarSign className="w-4 h-4 text-purple-400" />;
      case 'payment':
        return <Database className="w-4 h-4 text-green-400" />;
      default:
        return <Terminal className="w-4 h-4 text-cyber-muted" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'task':
        return 'border-neon-DEFAULT/30 bg-neon-DEFAULT/10';
      case 'reward':
        return 'border-purple-400/30 bg-purple-400/10';
      case 'payment':
        return 'border-green-400/30 bg-green-400/10';
      default:
        return 'border-cyber-border bg-cyber-dark';
    }
  };

  // Sample logs if none provided
  const sampleLogs: Log[] = [
    {
      id: 1,
      timestamp: new Date().toISOString(),
      type: 'task',
      event: 'Task Executed',
      details: 'Task ID: c5029330-a091-46f7-9eb8-5783e251467e'
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 30000).toISOString(),
      type: 'reward',
      event: 'Reward Generated',
      details: 'Amount: 0.005 ETH for task completion'
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 60000).toISOString(),
      type: 'payment',
      event: 'Payment Processed',
      details: 'TX: 0x1875a490 - 0.005 ETH transferred'
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 120000).toISOString(),
      type: 'task',
      event: 'Marketplace Task Injected',
      details: 'Auto Task 1 added to pipeline'
    }
  ];

  const displayLogs = logs.length > 0 ? logs : sampleLogs;

  return (
    <section className="bg-cyber-panel border border-cyber-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Autonomous Activity Timeline</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-neon-DEFAULT animate-pulse" />
          <span className="text-xs text-neon-DEFAULT">LIVE</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {displayLogs.map((log, index) => (
          <div 
            key={log.id}
            className={`relative flex items-start space-x-3 p-3 rounded-lg border ${getEventColor(log.type)} transition-all hover:scale-[1.01]`}
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyber-black/50 flex items-center justify-center">
              {getIcon(log.type)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white capitalize">
                  {log.event}
                </span>
                <div className="flex items-center space-x-1 text-xs text-cyber-muted">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(log.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              <p className="text-xs text-cyber-muted truncate font-mono">
                {log.details}
              </p>
            </div>

            {/* Connection line for all but last item */}
            {index < displayLogs.length - 1 && (
              <div className="absolute left-7 top-full w-px h-3 bg-cyber-border" />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-cyber-border">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-neon-DEFAULT" />
            <span className="text-cyber-muted">Execution</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-cyber-muted">Rewards</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-cyber-muted">Payments</span>
          </div>
        </div>
      </div>
    </section>
  );
}
