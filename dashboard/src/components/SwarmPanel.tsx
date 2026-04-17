import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bug, 
  Play, 
  Square, 
  RotateCw, 
  Target, 
  Send, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Shield,
  Radio
} from 'lucide-react';
import { apiClient } from '../utils/api';

interface SwarmStats {
  roi: {
    totalOutreachCost: number;
    totalRevenue: number;
    conversions: number;
    cac: number;
    ltv: number;
    roi: number;
  };
  scouter: {
    totalScanned: number;
    botsIdentified: number;
    lastScan: string;
    targetsInQueue: number;
  };
  infiltrator: {
    totalSent: number;
    successful: number;
    failed: number;
    queueSize: number;
  };
  executionCount: number;
  isRunning: boolean;
}

export function SwarmPanel() {
  const [stats, setStats] = useState<SwarmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStats = async () => {
    try {
      const response = await apiClient.getSwarmStats();
      if (response.success) {
        setStats(response.stats);
        setLastUpdate(new Date());
        setError(null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setActionLoading('start');
    try {
      await apiClient.startSwarm();
      await fetchStats();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    try {
      await apiClient.stopSwarm();
      await fetchStats();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecute = async () => {
    setActionLoading('execute');
    try {
      await apiClient.executeSwarmCycle();
      await fetchStats();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-gold/60">
          <RotateCw className="w-6 h-6 animate-spin" />
          <span>Carregando Swarm M2M...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Bug className="w-7 h-7 text-dark-900" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-amber-400">SWARM M2M v3.0</h2>
            <p className="text-sm text-gray-400">Colmeia Predadora de Mercado</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Indicator */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${stats?.isRunning ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <Radio className={`w-4 h-4 ${stats?.isRunning ? 'text-green-400 animate-pulse' : 'text-red-400'}`} />
            <span className={`text-sm font-medium ${stats?.isRunning ? 'text-green-400' : 'text-red-400'}`}>
              {stats?.isRunning ? 'OPERACIONAL' : 'PARADO'}
            </span>
          </div>
          
          {/* Control Buttons */}
          {stats?.isRunning ? (
            <button
              onClick={handleStop}
              disabled={actionLoading === 'stop'}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors border border-red-500/30"
            >
              {actionLoading === 'stop' ? <RotateCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              PARAR
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={actionLoading === 'start'}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors border border-green-500/30"
            >
              {actionLoading === 'start' ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              INICIAR
            </button>
          )}
          
          <button
            onClick={handleExecute}
            disabled={actionLoading === 'execute' || !stats?.isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors border border-amber-500/30 disabled:opacity-50"
          >
            {actionLoading === 'execute' ? <RotateCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            EXECUTAR CICLO
          </button>
          
          <button
            onClick={fetchStats}
            className="p-2 bg-dark-800 hover:bg-dark-700 text-gray-400 rounded-lg transition-colors"
          >
            <RotateCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* ROI Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-dark-800/50 backdrop-blur-xl border border-gold/20 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-dark-900" />
              </div>
              <span className="text-xs text-gold/80 tracking-wider">ROI</span>
            </div>
            <span className="text-2xl font-bold text-gold">
              {stats?.roi?.roi?.toFixed(1) || '0'}x
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Revenue:</span>
              <span className="text-gold">${stats?.roi?.totalRevenue?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">CAC:</span>
              <span className="text-amber-400">${stats?.roi?.cac?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">LTV:</span>
              <span className="text-green-400">${stats?.roi?.ltv?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </motion.div>

        {/* Conversions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-dark-800/50 backdrop-blur-xl border border-green-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-dark-900" />
              </div>
              <span className="text-xs text-green-400/80 tracking-wider">CONVERSÕES</span>
            </div>
            <span className="text-2xl font-bold text-green-400">
              {stats?.roi?.conversions || 0}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Taxa:</span>
              <span className="text-green-400">
                {stats?.infiltrator?.totalSent > 0 
                  ? ((stats.roi.conversions / stats.infiltrator.totalSent) * 100).toFixed(1)
                  : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Custo:</span>
              <span className="text-amber-400">${stats?.roi?.totalOutreachCost?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </motion.div>

        {/* Scouter Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-dark-800/50 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-dark-900" />
              </div>
              <span className="text-xs text-cyan-400/80 tracking-wider">SCOUTER</span>
            </div>
            <span className="text-2xl font-bold text-cyan-400">
              {stats?.scouter?.botsIdentified || 0}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Scanned:</span>
              <span className="text-cyan-400">{stats?.scouter?.totalScanned || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Queue:</span>
              <span className="text-amber-400">{stats?.scouter?.targetsInQueue || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Scan:</span>
              <span className="text-gray-400">
                {stats?.scouter?.lastScan 
                  ? new Date(stats.scouter.lastScan).toLocaleTimeString() 
                  : 'N/A'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Infiltrator Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-dark-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                <Send className="w-5 h-5 text-dark-900" />
              </div>
              <span className="text-xs text-purple-400/80 tracking-wider">INFILTRATOR</span>
            </div>
            <span className="text-2xl font-bold text-purple-400">
              {stats?.infiltrator?.successful || 0}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Enviados:</span>
              <span className="text-purple-400">{stats?.infiltrator?.totalSent || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Falhas:</span>
              <span className="text-red-400">{stats?.infiltrator?.failed || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fila:</span>
              <span className="text-amber-400">{stats?.infiltrator?.queueSize || 0}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Execution Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cycle Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-dark-800/30 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-5"
        >
          <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Execução
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Ciclos Completos</span>
              <span className="text-2xl font-bold text-amber-400">{stats?.executionCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Status</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${stats?.isRunning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {stats?.isRunning ? 'AUTÔNOMO' : 'INATIVO'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Última Atualização</span>
              <span className="text-xs text-gray-400">{lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Targets by Source */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-dark-800/30 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-5 lg:col-span-2"
        >
          <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Protocolo M2M Ativo
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-900/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">⛓️</div>
              <div className="text-xs text-gray-400 mb-1">Arbiscan</div>
              <div className="text-lg font-bold text-cyan-400">Scanning</div>
            </div>
            <div className="bg-dark-900/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🐙</div>
              <div className="text-xs text-gray-400 mb-1">GitHub</div>
              <div className="text-lg font-bold text-purple-400">Active</div>
            </div>
            <div className="bg-dark-900/50 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🚀</div>
              <div className="text-xs text-gray-400 mb-1">RapidAPI</div>
              <div className="text-lg font-bold text-green-400">Converting</div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-xs text-amber-400/80 text-center">
              🐝 GXEON_SWARM_M2M_PROPAGATION_v3.0 | ZERO_HUMAN_INTERVENTION | Modo: Colmeia Predadora
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
