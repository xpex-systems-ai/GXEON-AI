/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌑 ULTRAGEN GARI FEED v3.0 — Black & Gold HUD with Neon Blue Archeology
 * Digital Archeology: Detects tokens with locked/burned liquidity
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Flame,
  Lock,
  Coins,
  TrendingUp,
  AlertTriangle,
  Zap,
  Target,
  Radio,
  Shield,
  Clock,
  Gem,
  Skull,
  Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
interface DustOpportunity {
  id: string;
  pair_address: string;
  token0_address: string;
  token1_address: string;
  token0_symbol?: string;
  token1_symbol?: string;
  dex_name: string;
  estimated_fees_usd: number;
  gas_cost_usd: number;
  profit_usd: number;
  confidence: number;
  status: 'discovered' | 'notified' | 'claimed' | 'expired' | 'dismissed';
  metadata?: {
    liquidity_locked?: boolean;
    lp_burned?: boolean;
    contract_verified?: boolean;
    honeypot_risk?: boolean;
    mammouth_analysis?: any;
  };
  detected_at: string;
  expires_at: string;
}

interface SignalEvent {
  id: string;
  type: 'EXECUTE_SWAP' | 'ARCHAEOLOGY_HIT' | 'LOCK_DETECTED' | 'BURN_DETECTED';
  timestamp: number;
  opportunity: DustOpportunity;
  net_profit: number;
  priority: 'normal' | 'high' | 'urgent';
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌑 ULTRAGEN GARI FEED COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export function GariFeed() {
  // ───────────────────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────────────────
  const [opportunities, setOpportunities] = useState<DustOpportunity[]>([]);
  const [signals, setSignals] = useState<SignalEvent[]>([]);
  const [archaeologyMode, setArchaeologyMode] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<DustOpportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDiscovered: 0,
    totalProfit: 0,
    lockedDetected: 0,
    burnedDetected: 0,
    highConfidence: 0
  });

  // Neon blue glow states for archaeology mode
  const [neonPulse, setNeonPulse] = useState(false);
  const [archeologyHits, setArcheologyHits] = useState<string[]>([]);

  // ───────────────────────────────────────────────────────────────────────
  // REALTIME SUBSCRIPTION
  // ───────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Subscribe to gari_dust_opportunities changes
    const channel = supabase
      .channel('gari-feed-opportunities')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gari_dust_opportunities'
        },
        (payload) => {
          console.log('[GariFeed] Realtime update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            const opp = payload.new as DustOpportunity;
            setOpportunities(prev => [opp, ...prev].slice(0, 50));
            
            // Check for archaeology indicators
            checkArchaeologyHit(opp);
          } else if (payload.eventType === 'UPDATE') {
            setOpportunities(prev =>
              prev.map(o => o.id === payload.new.id ? (payload.new as DustOpportunity) : o)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('[GariFeed] Subscription status:', status);
      });

    // Subscribe to monetizer signals
    const signalChannel = supabase
      .channel('gxeon_monetizer_signals')
      .on(
        'broadcast',
        { event: 'execute_swap_signal' },
        (payload) => {
          console.log('[GariFeed] Signal received:', payload);
          const signal: SignalEvent = {
            id: payload.payload.guardian?.signal_id || `sig_${Date.now()}`,
            type: 'EXECUTE_SWAP',
            timestamp: payload.payload.timestamp,
            opportunity: payload.payload.opportunity,
            net_profit: payload.payload.economics?.net_profit_usd || 0,
            priority: payload.payload.execution?.priority || 'normal'
          };
          setSignals(prev => [signal, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    // Initial fetch
    fetchOpportunities();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(signalChannel);
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────
  // ARCHAEOLOGY DETECTION
  // ───────────────────────────────────────────────────────────────────────
  const checkArchaeologyHit = useCallback((opportunity: DustOpportunity) => {
    const metadata = opportunity.metadata || {};
    const isLocked = metadata.liquidity_locked;
    const isBurned = metadata.lp_burned;
    
    if (isLocked || isBurned) {
      // Trigger neon blue pulse
      setNeonPulse(true);
      setArcheologyHits(prev => [...prev, opportunity.id]);
      
      // Add signal
      const signal: SignalEvent = {
        id: `arch_${Date.now()}`,
        type: isBurned ? 'BURN_DETECTED' : 'LOCK_DETECTED',
        timestamp: Date.now(),
        opportunity,
        net_profit: opportunity.profit_usd,
        priority: opportunity.confidence > 0.9 ? 'urgent' : 'high'
      };
      setSignals(prev => [signal, ...prev].slice(0, 20));
      
      // Reset pulse after animation
      setTimeout(() => setNeonPulse(false), 3000);
      
      console.log(`🔵 [ARCHAEOLOGY] ${isBurned ? 'LP BURNED' : 'LIQUIDITY LOCKED'} detected:`, opportunity.pair_address);
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ───────────────────────────────────────────────────────────────────────
  const fetchOpportunities = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('gari_dust_opportunities')
        .select('*')
        .eq('status', 'discovered')
        .gt('expires_at', new Date().toISOString())
        .order('profit_usd', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      if (data) {
        setOpportunities(data);
        
        // Calculate stats
        const totalProfit = data.reduce((sum, o) => sum + (o.profit_usd || 0), 0);
        const lockedCount = data.filter(o => o.metadata?.liquidity_locked).length;
        const burnedCount = data.filter(o => o.metadata?.lp_burned).length;
        const highConf = data.filter(o => (o.confidence || 0) >= 0.85).length;
        
        setStats({
          totalDiscovered: data.length,
          totalProfit,
          lockedDetected: lockedCount,
          burnedDetected: burnedCount,
          highConfidence: highConf
        });
        
        // Check existing opportunities for archaeology hits
        data.forEach(checkArchaeologyHit);
      }
    } catch (err) {
      console.error('[GariFeed] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ───────────────────────────────────────────────────────────────────────
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-emerald-400';
    if (conf >= 0.85) return 'text-yellow-400';
    return 'text-orange-400';
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400';
      case 'high': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // 🌑 RENDER
  // ───────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* ═══════════════════════════════════════════════════════════════════
          🌑 HEADER: Black & Gold HUD
         ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-600 via-yellow-400 to-yellow-600 flex items-center justify-center"
              >
                <Search className="w-8 h-8 text-black" />
              </motion.div>
              {/* Neon Blue Glow Ring for Archaeology Mode */}
              {archaeologyMode && (
                <motion.div
                  animate={{ 
                    opacity: neonPulse ? [0.5, 1, 0.5] : [0.3, 0.6, 0.3],
                    scale: neonPulse ? [1, 1.2, 1] : [1, 1.1, 1]
                  }}
                  transition={{ duration: neonPulse ? 0.5 : 2, repeat: Infinity }}
                  className="absolute -inset-2 rounded-full border-2 border-cyan-400 blur-sm"
                  style={{ 
                    boxShadow: neonPulse 
                      ? '0 0 30px #00ffff, 0 0 60px #00ffff, inset 0 0 30px rgba(0,255,255,0.3)' 
                      : '0 0 20px #00ffff, inset 0 0 20px rgba(0,255,255,0.2)'
                  }}
                />
              )}
            </div>
            
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-400 bg-clip-text text-transparent tracking-wider">
                GARI ARCHAEOLOGY
              </h1>
              <p className="text-yellow-600/80 text-sm uppercase tracking-widest">
                Digital Archeology v3.0 • Arbitrum Mainnet
              </p>
            </div>
          </div>

          {/* Archaeology Mode Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setArchaeologyMode(!archaeologyMode)}
            className={`flex items-center gap-3 px-6 py-3 rounded-xl border-2 transition-all ${
              archaeologyMode 
                ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300' 
                : 'border-yellow-600/50 bg-yellow-950/20 text-yellow-600/70'
            }`}
          >
            <Flame className={`w-5 h-5 ${archaeologyMode ? 'animate-pulse' : ''}`} />
            <span className="font-semibold uppercase tracking-wider text-sm">
              {archaeologyMode ? '🔵 Archaeology Active' : 'Archaeology Standby'}
            </span>
          </motion.button>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          📊 STATS ROW: Gold Cards
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { 
            icon: Search, 
            label: 'Discovered', 
            value: stats.totalDiscovered,
            color: 'from-yellow-600 to-yellow-400'
          },
          { 
            icon: Coins, 
            label: 'Total Profit', 
            value: `$${stats.totalProfit.toFixed(2)}`,
            color: 'from-emerald-600 to-emerald-400'
          },
          { 
            icon: Lock, 
            label: 'Locked LP', 
            value: stats.lockedDetected,
            color: 'from-blue-600 to-blue-400',
            neon: true
          },
          { 
            icon: Flame, 
            label: 'Burned LP', 
            value: stats.burnedDetected,
            color: 'from-orange-600 to-orange-400',
            neon: true
          },
          { 
            icon: Target, 
            label: 'High Conf', 
            value: stats.highConfidence,
            color: 'from-purple-600 to-purple-400'
          },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative bg-gradient-to-br from-gray-900 to-black border border-yellow-900/30 rounded-xl p-4 overflow-hidden ${
              stat.neon && archaeologyMode ? 'ring-1 ring-cyan-500/30' : ''
            }`}
          >
            {stat.neon && archaeologyMode && (
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-cyan-500/5"
              />
            )}
            <div className="relative z-10">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="w-5 h-5 text-black" />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          🔵 NEON BLUE ARCHAEOLOGY ALERT
         ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {neonPulse && archaeologyMode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-6 p-4 rounded-xl bg-cyan-950/40 border border-cyan-400/50 relative overflow-hidden"
            style={{ boxShadow: '0 0 40px rgba(0,255,255,0.3), inset 0 0 20px rgba(0,255,255,0.1)' }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cyan-400/20 flex items-center justify-center animate-pulse">
                <Skull className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-cyan-300 uppercase tracking-wider">
                  🏺 Archaeological Discovery!
                </h3>
                <p className="text-cyan-400/80 text-sm">
                  {archeologyHits.length} artifacts with locked/burned liquidity detected
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          📋 MAIN CONTENT: Opportunity Feed
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-3 gap-6">
        {/* Opportunities List */}
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
              <Gem className="w-5 h-5" />
              Active Opportunities
            </h2>
            <button
              onClick={fetchOpportunities}
              className="px-4 py-2 bg-yellow-900/30 border border-yellow-600/50 rounded-lg text-yellow-400 text-sm hover:bg-yellow-900/50 transition-colors"
            >
              Refresh
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-12 h-12 border-4 border-yellow-600/30 border-t-yellow-400 rounded-full"
              />
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              <AnimatePresence>
                {opportunities.map((opp, idx) => {
                  const isArcheologyHit = archeologyHits.includes(opp.id);
                  const hasLocked = opp.metadata?.liquidity_locked;
                  const hasBurned = opp.metadata?.lp_burned;
                  
                  return (
                    <motion.div
                      key={opp.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setSelectedOpportunity(opp)}
                      className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                        isArcheologyHit && archaeologyMode
                          ? 'bg-gradient-to-r from-cyan-950/40 to-black border-cyan-500/50 shadow-lg shadow-cyan-500/20'
                          : 'bg-gradient-to-r from-gray-900 to-black border-yellow-900/30 hover:border-yellow-600/50'
                      }`}
                    >
                      {/* Neon glow for archeology hits */}
                      {isArcheologyHit && archaeologyMode && (
                        <motion.div
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="absolute inset-0 rounded-xl"
                          style={{ boxShadow: 'inset 0 0 20px rgba(0,255,255,0.2)' }}
                        />
                      )}
                      
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Archeology Indicator */}
                          {(hasLocked || hasBurned) && archaeologyMode && (
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400/50"
                            >
                              {hasBurned ? (
                                <Flame className="w-5 h-5 text-cyan-300" />
                              ) : (
                                <Lock className="w-5 h-5 text-cyan-300" />
                              )}
                            </motion.div>
                          )}
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-gray-400">
                                {formatAddress(opp.pair_address)}
                              </span>
                              <span className="px-2 py-0.5 bg-yellow-900/30 rounded text-xs text-yellow-400">
                                {opp.dex_name}
                              </span>
                              {hasBurned && (
                                <span className="px-2 py-0.5 bg-cyan-900/30 rounded text-xs text-cyan-300 border border-cyan-500/30">
                                  🔥 LP BURNED
                                </span>
                              )}
                              {hasLocked && !hasBurned && (
                                <span className="px-2 py-0.5 bg-blue-900/30 rounded text-xs text-blue-300 border border-blue-500/30">
                                  🔒 LP LOCKED
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm">
                              <span className="text-emerald-400 font-semibold">
                                +${opp.profit_usd?.toFixed(2)}
                              </span>
                              <span className="text-gray-500">
                                Gas: ${opp.gas_cost_usd?.toFixed(2)}
                              </span>
                              <span className={`${getConfidenceColor(opp.confidence || 0)}`}>
                                {(opp.confidence || 0).toFixed(2)} conf
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Clock className="w-4 h-4 text-gray-500 inline mr-1" />
                          <span className="text-xs text-gray-500">
                            {new Date(opp.expires_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Signals Panel */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-5 h-5" />
            Live Signals
          </h2>
          
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            <AnimatePresence>
              {signals.map((signal, idx) => (
                <motion.div
                  key={signal.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-3 rounded-lg border ${
                    signal.type === 'EXECUTE_SWAP'
                      ? 'bg-emerald-950/30 border-emerald-500/30'
                      : signal.type === 'BURN_DETECTED'
                      ? 'bg-cyan-950/30 border-cyan-500/30'
                      : 'bg-blue-950/30 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {signal.type === 'EXECUTE_SWAP' ? (
                      <Zap className="w-4 h-4 text-emerald-400" />
                    ) : signal.type === 'BURN_DETECTED' ? (
                      <Flame className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-blue-400" />
                    )}
                    <span className={`text-xs font-bold uppercase ${getPriorityColor(signal.priority)}`}>
                      {signal.type}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">
                    {formatAddress(signal.opportunity.pair_address)}
                  </div>
                  <div className="text-xs text-emerald-400 mt-1">
                    +${signal.net_profit.toFixed(2)}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {signals.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No signals yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          📋 OPPORTUNITY DETAIL MODAL
         ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedOpportunity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedOpportunity(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-gradient-to-br from-gray-900 to-black border border-yellow-600/30 rounded-2xl p-8 max-w-2xl w-full"
              style={{ boxShadow: '0 0 60px rgba(234,179,8,0.2)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-yellow-400 uppercase tracking-wider">
                  Opportunity Details
                </h2>
                <button
                  onClick={() => setSelectedOpportunity(null)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-black/50 rounded-xl border border-yellow-900/20">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Pair Address</div>
                    <div className="font-mono text-sm text-yellow-400">{selectedOpportunity.pair_address}</div>
                  </div>
                  <div className="p-4 bg-black/50 rounded-xl border border-yellow-900/20">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">DEX</div>
                    <div className="text-lg font-bold text-white">{selectedOpportunity.dex_name}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Profit</div>
                    <div className="text-2xl font-bold text-emerald-400">
                      +${selectedOpportunity.profit_usd?.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-yellow-950/20 rounded-xl border border-yellow-500/20">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Est. Fees</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      ${selectedOpportunity.estimated_fees_usd?.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-red-950/20 rounded-xl border border-red-500/20">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Gas Cost</div>
                    <div className="text-2xl font-bold text-red-400">
                      -${selectedOpportunity.gas_cost_usd?.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Archaeology Metadata */}
                {(selectedOpportunity.metadata?.liquidity_locked || selectedOpportunity.metadata?.lp_burned) && (
                  <div className="p-4 bg-cyan-950/20 rounded-xl border border-cyan-500/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-cyan-400" />
                      <span className="text-cyan-300 font-bold uppercase tracking-wider">
                        🔍 Archaeological Analysis
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedOpportunity.metadata?.liquidity_locked && (
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-blue-400" />
                          <span className="text-sm text-blue-300">Liquidity Locked</span>
                        </div>
                      )}
                      {selectedOpportunity.metadata?.lp_burned && (
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm text-cyan-300">LP Tokens Burned</span>
                        </div>
                      )}
                      {selectedOpportunity.metadata?.contract_verified && (
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm text-emerald-300">Contract Verified</span>
                        </div>
                      )}
                      {selectedOpportunity.metadata?.honeypot_risk && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-sm text-red-300">Honeypot Risk</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-yellow-900/30">
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`w-5 h-5 ${getConfidenceColor(selectedOpportunity.confidence || 0)}`} />
                    <span className="text-sm text-gray-400">
                      Confidence: <span className={getConfidenceColor(selectedOpportunity.confidence || 0)}>
                        {((selectedOpportunity.confidence || 0) * 100).toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Detected: {new Date(selectedOpportunity.detected_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GariFeed;
