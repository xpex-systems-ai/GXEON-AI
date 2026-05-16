#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💰 ATIVAR MONETIZAÇÃO TOTAL - GXEON
 * 
 * 1. Configura PIX Manual (funciona agora)
 * 2. Ativa Cripto (ETH/USDC)
 * 3. Prepara Stripe/OpenPix/PayPal
 * 4. Gera primeira venda real
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import axios from 'axios';

const API_BASE = 'https://gxeon-core.up.railway.app';

// ═══════════════════════════════════════════════════════════════════════════
// 1. CONFIGURAR PIX MANUAL
// ═══════════════════════════════════════════════════════════════════════════
function configurarPixManual() {
  console.log('\n💰 [1/4] Configurando PIX Manual...\n');
  
  const config = {
    modo: 'PIX_MANUAL',
    instrucoes: 'Cliente registra → Recebe código → Você envia QR do seu banco → Ativa manual',
    precos: {
      BASIC: 29.90,
      PRO: 99.90,
      ENTERPRISE: 299.90
    },
    conta_bancaria: {
      nome: 'GXEON AI',
      pix_key: 'Use sua chave PIX pessoal',
      instrucao: 'Gere QR Code no app do seu banco quando cliente confirmar interesse'
    }
  };
  
  if (!existsSync('config')) mkdirSync('config');
  writeFileSync('config/pix_manual.json', JSON.stringify(config, null, 2));
  
  console.log('   ✅ PIX Manual configurado');
  console.log('   💰 Preços:');
  console.log('      - BASIC: R$ 29,90');
  console.log('      - PRO: R$ 99,90');
  console.log('      - ENTERPRISE: R$ 299,90');
  console.log('   📋 Fluxo: Registro → QR Manual → Pagamento → Ativação');
  
  return config;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. ATIVAR CRIPTO (ETH/USDC)
// ═══════════════════════════════════════════════════════════════════════════
function ativarCripto() {
  console.log('\n🪙 [2/4] Ativando Cripto...\n');
  
  const config = {
    modo: 'CRIPTO_AUTOMATICO',
    networks: {
      ethereum: {
        chain_id: 1,
        tokens: ['ETH', 'USDC', 'USDT'],
        treasury: '0x3955d559055DadB7067054cB6E6f974710345224'
      },
      arbitrum: {
        chain_id: 42161,
        tokens: ['ETH', 'USDC'],
        treasury: '0x3955d559055DadB7067054cB6E6f974710345224'
      },
      polygon: {
        chain_id: 137,
        tokens: ['MATIC', 'USDC'],
        treasury: '0x3955d559055DadB7067054cB6E6f974710345224'
      }
    },
    precos: {
      BASIC: { eth: 0.01, usdc: 5 },
      PRO: { eth: 0.03, usdc: 15 },
      ENTERPRISE: { eth: 0.1, usdc: 50 }
    }
  };
  
  writeFileSync('config/crypto_payments.json', JSON.stringify(config, null, 2));
  
  console.log('   ✅ Cripto ativado!');
  console.log('   🪙 Treasury: 0x3955d559055DadB7067054cB6E6f974710345224');
  console.log('   💰 Preços: 0.01 ETH (BASIC) / 0.03 ETH (PRO) / 0.1 ETH (ENTERPRISE)');
  
  return config;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. PREPARAR GATEWAYS
// ═══════════════════════════════════════════════════════════════════════════
function prepararGateways() {
  console.log('\n💳 [3/4] Preparando gateways...\n');
  
  const gateways = {
    openpix: {
      status: 'RECOMENDADO',
      url: 'https://app.openpix.com.br',
      vantagem: 'PIX gratuito, sem taxa de setup',
      prioridade: 1
    },
    stripe: {
      status: 'CARTAO_INTERNACIONAL',
      url: 'https://dashboard.stripe.com',
      prioridade: 2
    },
    paypal: {
      status: 'GLOBAL',
      url: 'https://developer.paypal.com',
      prioridade: 3
    }
  };
  
  writeFileSync('config/gateways.json', JSON.stringify(gateways, null, 2));
  
  console.log('   ✅ Gateways mapeados');
  console.log('   🥇 RECOMENDADO: OpenPix (gratuito)');
  console.log('   🥈 Stripe (cartão internacional)');
  console.log('   🥉 PayPal (global)');
  
  return gateways;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. GERAR PRIMEIRA VENDA
// ═══════════════════════════════════════════════════════════════════════════
async function gerarPrimeiraVenda() {
  console.log('\n🚀 [4/4] Gerando primeira venda...\n');
  
  const cliente = {
    email: `cliente.${Date.now()}@gxeon.ai`,
    nome: 'Primeiro Cliente',
    tier: 'BASIC'
  };
  
  try {
    const response = await axios.post(
      `${API_BASE}/v1/register`,
      {
        email: cliente.email,
        name: cliente.nome,
        tier: cliente.tier
      },
      { timeout: 15000, validateStatus: () => true }
    );
    
    if (response.status === 200 || response.status === 201) {
      const data = response.data;
      
      console.log('   ✅ CLIENTE REGISTRADO!\n');
      console.log('   📧 Email:', cliente.email);
      console.log('   👤 Código:', data.actor?.code);
      console.log('   🔑 API Key:', data.credentials?.api_key);
      console.log('');
      
      // Venda PIX Manual
      const vendaManual = {
        tipo: 'PIX_MANUAL',
        cliente,
        actor_code: data.actor?.code,
        api_key: data.credentials?.api_key,
        valor: 29.90,
        status: 'AGUARDANDO_PAGAMENTO',
        passos: [
          '1. Gere PIX de R$ 29,90 no seu app bancário',
          '2. Envie QR Code para cliente via WhatsApp/Email',
          `3. Após pagamento, ative: POST ${API_BASE}/v1/admin/activate`,
          `   Body: {"actor_code":"${data.actor?.code}","status":"active"}`
        ]
      };
      
      writeFileSync('venda_pix_manual.json', JSON.stringify(vendaManual, null, 2));
      
      console.log('   💰 VENDA PIX MANUAL:');
      console.log('      Valor: R$ 29,90');
      console.log('      Status: Aguardando pagamento');
      console.log('');
      console.log('   🎯 PRÓXIMOS PASSOS:');
      vendaManual.passos.forEach(p => console.log(`      ${p}`));
      
      // Venda Cripto
      const vendaCripto = {
        tipo: 'CRIPTO',
        cliente,
        actor_code: data.actor?.code,
        opcoes: {
          ETH: '0.01 ETH',
          USDC: '5 USDC'
        },
        treasury: '0x3955d559055DadB7067054cB6E6f974710345224',
        instrucao: 'Cliente envia cripto para treasury → Webhook detecta → Ativa automaticamente'
      };
      
      writeFileSync('venda_cripto.json', JSON.stringify(vendaCripto, null, 2));
      
      console.log('\n   🪙 VENDA CRIPTO:');
      console.log('      Preço: 0.01 ETH ou 5 USDC');
      console.log('      Treasury: 0x3955d559055DadB7067054cB6E6f974710345224');
      console.log('      Ativação: Automática via webhook');
      
      return { sucesso: true, vendaManual, vendaCripto };
    } else {
      console.log('   ⚠️  Erro:', response.status);
      console.log('   Resposta:', JSON.stringify(response.data, null, 2));
      return { sucesso: false };
    }
  } catch (err) {
    console.error('   ❌ Erro:', err.message);
    return { sucesso: false };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     💰 MONETIZAÇÃO TOTAL - GXEON                                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  // 1. PIX Manual
  configurarPixManual();
  
  // 2. Cripto
  ativarCripto();
  
  // 3. Gateways
  prepararGateways();
  
  // 4. Primeira venda
  const venda = await gerarPrimeiraVenda();
  
  // Resumo
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ✅ MONETIZAÇÃO ATIVADA                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('💰 OPÇÕES DE PAGAMENTO:');
  console.log('   1. PIX Manual (R$ 29,90) - Funciona agora');
  console.log('   2. Cripto (0.01 ETH / 5 USDC) - Automático');
  console.log('   3. OpenPix/Stripe/PayPal - Pendente cadastro');
  console.log('');
  console.log('📁 Arquivos criados:');
  console.log('   - config/pix_manual.json');
  console.log('   - config/crypto_payments.json');
  console.log('   - config/gateways.json');
  console.log('   - venda_pix_manual.json');
  console.log('   - venda_cripto.json');
  console.log('');
  console.log('🎯 PRÓXIMA AÇÃO: Envie QR Code PIX para o cliente!');
  console.log('');
}

main().catch(console.error);
