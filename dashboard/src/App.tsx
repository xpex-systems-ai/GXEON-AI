import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CommandCenter } from './components/CommandCenter';
import { MempoolScanner } from './components/MempoolScanner';
import { FlashloanController } from './components/FlashloanController';
import { TransactionLog } from './components/TransactionLog';
import { RPCHealth } from './components/RPCHealth';
import { SwarmPanel } from './components/SwarmPanel';

// 🌑 SOVEREIGN GRID — Placeholder components for new nav items
const ApiBillingPanel = () => (
  <div className="h-full flex flex-col items-center justify-center text-gold/60">
    <div className="text-6xl mb-4">💰</div>
    <h2 className="text-2xl font-bold text-gold mb-2">API Billing Center</h2>
    <p className="text-gray-400">0.05 créditos por chamada</p>
    <p className="text-gray-500 text-sm mt-4">Total Revenue: Conectado ao Supabase</p>
  </div>
);

const SovereignVaultPanel = () => (
  <div className="h-full flex flex-col items-center justify-center text-purple/60">
    <div className="text-6xl mb-4">🏦</div>
    <h2 className="text-2xl font-bold text-purple mb-2">Sovereign Vault</h2>
    <p className="text-gray-400">On-chain Treasury Management</p>
    <p className="text-gray-500 text-sm mt-4">70/30 Split • Reinvestimento Automático</p>
  </div>
);

function App() {
  const [activeView, setActiveView] = useState('nav_overview'); // 🚀 PRODUCTION: Command Center
  const [isCollapsed, setIsCollapsed] = useState(false);

  const renderView = () => {
    switch (activeView) {
      case 'nav_overview':
        return <CommandCenter />; // 🚀 PRODUCTION MODE — Live Profit Dashboard
      case 'nav_mempool':
        return <MempoolScanner />;
      case 'nav_atomic':
        return <FlashloanController />;
      case 'nav_billing':
        return <ApiBillingPanel />;
      case 'nav_vault':
        return <SovereignVaultPanel />;
      case 'nav_logs':
        return <TransactionLog />;
      case 'nav_network':
        return <RPCHealth />;
      case 'nav_swarm':
        return <SwarmPanel />;
      default:
        return <CommandCenter />; // Default to Production Dashboard
    }
  };

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <Dashboard
        activeView={activeView}
        renderView={renderView}
      />
    </div>
  );
}

export default App;
