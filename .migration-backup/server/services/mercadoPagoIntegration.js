#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON MERCADO PAGO PIX INTEGRATION v1.0
 * DNA Conversão: Pagamento → Ativação Automática
 * 
 * Chaves PIX (hardcoded operacional):
 * - Aleatória: 6a7601d8-c20d-4057-99de-b84c8e55aa30
 * - Email: xpexsystens@outlook.com.br  
 * - CPF: 01360508163
 * 
 * Comandante: Júnior Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO PIX - MERCADO PAGO (HARDCODED OPERACIONAL)
// ═══════════════════════════════════════════════════════════════════════════
const PIX_CONFIG = {
  // Chaves PIX do Comandante (do screenshot)
  chaves: {
    aleatoria: '6a7601d8-c20d-4057-99de-b84c8e55aa30',
    email: 'xpexsystens@outlook.com.br',
    cpf: '01360508163'
  },
  
  // Beneficiário
  beneficiary: {
    nome: 'Junior Sena',
    cidade: 'SAO PAULO'
  },
  
  // Preços (em reais)
  pricing_brl: {
    PRO: 25.00,        // ~$5 USD
    ENTERPRISE: 250.00  // ~$50 USD
  },
  
  // Cidade padrão para QR Code
  cidade: 'SAO PAULO'
};

// Supabase para tracking de pagamentos
let supabase = null;

