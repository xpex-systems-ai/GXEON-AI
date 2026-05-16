export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://gxeon-core.up.railway.app/v1/marketplace/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Erro proxy purchase:', error);
    res.status(500).json({ 
      success: false, 
      error: 'PROXY_ERROR',
      message: error.message 
    });
  }
}
