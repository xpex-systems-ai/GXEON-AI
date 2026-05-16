/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON BILLING GATE v1.0 — MANDATORY MONETIZATION ENFORCEMENT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Pipeline: GXZ1_MODE_2_MONETIZATION_ENFORCEMENT
 * Authority: GX_ORIGINAL_ORCHESTRATOR
 * Target: xzeon-xpex-1
 * 
 * RULE: BLOCK_OUTPUT_IF_NO_BILLING_EVENT
 * NO_CREDIT = NO_SIGNAL
 * NO_AUTH = NO_ACCESS
 * 
 * ENF-001: Billing Enforcement — MANDATORY_GATE
 * ═══════════════════════════════════════════════════════════════════════════
 */

const supabase = require('../services/supabase');
const { deductCreditsAtomicDirect, queryUserByApiKey } = require('./gxeonEnforcerPg');

// Signal pricing configuration
// GXZ1_SIGNAL_GATE: SG-004 compliant pricing model
const SIGNAL_PRICING = {
  new_pool: 0.05,
  smart_money: 0.03,
  mempool: 0.08,
  mempool_sniper: 0.08,
  whale_flow: 0.10,
  mev_opportunity: 0.10,
  default: 0.05
};

/**
 * Billing Gate — Validates billing BEFORE signal broadcast
 * Blocks signal if no valid billing event
 */
class GxeonBillingGate {
  constructor() {
    this.blocked_signals = 0;
    this.authorized_signals = 0;
    this.revenue_locked = 0;
    this.enforcement_start = new Date().toISOString();
  }

  /**
   * Validate API Key and Credits Atomically
   * Returns { authorized: boolean, billing_event: object, error: string }
   */
  async validateBilling(apiKey, signalType = 'default') {
    // STRICT: No API Key = Immediate Denial
    if (!apiKey) {
      return {
        authorized: false,
        error: 'GXEON_AUTH_REQUIRED',
        message: 'API Key obrigatório. Header x-gxeon-key ausente.',
        enforcement: 'STRICT'
      };
    }

    const cost = SIGNAL_PRICING[signalType] || SIGNAL_PRICING.default;

    try {
      let deductionResult = null;

      // FORCE_SUPABASE_AUTHORITY: Always check Supabase first
      if (supabase) {
        const { data, error: rpcError } = await supabase
          .rpc('deduct_credits_atomic', {
            p_api_key: apiKey,
            p_amount: cost,
            p_operation: `SIGNAL:${signalType}`,
            p_request_id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          });

        if (rpcError && rpcError.message?.includes('schema cache')) {
          // Fallback to direct PostgreSQL (still Supabase backend)
          deductionResult = await deductCreditsAtomicDirect(apiKey, cost, `SIGNAL:${signalType}`);
        } else if (rpcError) {
          console.error('[GXEON_BILLING_GATE] RPC Error:', rpcError);
          // STRICT MODE: On billing error, DENY (no fail-open)
          return {
            authorized: false,
            error: 'GXEON_BILLING_ERROR',
            billing_gate: {
              billing_required: true,
              signal_id: 'unknown',
              signal_type: signalType,
              tier: 'premium', // Signals require paid tier access
              price: SIGNAL_PRICING[signalType],
              latency_cost: 0.001, // Infrastructure cost per signal
              consumer_fee: SIGNAL_PRICING[signalType] + 0.001, // Total charged
              currency: 'USD',
              billing_timestamp: new Date().toISOString()
            },
            signal_price_usd: SIGNAL_PRICING[signalType],
            beneficiary: '0x3955d559055DadB7067054cB6E6f974710345224',
            message: 'Billing system error. Signal blocked for security.',
            enforcement: 'STRICT'
          };
        } else {
          deductionResult = data;
        }
      } else {
        // STRICT MODE: No Supabase connection = DENY
        return {
          authorized: false,
          error: 'GXEON_BILLING_UNAVAILABLE',
          message: 'Billing system offline. No signals available.',
          enforcement: 'STRICT'
        };
      }

      // Check deduction result
      if (!deductionResult || !deductionResult.success) {
        this.blocked_signals++;
        return {
          authorized: false,
          error: 'GXEON_PAYMENT_REQUIRED',
          message: deductionResult?.message || 'Saldo insuficiente. Recarregue créditos.',
          required: cost,
          current_balance: deductionResult?.current_balance || 0,
          enforcement: 'STRICT'
        };
      }

      // SUCCESS: Billing event validated
      this.authorized_signals++;
      this.revenue_locked += cost;

      return {
        authorized: true,
        billing_event: {
          transaction_id: deductionResult.transaction_id,
          user_id: deductionResult.user_id,
          cost: cost,
          new_balance: deductionResult.new_balance,
          signal_type: signalType,
          charged_at: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('[GXEON_BILLING_GATE] Error:', error);
      // STRICT MODE: On exception, DENY
      return {
        authorized: false,
        error: 'GXEON_ENFORCEMENT_ERROR',
        message: 'Billing gate error. Signal blocked.',
        enforcement: 'STRICT'
      };
    }
  }

  /**
   * Gate Check for Signal Broadcast
   * Returns true if signal can be broadcast, false otherwise
   */
  async gateCheck(apiKey, signalType, signalData) {
    const validation = await this.validateBilling(apiKey, signalType);
    
    if (!validation.authorized) {
      console.log(`🚫 [BILLING_GATE] BLOCKED: ${signalData.signal_id || 'unknown'} | Reason: ${validation.error}`);
      return { allowed: false, ...validation };
    }

    console.log(`✅ [BILLING_GATE] AUTHORIZED: ${signalData.signal_id || 'unknown'} | TX: ${validation.billing_event.transaction_id}`);
    return { allowed: true, ...validation };
  }

  /**
   * Get enforcement metrics for Grafana
   */
  getMetrics() {
    return {
      enforcement_version: 'GXZ1_v1.0',
      enforcement_start: this.enforcement_start,
      blocked_signals: this.blocked_signals,
      authorized_signals: this.authorized_signals,
      revenue_locked_usd: parseFloat(this.revenue_locked.toFixed(4)),
      signal_conversion_rate: this.authorized_signals / Math.max(1, this.authorized_signals + this.blocked_signals),
      policy: 'STRICT_NO_FAIL_OPEN'
    };
  }
}

/**
 * Express middleware wrapper for HTTP endpoints
 */
function gxeonBillingGateMiddleware(signalType = 'default') {
  return async (req, res, next) => {
    const apiKey = req.headers['x-gxeon-key'];
    const gate = new GxeonBillingGate();
    
    const result = await gate.gateCheck(apiKey, signalType, { signal_id: req.id });
    
    if (!result.allowed) {
      const statusCode = result.error === 'GXEON_PAYMENT_REQUIRED' ? 402 : 401;
      return res.status(statusCode).json({
        error: result.error,
        message: result.message,
        enforcement: 'GXZ1_STRICT'
      });
    }

    // Attach billing event to request
    req.billing_event = result.billing_event;
    next();
  };
}

// Singleton instance
const billingGate = new GxeonBillingGate();

module.exports = {
  GxeonBillingGate,
  billingGate,
  gxeonBillingGateMiddleware,
  SIGNAL_PRICING
};
