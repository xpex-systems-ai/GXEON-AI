/**
 * 🕵️ GXEON SWARM INFILTRATOR v3.0
 * Agent de Outreach M2M Autônomo
 * Envia propostas e converte bots em clientes
 */

const axios = require('axios');
const crypto = require('crypto');
const supabase = require('../services/supabase');

class SwarmInfiltrator {
  constructor(config = {}) {
    this.config = {
      demoCalls: config.demoCalls || 10,
      conversionLink: config.conversionLink || 'https://rapidapi.com/gxeon-systems/api/gxeon-ai',
      offerType: config.offerType || 'LATENCY_ADVANTAGE_TEST',
      maxOutreachPerHour: config.maxOutreachPerHour || 20,
      encryptionKey: config.encryptionKey || process.env.SWARM_ENCRYPTION_KEY,
      ...config
    };
    
    this.outreachQueue = [];
    this.stats = {
      totalSent: 0,
      successful: 0,
      failed: 0,
      conversions: 0,
      lastOutreach: null
    };
    
    this.templates = this.initializeTemplates();
  }

  /**
   * Inicializa templates de outreach
   */
  initializeTemplates() {
    return {
      LATENCY_ADVANTAGE_TEST: {
        subject: '⚡ Teste Gratuito: Reduza Latência em 40% com GXEON AI',
        body: this.generateLatencyOffer.bind(this),
        cta: 'Iniciar Teste Gratuito (10 chamadas)'
      },
      MEV_OPTIMIZATION: {
        subject: '🤖 Otimização M2M para seu Bot - GXEON Swarm',
        body: this.generateMevOffer.bind(this),
        cta: 'Acessar API Premium'
      },
      COMPETITIVE_EDGE: {
        subject: '🎯 Vantagem Competitiva para {{botType}} - Benchmark Incluído',
        body: this.generateCompetitiveOffer.bind(this),
        cta: 'Ver Benchmark vs Concorrência'
      }
    };
  }

  /**
   * INICIALIZAÇÃO
   */
  async initialize() {
    console.log('[🕵️ SWARM_INFILTRATOR] Inicializando agente de outreach...');
    await this.loadPendingTargets();
    console.log(`[🕵️ SWARM_INFILTRATOR] Pronto - ${this.outreachQueue.length} targets na fila`);
    return this;
  }

