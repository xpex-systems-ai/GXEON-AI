import { useState } from 'react';
import { 
  Radar, 
  Bot, 
  Target, 
  Vault,
  Zap,
  Activity,
  ChevronRight
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  active?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Centro de Comando',
    icon: <Radar className="w-5 h-5" />,
    href: '/',
    active: true,
  },
  {
    label: 'Agentes Ativos',
    icon: <Bot className="w-5 h-5" />,
    href: '/agents',
  },
  {
    label: 'Radar de Bounties',
    icon: <Target className="w-5 h-5" />,
    href: '/bounties',
  },
  {
    label: 'Cofre / Lucros',
    icon: <Vault className="w-5 h-5" />,
    href: '/profits',
  },
];

export function Sidebar() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-950 border-r border-slate-800/50 z-50">
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 backdrop-blur-xl bg-slate-950/80" />
      
      {/* Content */}
      <div className="relative h-full flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-xl bg-cyan-500/20 blur-xl animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                GX<span className="text-cyan-400">eon</span>
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Online</span>
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item, index) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`
                    group flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-300 ease-out
                    ${item.active 
                      ? 'bg-slate-800/50 text-cyan-400 border border-cyan-500/30' 
                      : 'text-slate-400 hover:text-cyan-300'
                    }
                  `}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {/* Icon with glow */}
                  <span className={`
                    relative transition-all duration-300
                    ${hoveredIndex === index || item.active ? 'text-cyan-400' : ''}
                  `}>
                    {item.icon}
                    {(hoveredIndex === index || item.active) && (
                      <span className="absolute inset-0 text-cyan-400 blur-sm opacity-50" />
                    )}
                  </span>
                  
                  {/* Label */}
                  <span className="font-medium text-sm">{item.label}</span>
                  
                  {/* Active indicator */}
                  {item.active && (
                    <ChevronRight className="w-4 h-4 ml-auto text-cyan-400" />
                  )}
                  
                  {/* Hover glow effect */}
                  {hoveredIndex === index && !item.active && (
                    <div className="absolute inset-0 rounded-xl bg-cyan-500/5 blur-sm -z-10" />
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Status Panel */}
        <div className="p-4 border-t border-slate-800/50">
          <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Agentes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-emerald-400">2 Ativos</span>
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Scanner</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-xs">Caçando</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Sniper</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-cyan-400 text-xs">Aguardando</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none" />
    </aside>
  );
}
