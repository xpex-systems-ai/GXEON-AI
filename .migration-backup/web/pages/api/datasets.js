export default async function handler(req, res) {
  try {
    const response = await fetch('https://gxeon-core.up.railway.app/v1/marketplace/datasets');
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Erro proxy datasets:', error);
    res.status(500).json({ 
      success: false, 
      error: 'PROXY_ERROR',
      datasets: []
    });
  }
}
