import { NavLink, Outlet } from 'react-router-dom';
import { 
  Globe, 
  Target, 
  Brain, 
  Terminal,
  Cpu,
  Activity
} from 'lucide-react';

const navigation = [
  { name: 'Command Center', path: '/', icon: Globe, id: 'home' },
  { name: 'Gelato Sniper', path: '/gelato', icon: Target, id: 'gelato' },
  { name: 'Autonolas AI', path: '/autonolas', icon: Brain, id: 'autonolas' },
  { name: 'System Logs', path: '/logs', icon: Terminal, id: 'logs' },
];

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar - Glassmorphism Dark */}
      <aside className="w-64 fixed left-0 top-0 h-full z-50">
        <div className="h-full bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/50 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <Cpu className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">GXEON</h1>
                <p className="text-xs text-slate-400">Next-Gen AI Core</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110`} />
                <span className="font-medium text-sm">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* System Status */}
          <div className="p-4 border-t border-slate-800/50">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/50">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-sm text-slate-300">System Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <Outlet />
      </main>
    </div>
  );
}
