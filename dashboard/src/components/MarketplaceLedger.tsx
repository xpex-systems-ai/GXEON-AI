import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Calendar, MoreHorizontal, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: string;
  created_at: string;
}

export default function MarketplaceLedger({ supabase }: { supabase: any }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    
    const channel = supabase
      .channel('marketplace-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_marketplace' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_marketplace')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'open':
        return <div className="w-2 h-2 rounded-full bg-neon-DEFAULT" />;
      default:
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-400/20 text-green-400 border-green-400/30';
      case 'processing':
        return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
      case 'open':
        return 'bg-neon-DEFAULT/20 text-neon-DEFAULT border-neon-DEFAULT/30';
      default:
        return 'bg-red-400/20 text-red-400 border-red-400/30';
    }
  };

  return (
    <section className="bg-cyber-panel border border-cyber-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">Marketplace & Task Ledger</h2>
        </div>
        <span className="text-xs text-cyber-muted">{tasks.length} Total Tasks</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-cyber-dark border border-cyber-border rounded-lg text-sm text-white placeholder-cyber-muted focus:outline-none focus:border-neon-DEFAULT/50 transition-colors"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 bg-cyber-dark border border-cyber-border rounded-lg text-sm text-white focus:outline-none focus:border-neon-DEFAULT/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cyber-border">
              <th className="text-left py-3 px-3 text-xs font-medium text-cyber-muted uppercase tracking-wider">Task</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-cyber-muted uppercase tracking-wider">Reward</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-cyber-muted uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-cyber-muted uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyber-border/50">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-cyber-muted">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-neon-DEFAULT border-t-transparent rounded-full animate-spin" />
                    <span>Loading tasks...</span>
                  </div>
                </td>
              </tr>
            ) : filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-cyber-muted">
                  No tasks found
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-cyber-dark/50 transition-colors">
                  <td className="py-3 px-3">
                    <div>
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      <p className="text-xs text-cyber-muted truncate max-w-[200px]">
                        {task.description}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-sm font-medium text-neon-DEFAULT">
                      {task.reward} ETH
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(task.status)}`}>
                      {getStatusIcon(task.status)}
                      <span className="capitalize">{task.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-1 text-xs text-cyber-muted">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-cyber-border flex items-center justify-between text-xs text-cyber-muted">
          <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
          <button className="flex items-center space-x-1 hover:text-white transition-colors">
            <span>View All</span>
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
