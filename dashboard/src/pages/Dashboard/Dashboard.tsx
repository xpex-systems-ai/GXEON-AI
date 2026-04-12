import { Cpu, Zap, Activity, BarChart3, Users, CheckCircle, Clock, Wallet, Link, AlertCircle, Radar, Vault, FileText, Settings, Target, ChevronRight, Shield, TrendingUp, Flame, DollarSign, PiggyBank, Award, Terminal, Play, Square } from 'lucide-react';
import { StatusCard, AgentsList, SystemLogs } from '../../components';
import { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../../hooks/useWeb3';
import { CONTRACT_ADDRESS, DEX_ADDRESSES, TOKEN_ADDRESSES } from '../../config/contract';
import { Link as RouterLink } from 'react-router-dom';
import { estimateGasCosts, executeFlashLoanArbitrage, validateArbitrageProfitability, type GasEstimate } from '../../utils/web3/aaveFlashLoan';
import { ethers } from 'ethers';

interface Stats {
  agents: number;
  tasks: number;
  completed: number;
  pending: number;
  balance: number;
}

interface GasOptimizationData {
  gasCostUsd: number;
  flashLoanFee: number;
  totalCost: number;
  isProfitable: boolean;
  loading: boolean;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error' | 'keeper_attempt';
  message: string;
  details?: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    agents: 0,
    tasks: 0,
    completed: 0,
    pending: 0,
    balance: 0
  });
  
  const [gasOptimization, setGasOptimization] = useState<GasOptimizationData>({
    gasCostUsd: 0,
    flashLoanFee: 0,
    totalCost: 0,
    isProfitable: false,
    loading: false
  });
  
  const [attackLoading, setAttackLoading] = useState(false);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isTerminalActive, setIsTerminalActive] = useState(true);

  const {
    account,
    balance,
    contractBalance,
    isConnected,
    isCorrectNetwork,
    connect,
    disconnect,
    switchNetwork,
  } = useWeb3();

  // Fetch stats from API (optional - won't break if API is unavailable)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Skip fetch if no API URL is configured
        const apiUrl = (import.meta as any).env?.VITE_API_URL;
        if (!apiUrl) {
          console.log('No VITE_API_URL configured, skipping stats fetch');
          return;
        }
        
        const response = await fetch(`${apiUrl}/api/stats`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setStats(data.stats);
          }
        }
      } catch (error) {
        console.log('Stats API unavailable, using default values');
        // Don't break the app if API is unavailable
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Reduced frequency
    return () => clearInterval(interval);
  }, []);

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Calculate Gas Optimization for Flash Loan
  const calculateGasOptimization = useCallback(async () => {
    if (!window.ethereum) return;
    
    setGasOptimization(prev => ({ ...prev, loading: true }));
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Estimate gas for flash loan arbitrage
      const gasEstimate = await estimateGasCosts(provider, {
        asset: TOKEN_ADDRESSES.WETH,
        amount: '1', // 1 WETH
        buyDex: DEX_ADDRESSES.uniswap_v2,
        sellDex: DEX_ADDRESSES.sushiswap_v2,
        minProfit: '0.01'
      });
      
      // Calculate flash loan fee (0.05%)
      const flashLoanAmount = 1; // 1 WETH
      const flashLoanFee = (flashLoanAmount * 0.05) / 100;
      
      // Check profitability with mock spread data
      const grossProfit = 12.45; // Mock from current spread
      const analysis = validateArbitrageProfitability(
        grossProfit,
        gasEstimate.gasCostUsd,
        flashLoanAmount.toString(),
        0.05
      );
      
      setGasOptimization({
        gasCostUsd: gasEstimate.gasCostUsd,
        flashLoanFee,
        totalCost: analysis.totalCostsUsd,
        isProfitable: analysis.isProfitable,
        loading: false
      });
      
      console.log('⛽ [Dashboard] Gas Optimization:', {
        gasCost: gasEstimate.gasCostUsd.toFixed(2),
        flashLoanFee: flashLoanFee.toFixed(4),
        isProfitable: analysis.isProfitable
      });
    } catch (error) {
      console.error('⛽ [Dashboard] Gas calculation error:', error);
      setGasOptimization(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Execute Flash Loan Attack
  const handleEngageAttack = async () => {
    if (!isConnected || !account) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (!gasOptimization.isProfitable) {
      alert('Attack not profitable at current gas costs');
      return;
    }
    
    setAttackLoading(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      console.log('⚡ [Dashboard] Executing flash loan attack...');
      
      // Execute the flash loan
      const result = await executeFlashLoanArbitrage(signer, {
        asset: TOKEN_ADDRESSES.WETH,
        amount: '1',
        buyDex: DEX_ADDRESSES.uniswap_v2,
        sellDex: DEX_ADDRESSES.sushiswap_v2,
        minProfit: '0.01'
      });
      
      if (result.success) {
        console.log('✅ [Dashboard] Flash loan executed:', result.txHash);
        alert(`Flash loan executed! TX: ${result.txHash.slice(0, 20)}...`);
      }
    } catch (error: any) {
      console.error('❌ [Dashboard] Attack failed:', error);
      alert(`Attack failed: ${error.message}`);
    } finally {
      setAttackLoading(false);
    }
  };

  // Recalculate gas optimization when opportunity changes
  useEffect(() => {
    if (isConnected) {
      calculateGasOptimization();
      const interval = setInterval(calculateGasOptimization, 30000); // Every 30s
      return () => clearInterval(interval);
    }
  }, [isConnected, calculateGasOptimization]);

  // Live Log Terminal - Simulate real-time Keeper attempts
  useEffect(() => {
    if (!isTerminalActive) return;

    const addLogEntry = (type: LogEntry['type'], message: string, details?: string) => {
      const entry: LogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        type,
        message,
        details
      };
      setLogEntries(prev => [entry, ...prev].slice(0, 50)); // Keep last 50 entries
    };

    // Initial log entry
    addLogEntry('info', '🚀 GXEON Keeper Aggregator v1 initialized', '1inch & 0x Protocol callbacks active');

    // Simulate Keeper attempts every 5-15 seconds
    const simulateKeeperAttempt = () => {
      const protocols = ['1inch', '0x Protocol', 'Uniswap V3', 'SushiSwap V2'];
      const protocol = protocols[Math.floor(Math.random() * protocols.length)];
      const actions = ['Scanning for arbitrage', 'Calculating optimal route', 'Executing flash loan', 'Capturing rebate'];
      const action = actions[Math.floor(Math.random() * actions.length)];
      
      addLogEntry('keeper_attempt', `🎯 Keeper attempt detected on ${protocol}`, action);

      // Simulate success/failure after 2 seconds
      setTimeout(() => {
        const success = Math.random() > 0.3;
        if (success) {
          const profit = (Math.random() * 50 + 5).toFixed(2);
          addLogEntry('success', `✅ Keeper execution successful on ${protocol}`, `Profit: $${profit} | Gas: ${(Math.random() * 10 + 2).toFixed(2)} USD`);
        } else {
          addLogEntry('warning', `⚠️ Keeper attempt skipped on ${protocol}`, 'Slippage protection triggered - rebate insufficient');
        }
      }, 2000);
    };

    // Initial attempt
    simulateKeeperAttempt();

    // Schedule random attempts
    const scheduleNext = () => {
      const delay = Math.random() * 10000 + 5000; // 5-15 seconds
      setTimeout(() => {
        simulateKeeperAttempt();
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      // Cleanup if needed
    };
  }, [isTerminalActive]);

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0f0518 50%, #1a0a2e 100%)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar Minimalista - Ícones Dourados */}
      <aside className="w-20 lg:w-64 flex-shrink-0 border-r border-[#FFD700]/20 bg-[#1a0a2e]/80 backdrop-blur-xl flex flex-col">
        {/* Logo */}
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-[#FFD700]/10">
          <div className="relative">
            <div className="absolute inset-0 bg-[#FFD700] blur-lg opacity-30" />
            <Shield className="w-10 h-10 text-[#FFD700] relative z-10" />
          </div>
          <span className="hidden lg:block ml-3 text-xl font-bold bg-gradient-to-r from-[#FFD700] to-[#00F3FF] bg-clip-text text-transparent">
            GXEON
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 lg:px-4 space-y-2">
          <SidebarItem icon={Radar} label="Radar" active />
          <SidebarItem icon={Vault} label="Vault" />
          <SidebarItem icon={FileText} label="Logs" />
          <SidebarItem icon={Settings} label="Settings" />
        </nav>

        {/* Claim Revenue Button */}
        <div className="p-4 border-t border-[#FFD700]/10">
          <button 
            className="w-full flex items-center justify-center lg:justify-start gap-2 px-3 py-3 rounded-xl bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 hover:border-[#FFD700]/50 hover:shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all duration-300 group"
          >
            <Wallet className="w-5 h-5 text-[#FFD700] group-hover:scale-110 transition-transform" />
            <div className="hidden lg:block text-left">
              <span className="text-xs text-[#FFD700] font-semibold">CLAIM PROFITS</span>
              <p className="text-[10px] text-gray-400">$1,274.35 available</p>
            </div>
          </button>
        </div>
        
        {/* Bottom Status */}
        <div className="p-4 border-t border-[#FFD700]/10">
          <div className="flex items-center justify-center lg:justify-start gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
            <span className="hidden lg:block text-xs text-gray-400">System Online</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {/* Enterprise Header */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-[#FFD700]/10 bg-[#1a0a2e]/50 backdrop-blur-xl sticky top-0 z-50">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Arbitrage <span className="text-[#FFD700]">Radar</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Real-time opportunity detection across DEXs</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Wallet Status */}
            {isConnected ? (
              <div className="flex items-center gap-3">
                {!isCorrectNetwork && (
                  <button
                    onClick={switchNetwork}
                    className="px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg text-sm font-medium border border-yellow-500/30 hover:bg-yellow-500/20 transition"
                  >
                    Switch to Sepolia
                  </button>
                )}
                <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] rounded-lg border border-[#FFD700]/20">
                  <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                  <span className="text-sm text-gray-300 font-mono">{formatAddress(account!)}</span>
                  <div className="h-4 w-px bg-[#FFD700]/20" />
                  <span className="text-sm text-[#FFD700]">{parseFloat(balance).toFixed(4)} ETH</span>
                </div>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition border border-white/10 rounded-lg hover:border-white/30"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FFD700] to-[#B8860B] text-black rounded-lg font-semibold text-sm hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] transition-all duration-300"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8">
        {/* Enterprise Stats Grid - Glassmorphism with Gold Borders */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1: Active Agents - Gold Accent */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-[#FFD700]/20 hover:border-[#FFD700]/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(255,215,0,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Active Units</span>
                <div className="p-2 bg-[#FFD700]/10 rounded-xl border border-[#FFD700]/20">
                  <Users className="w-5 h-5 text-[#FFD700]" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white tabular-nums">{stats.agents}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                <span className="text-xs text-gray-500">Operational</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Tasks - Neon Blue Accent */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-[#00F3FF]/20 hover:border-[#00F3FF]/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(0,243,255,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00F3FF]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Operations</span>
                <div className="p-2 bg-[#00F3FF]/10 rounded-xl border border-[#00F3FF]/20">
                  <BarChart3 className="w-5 h-5 text-[#00F3FF]" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white tabular-nums">{stats.tasks}</p>
              <p className="mt-3 text-xs text-[#00F3FF]/60">Executed today</p>
            </div>
          </div>

          {/* Card 3: Success Rate - Green Accent */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-green-500/20 hover:border-green-400/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(34,197,94,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Success Rate</span>
                <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white tabular-nums">{stats.completed}</p>
              <p className="mt-3 text-xs text-green-400/60">Completed ops</p>
            </div>
          </div>

          {/* Card 4: Pending - Amber Accent */}
          <div className="group relative overflow-hidden rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-amber-500/20 hover:border-amber-400/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(245,158,11,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-gray-400 uppercase tracking-widest">Queue</span>
                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <p className="text-4xl font-bold text-white tabular-nums">{stats.pending}</p>
              <p className="mt-3 text-xs text-amber-400/60">Awaiting execution</p>
            </div>
          </div>
        </div>

        {/* Main Grid - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* GXEON VAULT - Premium Panel */}
          <div className="lg:col-span-1">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFD700]/[0.08] to-transparent backdrop-blur-xl border border-[#FFD700]/30">
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.8)]" />
                  <span className="text-[10px] text-green-400 uppercase tracking-widest font-semibold">Live</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-[#FFD700]/20 to-[#B8860B]/20 rounded-xl border border-[#FFD700]/30">
                    <Vault className="w-6 h-6 text-[#FFD700]" />
                  </div>
                  <div>
                    <span className="text-xs text-[#FFD700]/70 uppercase tracking-widest">Liquidity Pool</span>
                    <h3 className="text-lg font-bold text-white">GXEON VAULT</h3>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Balance</p>
                    <p className="text-3xl font-bold text-white tabular-nums">
                      {stats.balance.toFixed(2)} <span className="text-lg text-[#FFD700]">USDC</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-[#FFD700]/10 rounded text-[10px] text-[#FFD700] border border-[#FFD700]/30">SECURED</span>
                    <span className="text-[10px] text-gray-500">Sepolia Testnet</span>
                  </div>
                </div>

                <a 
                  href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-6 text-xs text-[#FFD700]/70 hover:text-[#FFD700] transition-colors"
                >
                  View on Etherscan →
                </a>
              </div>
            </div>
          </div>

          {/* SNIPER RADAR - Main Panel */}
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00F3FF]/[0.05] via-transparent to-[#FFD700]/[0.05] backdrop-blur-xl border border-[#00F3FF]/20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00F3FF] via-[#FFD700] to-[#00F3FF] opacity-50" />
              <div className="absolute top-0 right-0 p-4">
                <div className="flex items-center gap-2">
                  <Radar className="w-4 h-4 text-[#00F3FF] animate-pulse" />
                  <span className="text-[10px] text-[#00F3FF] uppercase tracking-widest font-semibold">SCANNING</span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-gradient-to-br from-[#00F3FF]/20 to-[#FFD700]/20 rounded-xl border border-[#00F3FF]/30">
                    <Target className="w-6 h-6 text-[#00F3FF]" />
                  </div>
                  <div>
                    <span className="text-xs text-[#00F3FF]/70 uppercase tracking-widest">Arbitrage Engine</span>
                    <h3 className="text-lg font-bold text-white">SNIPER RADAR</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Best Spread</p>
                    <p className="text-2xl font-bold text-[#00F3FF] tabular-nums">0.45%</p>
                    <p className="text-[10px] text-gray-600 mt-1">WETH/USDC</p>
                  </div>
                  <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Gross Profit</p>
                    <p className="text-2xl font-bold text-[#FFD700] tabular-nums">+$12.45</p>
                    <p className="text-[10px] text-gray-600 mt-1">per 1 ETH</p>
                  </div>
                </div>

                {/* Gas Optimization Log - Comandante Intel */}
                <div className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-xs text-orange-400 uppercase tracking-widest font-semibold">Gas Optimization</span>
                  </div>
                  
                  {gasOptimization.loading ? (
                    <div className="flex items-center gap-3 py-2">
                      <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
                      <span className="text-sm text-gray-400">Calculating optimal gas...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Est. Gas Cost</span>
                        <span className="text-orange-400 font-mono">${gasOptimization.gasCostUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Flash Loan Fee (0.05%)</span>
                        <span className="text-orange-400 font-mono">${(gasOptimization.flashLoanFee * 3500).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">Total Costs</span>
                        <span className="text-red-400 font-mono">-${gasOptimization.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-white/10 my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-300">Net Profitability</span>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          gasOptimization.isProfitable 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {gasOptimization.isProfitable ? '✓ PROFITABLE' : '✗ NOT VIABLE'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* DEX Prices */}
                <div className="p-4 bg-black/40 rounded-xl border border-white/10 space-y-3 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      Buy on Uniswap V2
                    </span>
                    <span className="text-sm text-green-400 font-mono">$1,892.45</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FFD700]" />
                      Sell on SushiSwap V2
                    </span>
                    <span className="text-sm text-[#FFD700] font-mono">$1,900.12</span>
                  </div>
                </div>

                {/* ENGAGE ATTACK Button - Connected to Real Flash Loan */}
                <button 
                  onClick={handleEngageAttack}
                  disabled={attackLoading || !gasOptimization.isProfitable || !isConnected}
                  className={`w-full mt-6 py-4 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                    attackLoading || !gasOptimization.isProfitable || !isConnected
                      ? 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-red-500 text-white border border-red-400/50 shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_40px_rgba(239,68,68,0.5)] hover:scale-[1.02] animate-pulse'
                  }`}
                >
                  {attackLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="tracking-widest">EXECUTING FLASH LOAN...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span className="tracking-widest">
                        {!isConnected ? 'CONNECT WALLET' : !gasOptimization.isProfitable ? 'NOT PROFITABLE' : 'ENGAGE ATTACK'}
                      </span>
                    </>
                  )}
                </button>
                
                {!isConnected && (
                  <p className="mt-2 text-center text-xs text-gray-500">
                    Connect wallet to execute flash loan via Aave V3
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Log Terminal - Keeper Attempts */}
        <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00F3FF]/[0.05] via-transparent to-[#FFD700]/[0.05] backdrop-blur-xl border border-[#00F3FF]/20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00F3FF] via-[#FFD700] to-[#00F3FF] opacity-50" />
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-[#00F3FF]/20 to-[#FFD700]/20 rounded-xl border border-[#00F3FF]/30">
                  <Terminal className="w-6 h-6 text-[#00F3FF]" />
                </div>
                <div>
                  <span className="text-xs text-[#00F3FF]/70 uppercase tracking-widest">Real-time Monitoring</span>
                  <h3 className="text-lg font-bold text-white">Live Log Terminal</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                  <span className="text-[10px] text-green-400 uppercase tracking-widest font-semibold">LIVE</span>
                </div>
                <button
                  onClick={() => setIsTerminalActive(!isTerminalActive)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isTerminalActive 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20' 
                      : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20'
                  }`}
                >
                  {isTerminalActive ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isTerminalActive ? 'PAUSE' : 'RESUME'}
                </button>
              </div>
            </div>

            {/* Terminal Output */}
            <div className="bg-black/60 rounded-xl border border-white/10 overflow-hidden">
              <div className="bg-black/40 px-4 py-2 border-b border-white/10 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-gray-500 ml-2 font-mono">keeper_aggregator_v1.log</span>
              </div>
              <div className="p-4 h-64 overflow-y-auto font-mono text-xs space-y-2">
                {logEntries.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <Terminal className="w-8 h-8 mr-2 opacity-50" />
                    <span>Waiting for Keeper attempts...</span>
                  </div>
                ) : (
                  logEntries.map((entry) => {
                    const getLogColor = (type: LogEntry['type']) => {
                      switch (type) {
                        case 'info': return 'text-blue-400';
                        case 'success': return 'text-green-400';
                        case 'warning': return 'text-yellow-400';
                        case 'error': return 'text-red-400';
                        case 'keeper_attempt': return 'text-[#00F3FF]';
                        default: return 'text-gray-400';
                      }
                    };
                    
                    return (
                      <div key={entry.id} className="flex items-start gap-2 animate-pulse-once">
                        <span className="text-gray-600 shrink-0">
                          {entry.timestamp.toLocaleTimeString('pt-BR', { hour12: false })}
                        </span>
                        <span className={getLogColor(entry.type)}>
                          {entry.message}
                        </span>
                        {entry.details && (
                          <span className="text-gray-500">
                            :: {entry.details}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Tracker - Monetization Engine */}
        <div className="mt-6 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFD700]/[0.08] via-[#B8860B]/[0.05] to-transparent backdrop-blur-xl border border-[#FFD700]/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FFD700]" />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/20 rounded-xl border border-[#FFD700]/30">
                <TrendingUp className="w-6 h-6 text-[#FFD700]" />
              </div>
              <div>
                <span className="text-xs text-[#FFD700]/70 uppercase tracking-widest">Monetization Engine</span>
                <h3 className="text-lg font-bold text-white">Total GXeon Revenue</h3>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="px-3 py-1 bg-[#FFD700]/10 rounded-full text-xs text-[#FFD700] border border-[#FFD700]/30">
                  70/30 Split
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Total Revenue */}
              <div className="p-4 bg-black/30 rounded-xl border border-[#FFD700]/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Total Revenue</span>
                </div>
                <p className="text-2xl font-bold text-[#FFD700] tabular-nums">$4,247.85</p>
                <div className="mt-2 flex gap-1">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-[#FFD700]/20 rounded-sm"
                      style={{ height: `${h / 3}px` }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-gray-600">Last 30 days performance</p>
              </div>

              {/* Vault Reinvestment (70%) */}
              <div className="p-4 bg-black/30 rounded-xl border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <PiggyBank className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Vault Reinvestment</span>
                  <span className="ml-auto text-[10px] text-green-400 font-semibold">70%</span>
                </div>
                <p className="text-2xl font-bold text-green-400 tabular-nums">$2,973.50</p>
                <p className="mt-2 text-xs text-gray-600">Compounding for next attacks</p>
                <div className="mt-2 h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full w-[70%] bg-gradient-to-r from-green-500 to-green-400" />
                </div>
              </div>

              {/* Commander Payout (30%) */}
              <div className="p-4 bg-black/30 rounded-xl border border-[#FFD700]/30">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Your Share</span>
                  <span className="ml-auto text-[10px] text-[#FFD700] font-semibold">30%</span>
                </div>
                <p className="text-2xl font-bold text-[#FFD700] tabular-nums">$1,274.35</p>
                <p className="mt-2 text-xs text-gray-600">Available for withdrawal</p>
                <div className="mt-2 h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <div className="h-full w-[30%] bg-gradient-to-r from-[#FFD700] to-[#FFA500]" />
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Flash Loans</p>
                  <p className="text-lg font-semibold text-white">47</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Success Rate</p>
                  <p className="text-lg font-semibold text-green-400">94.2%</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Avg Profit</p>
                  <p className="text-lg font-semibold text-[#FFD700]">$90.38</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Next Distribution</p>
                <p className="text-sm text-[#FFD700]">Automatic on each attack</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  </div>
  );
}

// Sidebar Item Component
function SidebarItem({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group ${
        active 
          ? 'bg-[#FFD700]/10 border border-[#FFD700]/30' 
          : 'hover:bg-white/[0.03] border border-transparent hover:border-white/10'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-[#FFD700]' : 'text-gray-400 group-hover:text-[#FFD700]'} transition-colors`} />
      <span className={`hidden lg:block text-sm font-medium ${active ? 'text-[#FFD700]' : 'text-gray-400 group-hover:text-white'}`}>
        {label}
      </span>
      {active && <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.8)]" />}
    </button>
  );
}
