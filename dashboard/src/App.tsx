import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { MempoolScanner } from './components/MempoolScanner';
import { FlashloanController } from './components/FlashloanController';
import { TransactionLog } from './components/TransactionLog';
import { RPCHealth } from './components/RPCHealth';

function App() {
  const [activeView, setActiveView] = useState('nav_mempool');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const renderView = () => {
    switch (activeView) {
      case 'nav_mempool':
        return <MempoolScanner />;
      case 'nav_atomic':
        return <FlashloanController />;
      case 'nav_logs':
        return <TransactionLog />;
      case 'nav_network':
        return <RPCHealth />;
      default:
        return <MempoolScanner />;
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