function initSupabase() {
  const url = process.env.SUPABASE_PROJECT_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (url && key && !url.includes('SEU-')) {
    supabase = createClient(url, key);
    console.log('[💰 MP] Supabase integrado para tracking PIX');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GERADOR DE PIX (QR Code + Copia e Cola)
// ═══════════════════════════════════════════════════════════════════════════
class PixGenerator {
  constructor() {
    this.chave = PIX_CONFIG.chaves.aleatoria; // Usar chave aleatória por padrão
  }
  
  /**
   * Gera payload PIX completo (QR Code + Copia e Cola)
   */
  gerarPix(email, tier, valor) {
    const txid = this.gerarTxid(email, tier);
    const valorFormatted = valor.toFixed(2);
    
    // Payload EMV do PIX
    const pixPayload = this.gerarPayloadEMV(
      PIX_CONFIG.chaves.aleatoria,
      PIX_CONFIG.beneficiary.nome,
      PIX_CONFIG.cidade,
      valorFormatted,
      txid
    );
    
    return {
      txid,
      email,
      tier,
      valor_brl: valor,
      pix_copia_cola: pixPayload,
      chave_pix: this.chave,
      beneficiario: PIX_CONFIG.beneficiary.nome,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
    };
  }
  
  /**
   * Gera TXID único para tracking
   */
  gerarTxid(email, tier) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const emailHash = email.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
    const tierCode = tier.substring(0, 3).toUpperCase();
    return `GX${tierCode}${emailHash}${timestamp}`.substring(0, 35); // Max 35 chars
  }
  
  /**
   * Gera payload EMV padrão PIX (Copia e Cola)
   * Format: EMVCo QR Code Specification for Payment Systems
   */
  gerarPayloadEMV(chavePix, nomeRecebedor, cidade, valor, txid) {
    // IDs EMV para PIX
    const ID_PAYLOAD_FORMAT = '01'; // Payload Format Indicator
    const ID_MERCHANT_ACCOUNT = '26'; // Merchant Account Information
    const ID_MERCHANT_ACCOUNT_GUI = '00'; // GUI - br.gov.bcb.pix
    const ID_MERCHANT_ACCOUNT_CHAVE = '01'; // Chave PIX
    const ID_MERCHANT_CATEGORY = '52'; // Merchant Category Code
    const ID_TRANSACTION_CURRENCY = '53'; // Transaction Currency (986 = BRL)
    const ID_TRANSACTION_AMOUNT = '54'; // Transaction Amount
    const ID_COUNTRY_CODE = '58'; // Country Code
    const ID_MERCHANT_NAME = '59'; // Merchant Name
    const ID_MERCHANT_CITY = '60'; // Merchant City
    const ID_ADDITIONAL_DATA = '62'; // Additional Data Field Template
    const ID_TXID = '05'; // TXID
    const ID_CRC16 = '63'; // CRC16-CCITT
    
    // Montar payload
    let payload = '';
    
    // 01 - Payload Format Indicator
    payload += this.montarCampo(ID_PAYLOAD_FORMAT, '01');
    
    // 26 - Merchant Account Information (PIX)
    let merchantAccount = '';
    merchantAccount += this.montarCampo(ID_MERCHANT_ACCOUNT_GUI, 'br.gov.bcb.pix');
    merchantAccount += this.montarCampo(ID_MERCHANT_ACCOUNT_CHAVE, chavePix);
    payload += this.montarCampo(ID_MERCHANT_ACCOUNT, merchantAccount);
    
    // 52 - Merchant Category Code (0000 = não especificado)
    payload += this.montarCampo(ID_MERCHANT_CATEGORY, '0000');
    
    // 53 - Transaction Currency (986 = BRL)
    payload += this.montarCampo(ID_TRANSACTION_CURRENCY, '986');
    
    // 54 - Transaction Amount
    payload += this.montarCampo(ID_TRANSACTION_AMOUNT, valor);
    
    // 58 - Country Code (BR)
    payload += this.montarCampo(ID_COUNTRY_CODE, 'BR');
    
    // 59 - Merchant Name (máx 25 chars)
    const nomeTruncado = nomeRecebedor.substring(0, 25);
    payload += this.montarCampo(ID_MERCHANT_NAME, nomeTruncado);
    
    // 60 - Merchant City (máx 15 chars)
    const cidadeTruncada = cidade.substring(0, 15);
    payload += this.montarCampo(ID_MERCHANT_CITY, cidadeTruncada);
    
    // 62 - Additional Data (TXID)
    let additionalData = '';
    additionalData += this.montarCampo(ID_TXID, txid);
    payload += this.montarCampo(ID_ADDITIONAL_DATA, additionalData);
    
    // 63 - CRC16 (placeholder, será calculado)
    payload += ID_CRC16 + '04'; // 4 dígitos para CRC
    
    // Calcular CRC16
    const crc = this.calcularCRC16(payload + '0000');
    payload += crc;
    
    return payload;
  }
  
  /**
   * Monta campo EMV: ID + tamanho (2 dígitos) + valor
   */
  montarCampo(id, valor) {
    const tamanho = valor.length.toString().padStart(2, '0');
    return id + tamanho + valor;
  }
  
  /**
   * Calcula CRC16-CCITT-FALSE
   */
  calcularCRC16(payload) {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
        crc &= 0xFFFF;
      }
    }
    
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE PAGAMENTO PIX
// ═══════════════════════════════════════════════════════════════════════════
class PixPaymentSystem {
  constructor() {
    this.generator = new PixGenerator();
    this.pendingPayments = new Map(); // txid → paymentData
    this.completedPayments = new Map();
    initSupabase();
  }
  
  /**
   * Gera pagamento PIX para upgrade
   */
  gerarPagamento(email, tier) {
    const valor = PIX_CONFIG.pricing_brl[tier];
    
    if (!valor) {
      return { error: 'Tier inválido. Use PRO ou ENTERPRISE' };
    }
    
    const paymentData = this.generator.gerarPix(email, tier, valor);
    
    // Salvar em memória (e Supabase se disponível)
    this.pendingPayments.set(paymentData.txid, paymentData);
    this.salvarNoSupabase(paymentData);
    
    console.log(`[💰 PIX] Gerado: ${paymentData.txid} | ${email} | ${tier} | R$${valor}`);
    
    return paymentData;
  }
  
  /**
   * Verifica status do pagamento
   */
  verificarPagamento(txid) {
    // Verificar em memória primeiro
    if (this.completedPayments.has(txid)) {
      return { status: 'COMPLETED', data: this.completedPayments.get(txid) };
    }
    
    if (this.pendingPayments.has(txid)) {
      return { status: 'PENDING', data: this.pendingPayments.get(txid) };
    }
    
    return { status: 'NOT_FOUND', error: 'TXID não encontrado' };
  }
  
  /**
   * Confirma pagamento (manual ou via webhook)
   */
  confirmarPagamento(txid, comprovante = null) {
    const payment = this.pendingPayments.get(txid);
    
    if (!payment) {
      return { error: 'Pagamento não encontrado' };
    }
    
    payment.status = 'COMPLETED';
    payment.completed_at = new Date().toISOString();
    payment.comprovante = comprovante;
    
    this.completedPayments.set(txid, payment);
    this.pendingPayments.delete(txid);
    
    this.atualizarNoSupabase(payment);
    
    console.log(`[✅ PIX] Confirmado: ${txid} | R$${payment.valor_brl} | ${payment.email}`);
    
    return {
      success: true,
      txid,
      email: payment.email,
      tier: payment.tier,
      valor_brl: payment.valor_brl,
      message: 'Pagamento confirmado. API Key ativada!'
    };
  }
  
  /**
   * Salva pagamento no Supabase
   */
  async salvarNoSupabase(paymentData) {
    if (!supabase) return;
    
    try {
      await supabase
        .from('pix_payments')
        .insert({
          txid: paymentData.txid,
          email: paymentData.email,
          tier: paymentData.tier,
          valor_brl: paymentData.valor_brl,
          pix_payload: paymentData.pix_copia_cola,
          status: paymentData.status,
          created_at: paymentData.created_at,
          expires_at: paymentData.expires_at
        });
    } catch (err) {
      console.warn('[⚠️ PIX] Erro ao salvar no Supabase:', err.message);
    }
  }
  
  /**
   * Atualiza pagamento no Supabase
   */
  async atualizarNoSupabase(paymentData) {
    if (!supabase) return;
    
    try {
      await supabase
        .from('pix_payments')
        .update({
          status: paymentData.status,
          completed_at: paymentData.completed_at,
          comprovante: paymentData.comprovante
        })
        .eq('txid', paymentData.txid);
    } catch (err) {
      console.warn('[⚠️ PIX] Erro ao atualizar Supabase:', err.message);
    }
  }
  
  /**
   * Lista pagamentos pendentes
   */
  listarPendentes() {
    const pendentes = [];
    for (const [txid, payment] of this.pendingPayments) {
      pendentes.push({
        txid,
        email: payment.email,
        tier: payment.tier,
        valor_brl: payment.valor_brl,
        created_at: payment.created_at,
        tempo_restante_min: Math.floor((new Date(payment.expires_at) - Date.now()) / 60000)
      });
    }
    return pendentes;
  }
  
  /**
   * Estatísticas de receita
   */
  getStats() {
    let totalRecebido = 0;
    for (const [txid, payment] of this.completedPayments) {
      totalRecebido += payment.valor_brl;
    }
    
    return {
      pendentes: this.pendingPayments.size,
      completados: this.completedPayments.size,
      total_recebido_brl: totalRecebido,
      receita_potencial_brl: Array.from(this.pendingPayments.values()).reduce((sum, p) => sum + p.valor_brl, 0)
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
const pixSystem = new PixPaymentSystem();

export { 
  PixGenerator, 
  PixPaymentSystem, 
  pixSystem, 
  PIX_CONFIG 
};

export default pixSystem;
