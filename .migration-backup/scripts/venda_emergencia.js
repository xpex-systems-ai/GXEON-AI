#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💰 VENDA EMERGÊNCIA - PIX SIMPLIFICADO
 * Gera PIX direto via MercadoPago API sem depender do backend
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { writeFileSync } from 'fs';

const MP_TOKEN = '6d7601d8-c20d-4057-99de-b84c8e55aa30';

async function gerarPixEmergencia() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     💰 VENDA EMERGÊNCIA - PIX DIRETO                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  const cliente = {
    email: `venda.real.${Date.now()}@gxeon.ai`,
    nome: 'Primeiro Cliente Real'
  };
  
  const valor = 29.90;
  const txId = `GX-REAL-${Date.now()}`;
  
  console.log('Cliente:', cliente.email);
  console.log('Valor: R$', valor);
  console.log('Transaction ID:', txId);
  console.log('');
  
  try {
    // Gerar PIX direto via MP API
    const response = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      {
        transaction_amount: valor,
        description: 'GXEON API Access - BASIC Tier',
        payment_method_id: 'pix',
        payer: {
          email: cliente.email,
          first_name: 'Primeiro',
          last_name: 'Cliente'
        },
        external_reference: txId
      },
      {
        headers: {
          'Authorization': `Bearer ${MP_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': txId
        },
        timeout: 15000
      }
    );
    
    const pixData = response.data.point_of_interaction?.transaction_data;
    
    console.log('✅ PIX GERADO COM SUCESSO!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💎 CÓDIGO PIX (Copia e Cola):');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(pixData?.qr_code);
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('💰 Valor: R$', valor);
    console.log('🏦 Payment ID:', response.data.id);
    console.log('🔗 Ticket URL:', pixData?.ticket_url);
    console.log('⏰ Expira em: 24 horas');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎯 INSTRUÇÕES:');
    console.log('   1. Copie o código PIX acima');
    console.log('   2. Abra seu app bancário');
    console.log('   3. Cole no pagamento PIX');
    console.log('   4. Pague R$ 29.90');
    console.log('   5. Webhook confirmará automaticamente!');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Salvar dados
    const venda = {
      timestamp: new Date().toISOString(),
      cliente,
      valor,
      txId,
      payment_id: response.data.id,
      pix_code: pixData?.qr_code,
      ticket_url: pixData?.ticket_url,
      status: 'PIX_GERADO'
    };
    
    writeFileSync('venda_real_pix.json', JSON.stringify(venda, null, 2));
    console.log('💾 Dados salvos em: venda_real_pix.json');
    console.log('');
    
    return { sucesso: true, pix: pixData?.qr_code };
    
  } catch (err) {
    console.error('❌ ERRO:', err.response?.data?.message || err.message);
    console.error('Detalhes:', err.response?.data || 'Sem detalhes');
    return { sucesso: false, erro: err.message };
  }
}

// Executar
gerarPixEmergencia().catch(console.error);