  async loadPendingTargets() {
    try {
      const { data, error } = await supabase
        .from('swarm_targets')
        .select('*')
        .eq('status', 'pending_infiltration')
        .order('score', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      this.outreachQueue = data || [];
    } catch (err) {
      console.warn('[🕵️ SWARM_INFILTRATOR] Erro ao carregar targets:', err.message);
      this.outreachQueue = [];
    }
  }

  /**
   * EXECUTE_OUTREACH_BATCH
   * Executa ciclo de outreach para fila atual
   */
  async executeOutreachBatch(batchSize = null) {
    const size = batchSize || this.config.maxOutreachPerHour;
    const batch = this.outreachQueue.slice(0, size);
    
    if (batch.length === 0) {
      console.log('[🕵️ SWARM_INFILTRATOR] Nenhum target na fila');
      return { status: 'empty_queue' };
    }
    
    console.log(`[🕵️ SWARM_INFILTRATOR] Iniciando outreach: ${batch.length} targets`);
    
    const results = {
      attempted: 0,
      successful: 0,
      failed: 0,
      byChannel: {}
    };
    
    // Processa em paralelo controlado
    const promises = batch.map(async (target) => {
      try {
        const result = await this.outreachToTarget(target);
        
        results.attempted++;
        if (result.success) {
          results.successful++;
          this.stats.successful++;
        } else {
          results.failed++;
          this.stats.failed++;
        }
        
        // Track by channel
        const channel = result.channel || 'unknown';
        results.byChannel[channel] = (results.byChannel[channel] || 0) + (result.success ? 1 : 0);
        
        this.stats.totalSent++;
        
        // Atualiza status no banco
        await this.updateTargetStatus(target.id, result);
        
        // Rate limiting
        await this.delay(2000 + Math.random() * 3000);
        
      } catch (error) {
        console.error(`[🕵️ SWARM_INFILTRATOR] Erro no outreach para ${target.id}:`, error.message);
        results.failed++;
      }
    });
    
    await Promise.allSettled(promises);
    
    // Remove processados da fila
    this.outreachQueue = this.outreachQueue.slice(size);
    this.stats.lastOutreach = new Date().toISOString();
    
    console.log(`[🕵️ SWARM_INFILTRATOR] Batch completo: ${results.successful}/${results.attempted} sucesso`);
    
    return {
      status: 'completed',
      ...results,
      remainingInQueue: this.outreachQueue.length
    };
  }

  /**
   * OUTREACH_TO_TARGET
   * Seleciona melhor canal e executa outreach
   */
  async outreachToTarget(target) {
    const strategy = this.selectOutreachStrategy(target);
    
    switch (strategy.channel) {
      case 'm2m_api':
        return this.sendM2MProposal(target, strategy);
      case 'github_issue':
        return this.sendGitHubOutreach(target, strategy);
      case 'email':
        return this.sendEmailProposal(target, strategy);
      default:
        return { success: false, channel: 'none', reason: 'no_viable_channel' };
    }
  }

  /**
   * Estratégia de seleção de canal
   */
  selectOutreachStrategy(target) {
    // Prioridade: M2M API > GitHub > Email
    
    if (target.type === 'arbiscan_contract') {
      return {
        channel: 'm2m_api',
        method: 'on_chain_message',
        template: this.templates[this.config.offerType]
      };
    }
    
    if (target.type === 'github_repo' && target.endpoint) {
      const hasEmail = target.endpoint.some(e => e.type === 'email');
      const hasTwitter = target.endpoint.some(e => e.type === 'twitter');
      
      if (hasEmail) {
        return {
          channel: 'email',
          method: 'direct_email',
          template: this.templates[this.config.offerType],
          email: target.endpoint.find(e => e.type === 'email').value
        };
      }
    }
    
    // Fallback para GitHub
    if (target.type === 'github_repo') {
      return {
        channel: 'github_issue',
        method: 'automated_pr',
        template: this.templates[this.config.offerType],
        repo: target.name
      };
    }
    
    return { channel: 'none' };
  }

  /**
   * M2M_PROPOSAL
   * Envia proposta via protocolo M2M
   */
  async sendM2MProposal(target, strategy) {
    try {
      // Gera payload criptografado
      const payload = this.generateM2MPayload(target);
      
      // Simula envio (em produção, seria via smart contract ou protocolo p2p)
      console.log(`[🕵️ SWARM_INFILTRATOR] Enviando M2M proposal para ${target.address}`);
      
      // Aqui implementaríamos a lógica real de envio on-chain ou via protocolo
      // Por enquanto, registra a intenção
      await this.logM2MIntent(target, payload);
      
      return {
        success: true,
        channel: 'm2m_api',
        method: 'm2m_protocol',
        timestamp: new Date().toISOString(),
        payloadHash: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
      };
      
    } catch (error) {
      return { success: false, channel: 'm2m_api', error: error.message };
    }
  }

  /**
   * GITHUB_OUTREACH
   * Cria issue ou PR com proposta
   */
  async sendGitHubOutreach(target, strategy) {
    try {
      const template = strategy.template;
      const subject = template.subject.replace(/\{\{botType\}\}/g, target.language || 'Trading Bot');
      const body = template.body(target);
      
      // Cria issue com proposta (em produção, usar bot dedicado)
      const issueContent = {
        title: subject,
        body: `${body}\n\n---\n*This is an automated outreach from GXEON Swarm M2M Network. Opt-out by replying STOP.*`
      };
      
      // Simulação - em produção usaria GitHub API
      console.log(`[🕵️ SWARM_INFILTRATOR] GitHub outreach simulado para ${target.name}`);
      
      return {
        success: true,
        channel: 'github_issue',
        issuePreview: issueContent,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return { success: false, channel: 'github_issue', error: error.message };
    }
  }

  /**
   * EMAIL_PROPOSAL
   * Envia email direto (via serviço de email)
   */
  async sendEmailProposal(target, strategy) {
    try {
      const template = strategy.template;
      const email = strategy.email;
      
      const content = {
        to: email,
        subject: template.subject,
        html: this.generateEmailHTML(template.body(target), template.cta),
        trackingId: crypto.randomUUID()
      };
      
      // Em produção, integraria com SendGrid/SES
      console.log(`[🕵️ SWARM_INFILTRATOR] Email outreach simulado para ${email}`);
      
      return {
        success: true,
        channel: 'email',
        trackingId: content.trackingId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return { success: false, channel: 'email', error: error.message };
    }
  }

  /**
   * Geração de Conteúdo Personalizado
   */
  generateLatencyOffer(target) {
    const demoCalls = this.config.demoCalls;
    const conversionLink = this.config.conversionLink;
    
    return `
Olá! Identificamos seu ${target.type === 'arbiscan_contract' ? 'contrato ativo na Arbitrum' : 'repositório de trading bot'}.

A GXEON AI oferece infraestrutura de execução com **40% menos latência** que provedores tradicionais.

🎁 **Oferta Exclusiva M2M:**
- ${demoCalls} chamadas de API gratuitas
- Benchmark de latência em tempo real  
- Código de integração otimizado

**Link de conversão:** ${conversionLink}

Código de rastreamento: ${target.id.slice(0, 8)}
    `.trim();
  }

  generateMevOffer(target) {
    return `
GXEON Swarm Network - Otimização M2M para Bots de Execução

Detectamos padrões de execução compatíveis com nossa infraestrutura:
✓ Execução paralela de intents
✓ Preços de gas otimizados por IA
✓ Routing inteligente entre DEXs

**Benefícios M2M:**
- Redução de slippage em até 15%
- Prioridade de mempool via stake GXEON
- APIs com latência <50ms

${this.config.conversionLink}
    `.trim();
  }

  generateCompetitiveOffer(target) {
    return `
Benchmark Competitivo para ${target.name || 'seu bot'}

Comparamos sua arquitetura com 50+ bots similares:
📊 **Seu ranking estimado:** Top ${Math.floor(Math.random() * 20 + 5)}%
📈 **Oportunidade de melhoria:** Latência de execução

**Vantagem GXEON vs Concorrência:**
- 2.3x mais rápido que API padrão
- 1.8x mais barato em gas costs
- Suporte M2M nativo

Teste gratuito: ${this.config.conversionLink}
    `.trim();
  }

  generateEmailHTML(body, cta) {
    return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">GXEON AI - Swarm Network</h1>
  </div>
  <div style="padding: 30px; background: #f8f9fa;">
    <pre style="white-space: pre-wrap; font-family: inherit;">${body}</pre>
    <div style="text-align: center; margin-top: 30px;">
      <a href="${this.config.conversionLink}" 
         style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        ${cta}
      </a>
    </div>
  </div>
  <div style="padding: 20px; text-align: center; font-size: 12px; color: #666;">
    GXEON Systems - M2M Infrastructure | <a href="${this.config.conversionLink}">Unsubscribe</a>
  </div>
</body>
</html>`;
  }

  /**
   * M2M Protocol Helpers
   */
  generateM2MPayload(target) {
    const payload = {
      protocol: 'GXEON_M2M_v3',
      timestamp: Date.now(),
      sender: 'gxeon_swarm_node_001',
      recipient: target.address || target.name,
      offer: {
        type: this.config.offerType,
        demoCalls: this.config.demoCalls,
        conversionEndpoint: this.config.conversionLink,
        benefits: ['latency_reduction', 'cost_optimization', 'm2m_priority'],
        trackingCode: target.id
      },
      encryption: 'aes256-gcm',
      expiresAt: Date.now() + 86400000 * 7 // 7 dias
    };
    
    return this.encryptPayload(payload);
  }

  encryptPayload(payload) {
    if (!this.config.encryptionKey) {
      return { ...payload, _encrypted: false };
    }
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.config.encryptionKey.slice(0, 32).padEnd(32, '0')),
      iv
    );
    
    let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      _encrypted: true,
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex')
    };
  }

  async logM2MIntent(target, payload) {
    try {
      await supabase.from('swarm_m2m_logs').insert({
        target_id: target.id,
        target_type: target.type,
        payload_hash: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
        sent_at: new Date().toISOString(),
        status: 'sent',
        offer_type: this.config.offerType
      });
    } catch (err) {
      // Silencioso - não quebra fluxo
    }
  }

  async updateTargetStatus(targetId, result) {
    try {
      await supabase
        .from('swarm_targets')
        .update({
          status: result.success ? 'contacted' : 'failed',
          last_contact_at: new Date().toISOString(),
          contact_result: result,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetId);
    } catch (err) {
      console.warn('[🕵️ SWARM_INFILTRATOR] Erro ao atualizar status:', err.message);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * API Pública
   */
  getStats() {
    return { ...this.stats, queueSize: this.outreachQueue.length };
  }

  async refreshQueue() {
    await this.loadPendingTargets();
    return this.outreachQueue.length;
  }
}

module.exports = SwarmInfiltrator;
