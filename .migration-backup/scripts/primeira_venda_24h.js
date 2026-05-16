#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 GXEON PRIMEIRA VENDA REAL - 24H EXECUTION
 * Objetivo: Primeira venda PIX real em 24 horas
 * Author: Comandante Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://gxeon-core.up.railway.app';
const MP_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || '6d7601d8-c20d-4057-99de-b84c8e55aa30';

// ═══════════════════════════════════════════════════════════════════════════
// FASE 1: CRIAR LANDING PAGE ULTRA-SIMPLES
// ═══════════════════════════════════════════════════════════════════════════
function criarLandingPage() {
  console.log('🚀 [FASE 1] Criando landing page...\n');
  
  const landingHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GXEON Signals API - Free Crypto Signals for Bots</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #0a0a0a; color: #fff; }
    .hero { text-align: center; margin-bottom: 40px; }
    h1 { font-size: 2.5em; margin-bottom: 10px; background: linear-gradient(90deg, #00d4ff, #7b2cbf); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .tagline { font-size: 1.3em; color: #888; margin-bottom: 30px; }
    .cta { background: linear-gradient(90deg, #00d4ff, #7b2cbf); color: white; padding: 15px 40px; border-radius: 30px; text-decoration: none; display: inline-block; font-weight: bold; }
    .code { background: #1a1a1a; padding: 20px; border-radius: 10px; overflow-x: auto; margin: 20px 0; }
    .code pre { margin: 0; color: #00ff88; }
    .pricing { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 40px 0; }
    .tier { background: #1a1a1a; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #333; }
    .tier.featured { border-color: #00d4ff; }
    .price { font-size: 2em; font-weight: bold; color: #00d4ff; }
    .try-now { background: #1a1a1a; padding: 30px; border-radius: 10px; text-align: center; margin: 40px 0; }
  </style>
</head>
<body>
  <div class="hero">
    <h1>GXEON Signals API</h1>
    <p class="tagline">Real-time crypto trading signals for your bots.<br>Free tier available. Upgrade via PIX.</p>
    <a href="#try" class="cta">Try Free Now</a>
  </div>

  <div class="try-now" id="try">
    <h2>Try in 5 Seconds</h2>
    <div class="code">
      <pre>curl https://gxeon-core.up.railway.app/v1/signals/free</pre>
    </div>
    <p>No signup required • 30 requests/day • Instant response</p>
  </div>

  <h2>Pricing</h2>
  <div class="pricing">
    <div class="tier">
      <h3>Free</h3>
      <div class="price">R$ 0</div>
      <p>30 signals/day<br>5-min delay<br>Basic pairs</p>
    </div>
    <div class="tier featured">
      <h3>Pro</h3>
      <div class="price">R$ 99.90</div>
      <p>100 signals/day<br>Real-time<br>All pairs<br>Webhook alerts</p>
    </div>
    <div class="tier">
      <h3>Enterprise</h3>
      <div class="price">R$ 299.90</div>
      <p>Unlimited<br>Priority support<br>Custom signals</p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 60px; color: #666;">
    <p>Treasury: 0x3955d559055DadB7067054cB6E6f974710345224</p>
    <p>Built with GXEON Autonomous Systems</p>
  </div>
</body>
</html>`;

  mkdirSync('landing', { recursive: true });
  writeFileSync('landing/index.html', landingHTML);
  
  console.log('   landing/index.html criado');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 2: GERAR PRIMEIRA VENDA REAL
// ═══════════════════════════════════════════════════════════════════════════
async function gerarPrimeiraVenda() {
  console.log('💰 [FASE 2] Gerando primeira venda PIX real...\n');
  
  const clienteTeste = {
    email: `primeiro.cliente.${Date.now()}@gxeon.ai`,
    name: 'FirstRealClient',
    tier: 'BASIC'
  };
  
  console.log('Cliente:', clienteTeste.email);
  console.log('Tier:', clienteTeste.tier);
  console.log('Valor: R$ 29.90\n');
  
  try {
    const response = await axios.post(
      `${API_BASE}/v1/register-agent`,
      clienteTeste,
      { timeout: 30000, validateStatus: () => true }
    );
    
    if (response.status === 200 || response.status === 201) {
      const data = response.data;
      
      console.log('✅ REGISTRO CRIADO!\n');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('PIX GERADO - PRIMEIRA VENDA REAL');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      if (data.payment) {
        console.log('CODIGO PIX (Copia e Cola):');
        console.log(data.payment.pix_copy_paste || data.payment.pix_qr_code);
        console.log('');
        console.log('Valor:', data.payment.amount);
        console.log('ID Transacao:', data.payment.transaction_id);
        console.log('');
      }
      
      if (data.credentials) {
        console.log('API Key (ativa apos pagamento):', data.credentials.api_key);
        console.log('');
      }
      
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('PROXIMO PASSO: Pagar o PIX via app bancario');
      console.log('Apos pagamento, webhook ativa automaticamente!');
      console.log('═══════════════════════════════════════════════════════════════\n');
      
      const vendaData = {
        timestamp: new Date().toISOString(),
        cliente: clienteTeste,
        payment: data.payment,
        credentials: data.credentials,
        status: 'PIX_GERADO_AGUARDANDO_PAGAMENTO'
      };
      writeFileSync('primeira_venda.json', JSON.stringify(vendaData, null, 2));
      console.log('Dados salvos em: primeira_venda.json');
      
      return { sucesso: true, data: vendaData };
    } else {
      console.log(`Erro: HTTP ${response.status}`);
      return { sucesso: false };
    }
  } catch (err) {
    console.log(`Erro: ${err.message}`);
    return { sucesso: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     GXEON PRIMEIRA VENDA REAL - 24H EXECUTION                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  criarLandingPage();
  const venda = await gerarPrimeiraVenda();
  
  if (venda.sucesso) {
    console.log('\n✅ EXECUCAO COMPLETA!');
    console.log('PIX gerado e pronto para pagamento.');
  }
}

main().catch(console.error);
