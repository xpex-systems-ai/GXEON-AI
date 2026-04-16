import { useState } from 'react';
import { motion } from 'framer-motion';
import { Radar, Cpu, Terminal, Activity, Menu, X } from 'lucide-react';

const navItems = [
  { id: 'nav_mempool', label: 'Mempool Radar', icon: Radar },
  { id: 'nav_atomic', label: 'Atomic Engine', icon: Cpu },
  { id: 'nav_logs', label: 'MEV Bribe Logs', icon: Terminal },
  { id: 'nav_network', label: 'Node Status', icon: Activity },
];

export function Sidebar({ activeView, onViewChange, isCollapsed, setIsCollapsed }) {
  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen bg-dark-900/80 backdrop-blur-xl border-r border-gold/20 flex flex-col relative overflow-hidden"
    >
      {/* Holographic circuit background effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-cyan/5" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 p-4 border-b border-gold/10">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gold to-cyan flex items-center justify-center shadow-lg shadow-gold/20">
                <Cpu className="w-6 h-6 text-dark-900" />
              </div>
              <div>
                <h1 className="text-gold font-bold text-lg tracking-wider">GXEON</h1>
                <p className="text-cyan text-xs tracking-widest">AI SYSTEM</p>
              </div>
            </motion.div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gold/10 transition-colors group"
          >
            {isCollapsed ? (
              <Menu className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
            ) : (
              <X className="w-5 h-5 text-gold group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 p-3 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`relative w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-gradient-to-r from-gold/20 to-cyan/20 border border-gold/30 shadow-lg shadow-gold/10'
                  : 'hover:bg-dark-800 border border-transparent hover:border-gold/10'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeGlow"
                  className="absolute inset-0 bg-gradient-to-r from-gold/10 to-cyan/10 rounded-xl"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              <div className={`relative z-10 flex items-center gap-3 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]' : 'text-gray-400'
                  }`}
                />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`text-sm font-medium tracking-wide ${
                      isActive ? 'text-gold' : 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  >
                    {item.label}
                  </motion.span>
                )}
              </div>

              {isActive && (
                <motion.div
                  className="absolute right-3 w-2 h-2 rounded-full bg-gold shadow-[0_0_10px_#FFD700]"
                  layoutId="activeIndicator"
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative z-10 p-4 border-t border-gold/10">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-500">System Online</span>
            </div>
            <p className="text-[10px] text-gray-600 tracking-wider">v2.0.6 CYBERPUNK</p>
          </motion.div>
        )}
      </div>
    </motion.aside>
  );
}
