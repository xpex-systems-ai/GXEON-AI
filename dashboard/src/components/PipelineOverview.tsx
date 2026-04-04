import { Activity, CheckCircle, DollarSign, CreditCard, TrendingUp } from 'lucide-react';

interface Metrics {
  pendingTasks: number;
  executedTasks: number;
  totalRewards: number;
  paidRewards: number;
}

export default function PipelineOverview({ metrics }: { metrics: Metrics }) {
  const cards = [
    {
      label: 'Pending Tasks',
      value: metrics.pendingTasks,
      icon: Activity,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/30'
    },
    {
      label: 'Executed Tasks',
      value: metrics.executedTasks,
      icon: CheckCircle,
      color: 'text-neon-DEFAULT',
      bgColor: 'bg-neon-DEFAULT/10',
      borderColor: 'border-neon-DEFAULT/30'
    },
    {
      label: 'Total Rewards',
      value: metrics.totalRewards,
      icon: DollarSign,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/30'
    },
    {
      label: 'Paid Rewards',
      value: metrics.paidRewards,
      icon: CreditCard,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/30'
    }
  ];

  return (
    <section className="bg-cyber-panel border border-cyber-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-neon-DEFAULT/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-neon-DEFAULT" />
          </div>
          <h2 className="text-lg font-semibold text-white">Pipeline Overview</h2>
        </div>
        <div className="text-xs text-cyber-muted">Real-time Metrics</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div 
            key={card.label}
            className={`relative overflow-hidden rounded-lg border ${card.borderColor} ${card.bgColor} p-4 transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-cyber-muted uppercase tracking-wider">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color} mt-1`}>
                  {card.value.toLocaleString()}
                </p>
              </div>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-scan opacity-0 hover:opacity-100" />
          </div>
        ))}
      </div>

      {/* Mini Chart Placeholder */}
      <div className="mt-6 pt-6 border-t border-cyber-border">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-cyber-muted">Pipeline Flow</span>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-xs text-cyber-muted">Queue</span>
            <span className="w-2 h-2 rounded-full bg-neon-DEFAULT ml-2" />
            <span className="text-xs text-cyber-muted">Processing</span>
            <span className="w-2 h-2 rounded-full bg-green-400 ml-2" />
            <span className="text-xs text-cyber-muted">Complete</span>
          </div>
        </div>
        <div className="h-2 bg-cyber-border rounded-full overflow-hidden">
          <div className="flex h-full">
            <div 
              className="bg-yellow-400 transition-all duration-500"
              style={{ width: `${Math.max(5, (metrics.pendingTasks / Math.max(1, metrics.pendingTasks + metrics.executedTasks)) * 100)}%` }}
            />
            <div 
              className="bg-neon-DEFAULT transition-all duration-500"
              style={{ width: '20%' }}
            />
            <div 
              className="bg-green-400 transition-all duration-500"
              style={{ width: `${Math.max(5, (metrics.executedTasks / Math.max(1, metrics.pendingTasks + metrics.executedTasks)) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
