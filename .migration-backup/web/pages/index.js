import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [email, setEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [purchaseResult, setPurchaseResult] = useState(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  async function fetchDatasets() {
    try {
      const res = await fetch('/api/datasets');
      const data = await res.json();
      if (data.success) {
        setDatasets(data.datasets || []);
      }
    } catch (err) {
      console.error('Erro carregando datasets:', err);
    } finally {
      setLoading(false);
    }
  }

  function openPurchaseModal(dataset) {
    setSelectedDataset(dataset);
    setShowModal(true);
    setPurchaseResult(null);
  }

  async function buy() {
    if (!email || !selectedDataset) return;
    
    setPurchasing(selectedDataset.id);
    
    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dataset_id: selectedDataset.id,
          user_email: email,
          user_name: 'Cliente Marketplace'
        })
      });
      
      const data = await res.json();
      setPurchaseResult(data);
      
      if (data.success) {
        console.log('Compra iniciada:', data);
      }
    } catch (err) {
      console.error('Erro:', err);
      setPurchaseResult({ success: false, error: err.message });
    } finally {
      setPurchasing(null);
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#fff',
      fontFamily: 'Inter, sans-serif'
    }}>
      <Head>
        <title>GXEON Data Marketplace</title>
      </Head>

      <header style={{
        padding: '20px 40px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>🚀</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px' }}>GXEON</h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>DATA MARKETPLACE</p>
          </div>
        </div>
      </header>

      <section style={{
        padding: '80px 40px',
        textAlign: 'center'
      }}>
        <h2 style={{ fontSize: '48px', margin: '0 0 20px' }}>
          Dados que Impulsionam Seu Negócio
        </h2>
        <p style={{ fontSize: '20px', color: '#aaa', marginBottom: '40px' }}>
          Leads qualificados, tendências virais e inteligência competitiva
        </p>
      </section>

      <section id="datasets" style={{ padding: '40px' }}>
        <h3 style={{ fontSize: '32px', textAlign: 'center', marginBottom: '40px' }}>
          Datasets Disponíveis
        </h3>

        {loading ? (
          <p style={{ textAlign: 'center' }}>Carregando...</p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '25px',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {datasets.map(ds => (
              <div key={ds.id} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '30px'
              }}>
                <span style={{
                  background: 'rgba(167, 139, 250, 0.2)',
                  color: '#a78bfa',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px'
                }}>
                  {ds.category}
                </span>

                <h4 style={{ fontSize: '22px', margin: '15px 0 10px' }}>
                  {ds.name}
                </h4>

                <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
                  {ds.description}
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  paddingTop: '20px'
                }}>
                  <span style={{ fontSize: '24px', fontWeight: 700, color: '#a78bfa' }}>
                    R$ {ds.price.toFixed(2)}
                  </span>
                  
                  <button
                    onClick={() => openPurchaseModal(ds)}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    Comprar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
      {showModal && selectedDataset && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#1a1a2e',
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '400px',
            width: '100%'
          }} onClick={e => e.stopPropagation()}>
            {!purchaseResult ? (
              <>
                <h3>Comprar {selectedDataset.name}</h3>
                <p>Preço: R$ {selectedDataset.price.toFixed(2)}</p>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  style={{
                    width: '100%',
                    padding: '12px',
                    margin: '20px 0',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff'
                  }}
                />
                <button
                  onClick={buy}
                  disabled={!email}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: !email ? 'not-allowed' : 'pointer'
                  }}
                >
                  {purchasing ? 'Processando...' : 'Confirmar Compra'}
                </button>
              </>
            ) : purchaseResult.success ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
                <h3>Compra Iniciada!</h3>
                <p>Pedido: {purchaseResult.purchase_id}</p>
                {purchaseResult.payment?.pix_qr_code && (
                  <div style={{ marginTop: '20px' }}>
                    <p>Escaneie o QR Code:</p>
                    <img 
                      src={`data:image/png;base64,${purchaseResult.payment.pix_qr_code}`}
                      alt="PIX QR Code"
                      style={{ maxWidth: '200px', margin: '10px auto' }}
                    />
                  </div>
                )}
                <p style={{ fontSize: '12px', color: '#888', marginTop: '20px' }}>
                  API Key: {purchaseResult.credentials?.api_key?.slice(0, 20)}...
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#ff4444' }}>
                <p>❌ Erro: {purchaseResult.error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
