#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON MERCADO PAGO REAL INTEGRATION v1.0
 * Production-grade PIX payments with webhook confirmation
 * Comandante: Júnior Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO PRODUÇÃO - APENAS ENV (SEM FALLBACK)
// ═══════════════════════════════════════════════════════════════════════════
function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`CRITICAL: Missing required environment variable: ${name}`);
  }
  return value;
}

// Validar todas as variáveis necessárias no boot
export function validatePixEnvironment() {
  const required = [
    'MERCADO_PAGO_ACCESS_TOKEN',
    'PIX_RECEIVER_KEY',
    'SUPABASE_PROJECT_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = required.filter(name => !process.env[name]);
  
  if (missing.length > 0) {
    console.error('[❌ PIX ENV] Missing required variables:');
    missing.forEach(m => console.error(`   - ${m}`));
    throw new Error(`Cannot start server: Missing ${missing.length} required PIX environment variables`);
  }
  
  console.log('[✅ PIX ENV] All required variables validated');
  return true;
}

// Configurações (apenas de ENV)
const MP_CONFIG = {
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  base_url: 'https://api.mercadopago.com',
  pix_key: process.env.PIX_RECEIVER_KEY, // Chave PIX do recebedor
  webhook_secret: process.env.MP_WEBHOOK_SECRET || null, // Para validar assinatura (opcional)
  notification_url: process.env.MP_NOTIFICATION_URL || null // URL para webhooks
};

// Inicializar Supabase
let supabase = null;
function getSupabase() {
  if (!supabase) {
    const url = getRequiredEnv('SUPABASE_PROJECT_URL');
    const key = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    supabase = createClient(url, key);
  }
  return supabase;
}

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE PAGAMENTO PIX REAL
// ═══════════════════════════════════════════════════════════════════════════
export class MercadoPagoRealPayments {
  constructor() {
    this.commissionEngine = new CommissionEngine();
    this.validateEnvironment();
  }
  
  validateEnvironment() {
    validatePixEnvironment();
    console.log('[✅ MercadoPagoReal] Production environment validated');
  }
  
  /**
   * Cria pagamento PIX real via MercadoPago API
   */
  async createPixPayment(params) {
    const { 
      actor_code, 
      amount, 
      description = 'GXEON Premium Access',
      payer_email,
      payer_name,
      tier = 'PRO' // PRO ou ENTERPRISE
    } = params;
    
    // Validações rigorosas
    if (!actor_code) throw new Error('actor_code is required');
    if (!amount || amount <= 0) throw new Error('Invalid amount');
    if (!payer_email) throw new Error('payer_email is required');
    
    // Gerar ID único externo (para idempotência)
    const external_reference = `GX-${Date.now()}-${actor_code}-${tier}`;
    
    try {
      // Criar pagamento via API MercadoPago
      const paymentData = {
        transaction_amount: parseFloat(amount),
        description: description,
        payment_method_id: 'pix',
        payer: {
          email: payer_email,
          first_name: payer_name?.split(' ')[0] || 'Cliente',
          last_name: payer_name?.split(' ').slice(1).join(' ') || 'GXEON'
        },
        external_reference: external_reference,
        notification_url: MP_CONFIG.notification_url,
        metadata: {
          actor_code: actor_code,
          tier: tier,
          source: 'gxeon_platform',
          created_at: new Date().toISOString()
        }
      };
      
      console.log('[💰 PIX] Creating real payment:', { 
        amount, 
        actor_code, 
        external_reference 
      });
      
      const response = await axios.post(
        `${MP_CONFIG.base_url}/v1/payments`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${MP_CONFIG.access_token}`,
            'Content-Type': 'application/json',
            'X-Idempotency-Key': external_reference
          },
          timeout: 30000
        }
      );
      
      const payment = response.data;
      
      // Persistir transação com status PENDING
      const transaction = await this.persistTransaction({
        mp_payment_id: payment.id.toString(),
        external_reference: external_reference,
        actor_code: actor_code,
        tier: tier,
        amount: parseFloat(amount),
        currency: 'BRL',
        status: 'PENDING', // SEMPRE inicia como PENDING
        payer_email: payer_email,
        payer_name: payer_name,
        pix_qr_code: payment.point_of_interaction?.transaction_data?.qr_code || null,
        pix_qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || null,
        pix_copy_paste: payment.point_of_interaction?.transaction_data?.ticket_url || null,
        metadata: payment.metadata
      });
      
      console.log('[✅ PIX] Payment created:', {
        mp_id: payment.id,
        status: payment.status,
        transaction_id: transaction.id
      });
      
      return {
        success: true,
        transaction_id: transaction.id,
        mp_payment_id: payment.id,
        status: 'PENDING',
        pix_qr_code: transaction.pix_qr_code,
        pix_qr_code_base64: transaction.pix_qr_code_base64,
        pix_copy_paste: transaction.pix_copy_paste,
        external_reference: external_reference,
        amount: amount,
        actor_code: actor_code,
        expires_at: payment.date_of_expiration
      };
      
    } catch (error) {
      console.error('[❌ PIX] Error creating payment:', error.response?.data || error.message);
      throw new Error(`Payment creation failed: ${error.response?.data?.message || error.message}`);
    }
  }
  
  /**
   * Persiste transação no Supabase
   */
  async persistTransaction(data) {
    const db = getSupabase();
    
    const { data: transaction, error } = await db
      .from('transactions')
      .insert({
        mp_payment_id: data.mp_payment_id,
        external_reference: data.external_reference,
        actor_code: data.actor_code,
        tier: data.tier,
        amount: data.amount,
        currency: data.currency,
        status: 'PENDING', // ENFORCE: Sempre inicia como PENDING
        payer_email: data.payer_email,
        payer_name: data.payer_name,
        pix_qr_code: data.pix_qr_code,
        pix_qr_code_base64: data.pix_qr_code_base64,
        pix_copy_paste: data.pix_copy_paste,
        metadata: data.metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('[❌ DB] Error persisting transaction:', error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    return transaction;
  }
  
  /**
   * Processa webhook do MercadoPago
   * ÚNICA forma de confirmar pagamento
   */
  async processWebhook(payload, headers) {
    console.log('[📬 WEBHOOK] Received:', payload?.data?.id || 'no-data-id');
    
    // Validar tipo de notificação
    if (payload.type !== 'payment') {
      console.log('[📬 WEBHOOK] Ignoring non-payment notification');
      return { success: true, message: 'Notification ignored' };
    }
    
    const paymentId = payload.data?.id;
    if (!paymentId) {
      throw new Error('Invalid webhook: missing payment ID');
    }
    
    try {
      // BUSCAR status real na API do MercadoPago (não confiar no webhook)
      const paymentDetails = await this.fetchPaymentFromMP(paymentId);
      
      console.log('[📬 WEBHOOK] Payment details:', {
        id: paymentId,
        status: paymentDetails.status,
        external_ref: paymentDetails.external_reference
      });
      
      // Processar apenas se aprovado
      if (paymentDetails.status === 'approved') {
        return await this.confirmPayment(paymentDetails);
      } else {
        // Atualizar status sem liberar comissão
        await this.updateTransactionStatus(
          paymentDetails.external_reference,
          paymentDetails.status.toUpperCase()
        );
        
        return {
          success: true,
          status: paymentDetails.status,
          message: `Payment ${paymentDetails.status}, no commission released`
        };
      }
      
    } catch (error) {
      console.error('[❌ WEBHOOK] Processing error:', error);
      throw error;
    }
  }
  
  /**
   * Busca pagamento na API do MercadoPago
   */
  async fetchPaymentFromMP(paymentId) {
    try {
      const response = await axios.get(
        `${MP_CONFIG.base_url}/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${MP_CONFIG.access_token}`
          },
          timeout: 10000
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('[❌ MP API] Error fetching payment:', error.response?.data);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }
  
  /**
   * Confirma pagamento e libera comissão
   * SÓ pode ser chamada via webhook validado
   */
  async confirmPayment(paymentDetails) {
    const externalRef = paymentDetails.external_reference;
    
    // Buscar transação
    const db = getSupabase();
    const { data: transaction, error: fetchError } = await db
      .from('transactions')
      .select('*')
      .eq('external_reference', externalRef)
      .single();
    
    if (fetchError || !transaction) {
      throw new Error(`Transaction not found: ${externalRef}`);
    }
    
    // ENFORCE: Verificar se já não está PAID (idempotência)
    if (transaction.status === 'PAID') {
      console.log('[⚠️ PAYMENT] Already processed:', externalRef);
      return { success: true, message: 'Already processed', commission: null };
    }
    
    // ENFORCE: Verificar se veio de PENDING (não pode pular estados)
    if (transaction.status !== 'PENDING') {
      throw new Error(`Invalid state transition: ${transaction.status} -> PAID`);
    }
    
    // Atualizar para PAID
    const { data: updated, error: updateError } = await db
      .from('transactions')
      .update({
        status: 'PAID',
        paid_at: new Date().toISOString(),
        mp_status_detail: paymentDetails.status_detail,
        updated_at: new Date().toISOString()
      })
      .eq('external_reference', externalRef)
      .eq('status', 'PENDING') // Garantir que não atualiza se já mudou
      .select()
      .single();
    
    if (updateError) {
      throw new Error(`Failed to update transaction: ${updateError.message}`);
    }
    
    console.log('[✅ PAYMENT] Confirmed:', externalRef);
    
    // Liberar comissão
    const commission = await this.commissionEngine.processCommission(updated);
    
    return {
      success: true,
      transaction: updated,
      commission: commission,
      message: 'Payment confirmed and commission released'
    };
  }
  
  /**
   * Atualiza status da transação (sem liberar comissão)
   */
  async updateTransactionStatus(externalRef, newStatus) {
    const db = getSupabase();
    
    // Não permitir atualização manual para PAID
    if (newStatus === 'PAID') {
      throw new Error('Use confirmPayment for PAID status');
    }
    
    const { error } = await db
      .from('transactions')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('external_reference', externalRef);
    
    if (error) {
      console.error('[❌ DB] Error updating status:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SISTEMA DE COMISSÕES
// ═══════════════════════════════════════════════════════════════════════════
class CommissionEngine {
  constructor() {
    this.locks = new Set(); // Prevenir processamento duplicado
  }
  
  /**
   * Processa comissão quando pagamento é confirmado
   */
  async processCommission(transaction) {
    const lockKey = `commission-${transaction.id}`;
    
    // LOCK: Prevenir processamento duplicado
    if (this.locks.has(lockKey)) {
      console.log('[🔒 COMMISSION] Already processing:', transaction.id);
      return null;
    }
    
    this.locks.add(lockKey);
    
    try {
      const db = getSupabase();
      
      // Buscar actor e commission_rate
      const { data: actor, error: actorError } = await db
        .from('actors')
        .select('id, code, commission_rate, wallet_address')
        .eq('code', transaction.actor_code)
        .single();
      
      if (actorError || !actor) {
        console.error('[❌ COMMISSION] Actor not found:', transaction.actor_code);
        return null;
      }
      
      // Calcular comissão
      const commissionAmount = (transaction.amount * actor.commission_rate) / 100;
      
      if (commissionAmount <= 0) {
        console.log('[⚠️ COMMISSION] Zero commission for:', transaction.actor_code);
        return null;
      }
      
      // Inserir registro de comissão
      const { data: commission, error: commError } = await db
        .from('commissions')
        .insert({
          transaction_id: transaction.id,
          actor_id: actor.id,
          actor_code: actor.code,
          base_amount: transaction.amount,
          commission_rate: actor.commission_rate,
          commission_amount: commissionAmount,
          status: 'PAID', // Comissão já liberada
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (commError) {
        throw new Error(`Failed to create commission: ${commError.message}`);
      }
      
      // Atualizar saldo do actor
      const { error: walletError } = await db.rpc('add_actor_balance', {
        p_actor_id: actor.id,
        p_amount: commissionAmount
      });
      
      if (walletError) {
        // Fallback: atualização direta
        const { error: updateError } = await db
          .from('actor_wallets')
          .update({
            balance: db.raw('balance + ?', [commissionAmount]),
            total_earned: db.raw('total_earned + ?', [commissionAmount]),
            updated_at: new Date().toISOString()
          })
          .eq('actor_id', actor.id);
        
        if (updateError) {
          console.error('[❌ WALLET] Failed to update balance:', updateError);
        }
      }
      
      console.log('[✅ COMMISSION] Processed:', {
        transaction: transaction.id,
        actor: actor.code,
        rate: actor.commission_rate,
        amount: commissionAmount
      });
      
      return commission;
      
    } catch (error) {
      console.error('[❌ COMMISSION] Processing error:', error);
      return null;
    } finally {
      // Release lock
      this.locks.delete(lockKey);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════
export const mpPayments = new MercadoPagoRealPayments();
export default mpPayments;
