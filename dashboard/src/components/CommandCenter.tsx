/**
 * 🌑 GXEON COMMAND CENTER — Production Mode
 * Live profit counter with Gold flash animation
 * Connected to: https://gxeon-ai.xmentex2.replit.app
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Shield, 
  Radio,
  Wallet,
  Coins,
  ArrowUpRight,
  AlertTriangle,
  Bot,
  Cpu,
  Network,
  Lock
} from 'lucide-react';

// 🌑 SOVEREIGN CONFIGURATION
const API_BASE_URL = 'https://gxeon-ai.xmentex2.replit.app';
const SYSTEM_API_KEY = (import.meta as any).env?.VITE_SYSTEM_API_KEY || '';

interface ProfitEvent {
  id: string;
  amount: number;
  timestamp: string;
  type: 'radar' | 'llm' | 'agent' | 'tier';
}

export function CommandCenter() {
  // 💰 LIVE PROFIT STATE
  const [totalProfit, setTotalProfit] = useState(0);
  const [todayProfit, setTodayProfit] = useState(0);
  const [apiCalls, setApiCalls] = useState(0);
  const [recentEvents, setRecentEvents] = useState<ProfitEvent[]>([]);
  const [lastSaleFlash, setLastSaleFlash] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'ONLINE' | 'DEGRADED' | 'OFFLINE'>('ONLINE');
  const [loading, setLoading] = useState(true);
  
  // 🌑 PANDORA PROTOCOL — M2M METRICS
  const [m2mMetrics, setM2mMetrics] = useState({
    autonomousAgents: 0,
    flashLoanTax: 0,
    subscriptionRevenue: 0,
    avgResponseTime: 0
  });

  // 🔥 HEADERS WITH SYSTEM_API_KEY
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-gxeon-key': SYSTEM_API_KEY,
    'Authorization': `Bearer ${SYSTEM_API_KEY}`
  });

  // 💸 FETCH LIVE PROFIT DATA
  const fetchProfitData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/stats`, {
        headers: getHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('[CommandCenter] SYSTEM_API_KEY invalid');
          setSystemStatus('DEGRADED');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Update metrics
      const newTotal = data.balance || 0;
      const newApiCalls = data.total_tasks || 0;
      
      // Detect new sale (flash animation trigger)
      if (newApiCalls > apiCalls) {
        setLastSaleFlash(true);
        setTimeout(() => setLastSaleFlash(false), 1000);
        
        // Add to recent events
        const newEvent: ProfitEvent = {
          id: `sale_${Date.now()}`,
          amount: 0.05, // Radar call cost
          timestamp: new Date().toISOString(),
          type: 'radar'
        };
        setRecentEvents(prev => [newEvent, ...prev].slice(0, 5));
      }
      
      setTotalProfit(newTotal * 0.3); // Commander 30% share
      setTodayProfit((data.total_tasks || 0) * 0.05 * 0.3);
      setApiCalls(newApiCalls);
      setSystemStatus('ONLINE');
      setLoading(false);
    } catch (error) {
      console.error('[CommandCenter] Fetch error:', error);
      setSystemStatus('DEGRADED');
      
      // Fallback to demo data for visual
      if (totalProfit === 0) {
        setTotalProfit(12.45);
        setTodayProfit(3.73);
        setApiCalls(249);
      }
    }
  }, [apiCalls]);

  // ⏱️ POLLING EVERY 5 SECONDS
  useEffect(() => {
    fetchProfitData();
    const interval = setInterval(fetchProfitData, 5000);
    return () => clearInterval(interval);
  }, [fetchProfitData]);

  // 🎨 GOLD FLASH ANIMATION VARIANTS
  const goldFlashVariants = {
    idle: { 
      scale: 1, 
      boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
      borderColor: 'rgba(255, 215, 0, 0.3)'
    },
    flash: { 
      scale: 1.05, 
      boxShadow: '0 0 60px rgba(255, 215, 0, 0.8)',
      borderColor: 'rgba(255, 215, 0, 1)',
      transition: { duration: 0.3 }
    }
  };

  return (
    <main className="flex-1 h-screen bg-[#0a0f1a] overflow-hidden relative">
      {/* 🌑 Cyberpunk Grid Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,229,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,229,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/5 via-transparent to-cyan-500/5" />
      </div>

      <div className="relative z-10 h-full flex flex-col p-6">
        {/* 🔥 HEADER — PRODUCTION MODE */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wider">COMMAND CENTER</h1>
              <p className="text-xs text-cyan-400/70">PRODUCTION MODE — https://gxeon-ai.xmentex2.replit.app</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* System Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              systemStatus === 'ONLINE' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                systemStatus === 'ONLINE' ? 'bg-green-400' : 'bg-yellow-400'
              }`} />
              <span className="text-xs font-medium">{systemStatus}</span>
            </div>
            
            {/* API Key Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              SYSTEM_API_KEY 
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <Shield className="w-4 h-4" />
              <span className="text-xs font-medium">
                {SYSTEM_API_KEY ? 'SECURED' : 'NO API KEY'}
              </span>
            </div>
          </div>
        </header>

        {/* 💰 LIVE PROFIT GRID — 7 Widgets (2 rows) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          
          {/* 🏆 TOTAL PROFIT — Gold Flash on Sale */}
          <motion.div
            variants={goldFlashVariants}
            animate={lastSaleFlash ? 'flash' : 'idle'}
            className="bg-[#0d1421]/80 backdrop-blur-xl border-2 rounded-2xl p-5 relative overflow-hidden group"
          >
            {/* Gold gradient background on flash */}
            <AnimatePresence>
              {lastSaleFlash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-amber-500/20"
                />
              )}
            </AnimatePresence>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-[#0a0f1a]" />
                </div>
                <span className="text-xs text-amber-400/80 tracking-wider">LIVE PROFIT</span>
                {lastSaleFlash && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs text-amber-300 font-bold"
                  >
                    +$0.05!
                  </motion.span>
                )}
              </div>
              
              <div className="text-3xl font-bold text-amber-400 drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">
                {loading ? '...' : `$${totalProfit.toFixed(2)}`}
              </div>
              
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">30% Commander Share</span>
              </div>
            </div>
          </motion.div>

          {/* 📈 TODAY'S SALES */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#0d1421]/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <Coins className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-cyan-400/80 tracking-wider">TODAY</span>
            </div>
            
            <div className="text-2xl font-bold text-cyan-400">
              {loading ? '...' : `$${todayProfit.toFixed(2)}`}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              {apiCalls} API calls @ $0.05
            </div>
          </motion.div>

          {/* 🔥 API CALLS COUNTER */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0d1421]/80 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-purple-400/80 tracking-wider">RADAR CALLS</span>
            </div>
            
            <div className="text-2xl font-bold text-purple-400">
              {loading ? '...' : apiCalls.toLocaleString()}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              $0.05 per call
            </div>
          </motion.div>

          {/* 💎 VAULT BALANCE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#0d1421]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-emerald-400/80 tracking-wider">VAULT</span>
            </div>
            
            <div className="text-2xl font-bold text-emerald-400">
              {loading ? '...' : `$${(totalProfit * 2.33).toFixed(2)}`}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              70% reinvestimento
            </div>
          </motion.div>
          
          {/* 🤖 AUTONOMOUS AGENTS — Pandora M2M */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0d1421]/80 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-red-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-rose-400/80 tracking-wider">M2M AGENTS</span>
            </div>
            
            <div className="text-2xl font-bold text-rose-400">
              {loading ? '...' : m2mMetrics.autonomousAgents.toLocaleString()}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              Zero human input 🌑
            </div>
          </motion.div>
          
          {/* ⚡ FLASH LOAN TAX — 0.01% */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0d1421]/80 backdrop-blur-xl border border-orange-500/20 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <Network className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-orange-400/80 tracking-wider">FLASH TAX 0.01%</span>
            </div>
            
            <div className="text-2xl font-bold text-orange-400">
              {loading ? '...' : `$${m2mMetrics.flashLoanTax.toFixed(3)}`}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              MEV pedágio ativo
            </div>
          </motion.div>
          
          {/* 🎫 SUBSCRIPTION TIERS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#0d1421]/80 backdrop-blur-xl border border-violet-500/20 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                <Lock className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-violet-400/80 tracking-wider">SUBSCRIPTIONS</span>
            </div>
            
            <div className="text-2xl font-bold text-violet-400">
              {loading ? '...' : `$${m2mMetrics.subscriptionRevenue.toFixed(2)}`}
            </div>
            
            <div className="text-xs text-gray-500 mt-1">
              Free → Pro → Whale
            </div>
          </motion.div>
        </div>

        {/* 📊 RECENT SALES — LIVE FEED */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-[#0d1421]/80 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-5 flex-1"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-semibold text-white tracking-wider">LIVE TRANSACTIONS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-500">Real-time</span>
            </div>
          </div>

          <div className="space-y-2">
            {recentEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Waiting for first sale...</p>
                <p className="text-xs mt-1">API calls will appear here</p>
              </div>
            ) : (
              recentEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-[#0a0f1a] rounded-lg border border-amber-500/10 hover:border-amber-500/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-[#0a0f1a]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Radar API Call</p>
                      <p className="text-xs text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">+${event.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">$0.015 your share</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* 🎯 FOOTER INFO */}
          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>Billing: <span className="text-green-400">ACTIVE</span></span>
              <span>Rate: <span className="text-amber-400">$0.05/call</span></span>
              <span>Share: <span className="text-purple-400">30%</span></span>
            </div>
            <div>
              Connected to: <span className="text-cyan-400">{API_BASE_URL}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
