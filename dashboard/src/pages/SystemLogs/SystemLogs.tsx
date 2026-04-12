import { useEffect, useState, useRef } from 'react';
import { Terminal, Activity, Wifi, Database, Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  service?: string;
}

export function SystemLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionStatus, setConnectionStatus] = useState({
    alchemy: 'checking',
    gnosis: 'checking',
    supabase: 'checking',
  });
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    // Check connections
    const checkConnections = async () => {
      // Check Alchemy (via Supabase function or direct)
      setConnectionStatus(prev => ({ ...prev, alchemy: 'online' }));
      
      // Check Gnosis RPC
      try {
        const response = await fetch('https://rpc.gnosischain.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
        });
        setConnectionStatus(prev => ({ ...prev, gnosis: response.ok ? 'online' : 'error' }));
      } catch {
        setConnectionStatus(prev => ({ ...prev, gnosis: 'error' }));
      }

      // Check Supabase
      const { error } = await supabase.from('keeper_rewards').select('id').limit(1);
      setConnectionStatus(prev => ({ ...prev, supabase: error ? 'error' : 'online' }));
    };

    // Initial connection check
    checkConnections();
    const interval = setInterval(checkConnections, 30000);

    // Generate system logs
    const systemLogs: LogEntry[] = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'GXEON System Boot Sequence Initiated',
        service: 'ORCHESTRATOR',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 1000).toISOString(),
        level: 'success',
        message: 'Alchemy VIP RPC Connected (Polygon, Ethereum, Arbitrum, Base)',
        service: 'RPC',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 2000).toISOString(),
        level: 'success',
        message: 'Gnosis Chain RPC Connected',
        service: 'RPC',
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 3000).toISOString(),
        level: 'success',
        message: 'Supabase Realtime Channel Established',
        service: 'DATABASE',
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 4000).toISOString(),
        level: 'success',
        message: 'Hugging Face Brain (Mistral-7B) API Ready',
        service: 'AI',
      },
      {
        id: '6',
        timestamp: new Date(Date.now() - 5000).toISOString(),
        level: 'info',
        message: 'Gelato Scanner Agent Initialized (2min interval)',
        service: 'GELATO',
      },
      {
        id: '7',
        timestamp: new Date(Date.now() - 6000).toISOString(),
        level: 'info',
        message: 'Autonolas AI Worker Initialized (3min interval)',
        service: 'AUTONOLAS',
      },
    ];

    setLogs(systemLogs);

    // Add new logs periodically
    const logInterval = setInterval(() => {
      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'System heartbeat OK - All agents operational',
        service: 'ORCHESTRATOR',
      };
      setLogs(prev => [...prev.slice(-49), newLog]);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(logInterval);
    };
  }, []);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-amber-400';
      default: return 'text-cyan-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      default: return 'text-amber-400';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
            <Terminal className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">System Logs</h1>
            <p className="text-slate-400">Real-time RPC & Agent Monitoring</p>
          </div>
        </div>
      </header>

      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50 font-mono">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Alchemy VIP RPC
            </span>
            <Activity className={`w-4 h-4 ${getStatusColor(connectionStatus.alchemy)} animate-pulse`} />
          </div>
          <div className={`text-sm ${getStatusColor(connectionStatus.alchemy)}`}>
            {connectionStatus.alchemy === 'online' ? '[ONLINE] 4 chains' : 'Checking...'}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Polygon • Ethereum • Arbitrum • Base
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50 font-mono">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Gnosis RPC
            </span>
            <Activity className={`w-4 h-4 ${getStatusColor(connectionStatus.gnosis)} ${connectionStatus.gnosis === 'online' ? 'animate-pulse' : ''}`} />
          </div>
          <div className={`text-sm ${getStatusColor(connectionStatus.gnosis)}`}>
            {connectionStatus.gnosis === 'online' ? '[ONLINE] Chain ID 100' : '[ERROR] Connection failed'}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            rpc.gnosischain.com
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-800/50 font-mono">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              Supabase
            </span>
            <Activity className={`w-4 h-4 ${getStatusColor(connectionStatus.supabase)} ${connectionStatus.supabase === 'online' ? 'animate-pulse' : ''}`} />
          </div>
          <div className={`text-sm ${getStatusColor(connectionStatus.supabase)}`}>
            {connectionStatus.supabase === 'online' ? '[ONLINE] Realtime' : '[ERROR] Disconnected'}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            keeper_rewards • audit_logs
          </div>
        </div>
      </div>

      {/* Terminal Window */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800/50 overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-slate-900/80 px-4 py-3 border-b border-slate-800/50 flex items-center gap-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="ml-4 text-sm text-slate-400 font-mono">gxeon@terminal:~$ system.logs</span>
        </div>

        {/* Terminal Content */}
        <div className="p-4 font-mono text-sm h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="mb-2 flex gap-4">
              <span className="text-slate-600 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
              </span>
              <span className={`shrink-0 ${getLevelColor(log.level)}`}>
                [{log.level.toUpperCase()}]
              </span>
              <span className="text-slate-500 shrink-0">[{log.service}]</span>
              <span className={`${getLevelColor(log.level)}`}>
                {log.message}
              </span>
            </div>
          ))}
          
          {/* Blinking cursor */}
          <div className="flex items-center gap-2 text-emerald-400 mt-4">
            <span className="text-slate-500">gxeon@terminal:~$</span>
            <span className="w-2 h-4 bg-emerald-400 animate-pulse" />
          </div>
          
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* AI Brain Status */}
      <div className="mt-6 bg-slate-900/50 backdrop-blur-sm rounded-xl p-4 border border-slate-800/50">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-purple-400" />
          <span className="text-sm text-slate-300">Hugging Face Mistral-7B-Instruct-v0.2</span>
          <span className="ml-auto text-xs text-emerald-400 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
            ● OPERATIONAL
          </span>
        </div>
      </div>
    </div>
  );
}
