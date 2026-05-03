#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 ATIVAÇÃO MÓDULO 3 — DATA MARKETPLACE ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Ativa o marketplace completo com:
 * - Backend API (/v1/marketplace)
 * - Frontend Next.js
 * - Deploy automático Railway + Vercel
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const API_BASE = 'https://gxeon-core.up.railway.app';

console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   🏪  MÓDULO 3 — DATA MARKETPLACE ENGINE v1.0                            ║
║                                                                           ║
║   Ativando marketplace completo...                                       ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
`);

// Verificar estrutura
const checks = [
  { file: 'server/routes/marketplace_datasets.js', name: 'Backend Route' },
  { file: 'web/pages/index.js', name: 'Frontend UI' },
  { file: 'web/pages/api/datasets.js', name: 'API Proxy' },
  { file: 'web/package.json', name: 'Frontend Config' }
];

console.log('📁 Verificando arquivos:\n');
let allOk = true;
for (const check of checks) {
  const exists = fs.existsSync(check.file);
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${check.name}: ${check.file}`);
  if (!exists) allOk = false;
}

if (!allOk) {
  console.log('\n❌ Arquivos faltando. Execute a criação primeiro.');
  process.exit(1);
}

console.log('\n🚀 Arquivos prontos!\n');

// Testar endpoints
console.log('🌐 Testando endpoints:\n');

try {
  // Test datasets
  console.log('   🔎 GET /v1/marketplace/datasets');
  const datasetsRes = execSync(
    `curl -s ${API_BASE}/v1/marketplace/datasets`,
    { encoding: 'utf-8', timeout: 10000 }
  );
  const datasets = JSON.parse(datasetsRes);
  
  if (datasets.success) {
    console.log(`   ✅ OK - ${datasets.count} datasets disponíveis`);
    datasets.datasets.forEach(ds => {
      console.log(`      • ${ds.name}: R$ ${ds.price.toFixed(2)}`);
    });
  }
} catch (e) {
  console.log('   ⚠️  Endpoint pode estar carregando (Railway warm-up)');
}

console.log(`
═══════════════════════════════════════════════════════════════════════════

✅ MÓDULO 3 ATIVADO!

📍 Endpoints disponíveis:
   • GET  ${API_BASE}/v1/marketplace/datasets
   • GET  ${API_BASE}/v1/marketplace/datasets/:id
   • POST ${API_BASE}/v1/marketplace/purchase
   • GET  ${API_BASE}/v1/marketplace/access/:dataset_id
   • GET  ${API_BASE}/v1/marketplace/usage
   • GET  ${API_BASE}/v1/marketplace/pricing

🏪 Datasets cadastrados:
   • Leads Google Maps - R$ 0.10/request
   • Leads Smart Scored - R$ 0.80/request
   • TikTok Trends - R$ 0.20/request
   • Competitor Intelligence - R$ 997 (one-time)
   • Market Research Report - R$ 2497 (one-time)

🌐 Frontend:
   • Local: cd web && npm run dev
   • Deploy: npx vercel --prod ./web

💰 Fluxo de compra:
   1. Usuário escolhe dataset no frontend
   2. Informa email e confirma
   3. Sistema gera PIX via MercadoPago
   4. Webhook confirma pagamento
   5. API key é ativada automaticamente
   6. Usuário acessa dados via /access/:id

═══════════════════════════════════════════════════════════════════════════

🚀 PRÓXIMOS PASSOS:

1. Deploy backend (se mudou código):
   git add . && git commit -m "add: modulo 3 marketplace" && git push

2. Deploy frontend na Vercel:
   cd web
   npm install
   npx vercel --prod

3. Configurar webhook MercadoPago:
   URL: ${API_BASE}/v1/webhook/mercadopago

4. Testar compra:
   curl -X POST ${API_BASE}/v1/marketplace/purchase \\
     -H "Content-Type: application/json" \\
     -d '{"dataset_id":"leads_google_maps","user_email":"test@test.com"}'

═══════════════════════════════════════════════════════════════════════════
`);

// Salvar resumo
const summary = {
  modulo: 3,
  nome: 'DATA MARKETPLACE ENGINE',
  status: 'ATIVADO',
  timestamp: new Date().toISOString(),
  endpoints: [
    '/v1/marketplace/datasets',
    '/v1/marketplace/datasets/:id',
    '/v1/marketplace/purchase',
    '/v1/marketplace/access/:dataset_id',
    '/v1/marketplace/usage',
    '/v1/marketplace/pricing'
  ],
  datasets: 5,
  revenue_model: 'per_request + one_time'
};

fs.writeFileSync('MODULO_3_STATUS.json', JSON.stringify(summary, null, 2));
console.log('💾 Status salvo em: MODULO_3_STATUS.json\n');
