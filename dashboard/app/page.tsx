// MINIMAL VERSION - NO DATA FETCHING
// Ensures dashboard renders without crashes

export default function Page() {
  console.log('[GXEON] Page rendering - minimal version');
  
  return (
    <div style={{
      color: '#00ff00',
      background: '#0a0a0a',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        🌑 GXEON DASHBOARD
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#888' }}>
        SYSTEM ONLINE - READY FOR DATA
      </p>
      <div style={{ marginTop: '2rem', color: '#444' }}>
        <p>Status: ACTIVE</p>
        <p>Version: 4.0.0-premium</p>
      </div>
    </div>
  );
}
