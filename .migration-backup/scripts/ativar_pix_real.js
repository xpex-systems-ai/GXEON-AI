#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💰 ATIVAÇÃO PIX REAL - MERCADO PAGO
 * Token: 6d7601d8-c20d-4057-99de-b84c8e55aa30
 * Modo: VENDA AUTOMÁTICA ATIVADA
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { writeFileSync, appendFileSync, existsSync } from 'fs';

// TOKEN REAL DO MERCADO PAGO (fornecido pelo usuário)
const MP_ACCESS_TOKEN = '6d7601d8-c20d-4057-99de-b84c8e55aa30';

// Configuração
const CONFIG = {
  AMBIENTE: 'PRODUCAO',
  MP_API_BASE: 'https://api.mercadopago.com',
  ACCESS_TOKEN: MP_ACCESS_TOKEN,
  AUTO_ATIVACAO: true,
  WEBHOOK_AUTO: true,
  TREASURY: '0x3955d559055DadB7067054cB6E6f974710345224'
};

console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║     💰 ATIVAÇÃO PIX REAL - MERCADO PAGO                       ║');
console.log('║     VENDA AUTOMÁTICA                                          ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('🔐 Token configurado:', MP_ACCESS_TOKEN.substring(0, 8) + '...' + MP_ACCESS_TOKEN.substring(MP_ACCESS_TOKEN.length - 4));
console.log('🌐 Ambiente:', CONFIG.AMBIENTE);
console.log('💎 Treasury:', CONFIG.TREASURY);
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// 1. VALIDAR TOKEN COM MERCADO PAGO
// ═══════════════════════════════════════════════════════════════════════════
async function validarToken() {
  console.log('🔍 [1/4] Validando token com MercadoPago...');
  
  try {
    const response = await axios.get(`${CONFIG.MP_API_BASE}/users/me`, {
      headers: {
        'Authorization': `Bearer ${CONFIG.ACCESS_TOKEN}`
      },
      timeout: 10000
    });
    
    if (response.status === 200) {
      console.log('   ✅ Token VÁLIDO!');
      console.log(`   👤 User ID: ${response.data.id}`);
      console.log(`   📧 Email: ${response.data.email}`);
      console.log(`   🏢 Site: ${response.data.site_id}`);
      console.log('');
      return { valido: true, user: response.data };
    }
  } catch (err) {
    console.log('   ❌ Token INVÁLIDO ou expirado!');
    console.log(`   Erro: ${err.response?.data?.message || err.message}`);
    console.log('');
    return { valido: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CONFIGURAR VARIÁVEIS DE AMBIENTE
// ═══════════════════════════════════════════════════════════════════════════
function configurarVariaveis() {
  console.log('⚙️  [2/4] Configurando variáveis de ambiente...');
  
  const envContent = `
# ═══════════════════════════════════════════════════════════════════
# 💰 GXEON - PIX REAL MERCADO PAGO (ATIVADO)
# ═══════════════════════════════════════════════════════════════════

MERCADO_PAGO_ACCESS_TOKEN=${MP_ACCESS_TOKEN}
MERCADOPAGO_ACCESS_TOKEN=${MP_ACCESS_TOKEN}
MP_ACCESS_TOKEN=${MP_ACCESS_TOKEN}

# Configurações PIX
PIX_ENABLED=true
PIX_AUTO_ACTIVATION=true
PIX_PROVIDER=mercadopago

# Webhook
MP_WEBHOOK_SECRET=auto
WEBHOOK_PIX_ENABLED=true

# Ambiente
NODE_ENV=production
PIX_PRODUCTION=true

# Treasury
TREASURY_ADDRESS=${CONFIG.TREASURY}
`;

  // Salvar em múltiplos arquivos para garantir
  const envFiles = ['.env.pix', '.env.mercadopago', '.env.payment'];
  
  envFiles.forEach(file => {
    writeFileSync(file, envContent.trim());
    console.log(`   ✅ ${file} criado`);
  });
  
  // Adicionar ao .env se existir
  if (existsSync('.env')) {
    appendFileSync('.env', '\n\n# PIX REAL ATIVADO\n' + envContent);
    console.log('   ✅ .env atualizado');
  }
  
  console.log('   📁 Variáveis salvas em:', envFiles.join(', '));
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CRIAR SCRIPT DE VENDA AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════════════════
function criarScriptVendaAutomatica() {
  console.log('🤖 [3/4] Criando script de venda automática...');
  
  const vendaScript = `#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💰 VENDA AUTOMÁTICA - PIX REAL
 * Gera PIX automaticamente e aguarda pagamento
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';

const MP_TOKEN = '${MP_ACCESS_TOKEN}';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://gxeon-core.up.railway.app';

// Produtos disponíveis
const PRODUTOS = {
  BASIC: { nome: 'GXEON Basic', valor: 29.90, descricao: '10 sinais/dia' },
  PRO: { nome: 'GXEON Pro', valor: 99.90, descricao: '100 sinais/dia' },
  ENTERPRISE: { nome: 'GXEON Enterprise', valor: 299.90, descricao: '1000 sinais/dia' }
};

async function gerarPixVenda(produtoKey, cliente) {
  const produto = PRODUTOS[produtoKey];
  
  console.log(\`\\n💰 Gerando PIX para: \${produto.nome}\`);
  console.log(\`   Cliente: \${cliente.email}\`);
  console.log(\`   Valor: R$ \${produto.valor}\`);
  
  try {
    // 1. Criar preferência de pagamento
    const preference = {
      items: [{
        title: produto.nome,
        description: produto.descricao,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: produto.valor
      }],
      payer: {
        email: cliente.email,
        name: cliente.nome
      },
      external_reference: \`GX-\${Date.now()}-\${produtoKey}\`,
      notification_url: \`\${API_BASE}/webhook/mercadopago\`
    };
    
    const prefResponse = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      preference,
      {
        headers: {
          'Authorization': \`Bearer \${MP_TOKEN}\`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(\`   ✅ Preferência criada: \${prefResponse.data.id}\`);
    
    // 2. Criar pagamento PIX
    const payment = {
      transaction_amount: produto.valor,
      description: produto.nome,
      payment_method_id: 'pix',
      payer: {
        email: cliente.email,
        first_name: cliente.nome.split(' ')[0],
        last_name: cliente.nome.split(' ').slice(1).join(' ')
      },
      external_reference: preference.external_reference
    };
    
    const payResponse = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      payment,
      {
        headers: {
          'Authorization': \`Bearer \${MP_TOKEN}\`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': \`pix-\${Date.now()}\`
        }
      }
    );
    
    const pixData = payResponse.data.point_of_interaction?.transaction_data;
    
    console.log(\`   ✅ PIX gerado com sucesso!\`);
    console.log(\`   💎 Código PIX:\`);
    console.log(\`   \${pixData?.qr_code}\`);
    console.log(\`\`);
    console.log(\`   📱 Copia e Cola: \${pixData?.qr_code_base64 ? '[QR CODE BASE64]' : pixData?.qr_code}\`);
    console.log(\`   🔗 Link: \${pixData?.ticket_url}\`);
    console.log(\`   ⏰ Expira em: 24 horas\`);
    
    return {
      sucesso: true,
      payment_id: payResponse.data.id,
      qr_code: pixData?.qr_code,
      qr_code_base64: pixData?.qr_code_base64,
      ticket_url: pixData?.ticket_url,
      external_reference: preference.external_reference
    };
    
  } catch (err) {
    console.error(\`   ❌ Erro: \${err.response?.data?.message || err.message}\`);
    return { sucesso: false, erro: err.message };
  }
}

// Exemplo de uso
async function demoVenda() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     💰 VENDA AUTOMÁTICA - DEMO                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\\n');
  
  const cliente = {
    nome: 'Cliente Demo',
    email: 'demo@gxeon.ai'
  };
  
  await gerarPixVenda('BASIC', cliente);
  
  console.log('\\n🌙 Venda automática pronta!');
  console.log('   Aguardando pagamento para ativação automática...');
}

demoVenda().catch(console.error);
`;

  writeFileSync('scripts/venda_automatica.js', vendaScript);
  console.log('   ✅ scripts/venda_automatica.js criado');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CONFIGURAR WEBHOOK PARA ATIVAÇÃO AUTOMÁTICA
// ═══════════════════════════════════════════════════════════════════════════
function configurarWebhook() {
  console.log('🔗 [4/4] Configurando webhook de confirmação...');
  
  const webhookHandler = `#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔔 WEBHOOK - CONFIRMAÇÃO DE PAGAMENTO PIX
 * Ativa cliente automaticamente após pagamento
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';

const MP_TOKEN = '${MP_ACCESS_TOKEN}';

export async function processarWebhookPix(payload) {
  console.log('\\n📬 Webhook recebido:', payload);
  
  // Verificar se é pagamento confirmado
  if (payload.type === 'payment' && payload.data?.status === 'approved') {
    console.log('✅ Pagamento APROVADO!');
    console.log(\`   ID: \${payload.data.id}\`);
    console.log(\`   External: \${payload.data.external_reference}\`);
    console.log(\`   Valor: R$ \${payload.data.transaction_amount}\`);
    
    // Ativar cliente no Supabase
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Buscar actor pelo external_reference
    const { data: actor, error } = await supabase
      .from('actors')
      .select('*')
      .eq('external_reference', payload.data.external_reference)
      .single();
    
    if (actor) {
      // Ativar
      await supabase
        .from('actors')
        .update({
          status: 'active',
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          mp_payment_id: payload.data.id
        })
        .eq('id', actor.id);
      
      console.log(\`   🚀 Actor \${actor.code} ATIVADO!\`);
      console.log(\`   API Key: \${actor.api_key}\`);
      console.log(\`   Cliente pode usar a API agora!\`);
    }
    
    return { ativado: true, actor: actor?.code };
  }
  
  return { processado: true };
}
`;

  writeFileSync('server/services/webhookPixActivation.js', webhookHandler);
  console.log('   ✅ server/services/webhookPixActivation.js criado');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTAR ATIVAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
async function ativarSistema() {
  // 1. Validar token
  const validacao = await validarToken();
  
  if (!validacao.valido) {
    console.log('❌ ATIVAÇÃO CANCELADA - Token inválido');
    process.exit(1);
  }
  
  // 2. Configurar variáveis
  configurarVariaveis();
  
  // 3. Criar script de venda
  criarScriptVendaAutomatica();
  
  // 4. Configurar webhook
  configurarWebhook();
  
  // Final
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     💰 SISTEMA PIX REAL ATIVADO!                              ║');
  console.log('║     VENDA AUTOMÁTICA PRONTA                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  console.log('🎯 COMO USAR:');
  console.log('   1. Configure as variáveis no Railway:');
  console.log('      MERCADO_PAGO_ACCESS_TOKEN=' + MP_ACCESS_TOKEN);
  console.log('');
  console.log('   2. Execute venda de teste:');
  console.log('      node scripts/venda_automatica.js');
  console.log('');
  console.log('   3. Webhook automático ativa clientes após pagamento');
  console.log('      Endpoint: POST /webhook/mercadopago');
  console.log('');
  console.log('💸 FLUXO DE VENDA:');
  console.log('   Cliente → /v1/register-agent → PIX gerado → Paga → Webhook → Ativado');
  console.log('');
  console.log('🌙 Treasury:', CONFIG.TREASURY);
  console.log('');
}

// Executar
ativarSistema().catch(console.error);
