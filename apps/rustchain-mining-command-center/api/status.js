const NODE = process.env.RUSTCHAIN_NODE || 'http://50.28.86.131:8088';
const WALLET = process.env.RUSTCHAIN_WALLET || 'RTC82c21b7f32d0e65c4aa9785d6561a55ff6127269';

async function getJson(path, params = {}) {
  const url = new URL(path, NODE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const response = await fetch(url, { headers: { 'user-agent': 'GXEON-Cloud-Telemetry/1.0' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const out = {
    adapter: 'LIVE / CLOUD TELEMETRY',
    bridge_online: false,
    cloud_online: true,
    wallet: WALLET,
    node: NODE,
    timestamp: Math.floor(Date.now() / 1000),
    fingerprint: { passed: 6, total: 6, source: 'last-known verified run; local host not connected' },
    hardware_binding: 'BOUND',
    attestation: 'ACTION_REQUIRED',
    enrollment: 'BLOCKED',
    blocker: 'ENROLLMENT_SIGNING_KEY_REQUIRED',
    payment: { verified: false, balance: null, evidence: null },
  };
  try {
    out.network = { reachable: true, ...(await getJson('/epoch')) };
  } catch (error) {
    out.network = { reachable: false, error: error instanceof Error ? error.message : String(error) };
  }
  try {
    out.eligibility = await getJson('/lottery/eligibility', { miner_id: WALLET });
  } catch (error) {
    out.eligibility = { error: error instanceof Error ? error.message : String(error) };
  }
  res.status(200).json(out);
}
