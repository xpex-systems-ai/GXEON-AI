#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 MÓDULO 3 — DATA MARKETPLACE ENGINE v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Catálogo de datasets com compra, controle de acesso e tracking de uso.
 * Integra com MercadoPago para ativação automática via PIX.
 * 
 * Endpoints:
 *   GET  /v1/marketplace/datasets          → Listar datasets
 *   GET  /v1/marketplace/datasets/:id      → Detalhes do dataset
 *   POST /v1/marketplace/purchase          → Comprar acesso
 *   GET  /v1/marketplace/access/:id        → Acessar dados (requer API key)
 *   GET  /v1/marketplace/usage             → Analytics de uso
 * 
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { mpPayments } from '../services/mercadoPagoReal.js';

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// DATASET CATALOG — Produtos digitais disponíveis
// ═══════════════════════════════════════════════════════════════════════════
const DATASETS = [
  {
    id: 'leads_google_maps',
    name: 'Leads Google Maps',
    price: 0.10,
    currency: 'BRL',
    type: 'per_request',
    description: 'Leads B2B extraídos do Google Maps e enriquecidos com dados de contato',
    tier_required: 'BASIC',
    category: 'leads',
    features: ['Nome', 'Categoria', 'Endereço', 'Telefone', 'Website', 'Rating'],
    sample_output: {
      name: 'Acme Corp',
      category: 'Software Company',
      phone: '+55 11 99999-9999',
      rating: 4.5,
      website: 'acme.com'
    }
  },
  {
    id: 'leads_smart',
    name: 'Leads Smart Scored',
    price: 0.80,
    currency: 'BRL',
    type: 'per_request',
    description: 'Leads com AI scoring, prioridade e ação recomendada',
    tier_required: 'BASIC',
    category: 'leads',
    features: ['Score 0-100', 'Prioridade', 'Ação recomendada', 'Motivo', 'Est. conversão'],
    sample_output: {
      name: 'TechStart Inc',
      score: 87,
      priority: 'HIGH',
      action: 'Offer website development',
      reason: 'No website + high rating'
    }
  },
  {
    id: 'trends_tiktok',
    name: 'TikTok Trends',
    price: 0.20,
    currency: 'BRL',
    type: 'per_request',
    description: 'Tendências virais do TikTok com análise de engajamento',
    tier_required: 'BASIC',
    category: 'trends',
    features: ['Hashtag', 'Viral Score', 'Velocity', 'Engagement metrics'],
    sample_output: {
      hashtag: '#MarketingDigital',
      viral_score: 92,
      velocity: '+450% em 24h',
      views: '2.5M'
    }
  },
  {
    id: 'competitor_intelligence',
    name: 'Competitor Intelligence',
    price: 997.00,
    currency: 'BRL',
    type: 'one_time',
    description: 'Relatório completo de análise competitiva com dados estratégicos',
    tier_required: 'PRO',
    category: 'intelligence',
    features: ['Análise de 5 competidores', 'SWOT', 'Oportunidades de mercado', 'Dados financeiros estimados'],
    sample_output: {
      competitors_analyzed: 5,
      market_share: '25% líder',
      opportunities: ['Gap em serviço X', 'Preço 20% acima mercado'],
      report_pages: 45
    }
  },
  {
    id: 'market_research_report',
    name: 'Market Research Report',
    price: 2497.00,
    currency: 'BRL',
    type: 'one_time',
    description: 'Pesquisa de mercado completa com dados primários e secundários',
    tier_required: 'ENTERPRISE',
    category: 'intelligence',
    features: ['TAM/SAM/SOM', 'Personas', 'Pricing analysis', 'Go-to-market strategy'],
    sample_output: {
      tam: 'R$ 500M',
      target_personas: 4,
      pricing_recommendation: 'R$ 199-499/mês',
      gtm_strategy: 'Inbound + Partnerships'
    }
  }
];

// Mock purchases DB (substituir por Supabase)
const purchasesDB = new Map();

// ═══════════════════════════════════════════════════════════════════════════
// 🔎 LIST DATASETS — GET /v1/marketplace/datasets
// ═══════════════════════════════════════════════════════════════════════════
router.get('/datasets', (req, res) => {
  const { category, tier } = req.query;
  
  let datasets = DATASETS;
  
  if (category) {
    datasets = datasets.filter(d => d.category === category);
  }
  
  if (tier) {
    datasets = datasets.filter(d => {
      const tiers = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
      return tiers.indexOf(d.tier_required) <= tiers.indexOf(tier);
    });
  }
  
  res.json({
    success: true,
    count: datasets.length,
    datasets: datasets.map(d => ({
      id: d.id,
      name: d.name,
      price: d.price,
      currency: d.currency,
      type: d.type,
      description: d.description,
      tier_required: d.tier_required,
      category: d.category,
      features: d.features
    }))
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 📄 DATASET DETAILS — GET /v1/marketplace/datasets/:id
// ═══════════════════════════════════════════════════════════════════════════
router.get('/datasets/:id', (req, res) => {
  const dataset = DATASETS.find(d => d.id === req.params.id);
  
  if (!dataset) {
    return res.status(404).json({
      success: false,
      error: 'DATASET_NOT_FOUND',
      message: 'Dataset não encontrado'
    });
  }

  res.json({
    success: true,
    dataset: {
      ...dataset,
      estimated_delivery: dataset.type === 'one_time' ? '24-48 horas' : 'instantâneo',
      refund_policy: '7 dias para one_time, não aplicável para per_request'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 💳 PURCHASE — POST /v1/marketplace/purchase
// ═══════════════════════════════════════════════════════════════════════════
router.post('/purchase', async (req, res) => {
  try {
    const { dataset_id, user_email, user_name, tier = 'PRO' } = req.body;

    if (!dataset_id || !user_email) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'dataset_id e user_email são obrigatórios'
      });
    }

    const dataset = DATASETS.find(d => d.id === dataset_id);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'DATASET_NOT_FOUND',
        message: 'Dataset não encontrado'
      });
    }

    const purchase_id = `MKT-${uuidv4().slice(0, 8).toUpperCase()}`;
    const api_key = `gx_mkt_${uuidv4().replace(/-/g, '')}`;
    
    // Criar registro de compra
    const purchase = {
      purchase_id,
      dataset_id,
      user_email,
      user_name: user_name || 'Cliente',
      status: 'pending_payment',
      created_at: new Date().toISOString(),
      api_key,
      amount: dataset.price,
      currency: dataset.currency,
      dataset_name: dataset.name
    };
    
    purchasesDB.set(purchase_id, purchase);

    // Se for per_request, API key já é ativa (mas sem créditos ainda)
    // Se for one_time, precisa de pagamento
    let pix_payment = null;
    
    if (dataset.type === 'one_time' || dataset.price > 0) {
      try {
        // Gerar PIX via MercadoPago
        const actor_code = `MKT${purchase_id.replace('MKT-', '')}`;
        pix_payment = await mpPayments.createPixPayment({
          actor_code,
          amount: dataset.price,
          payer_email: user_email,
          payer_name: user_name || 'Cliente Marketplace',
          tier
        });
        
        // Associar payment_id à compra para webhook ativar depois
        purchase.mp_payment_id = pix_payment.payment_id;
        purchase.external_reference = pix_payment.external_reference;
        
      } catch (pixError) {
        console.error('[❌ MARKETPLACE] Erro gerando PIX:', pixError.message);
        // Fallback: PIX manual
        pix_payment = {
          type: 'pix_manual',
          message: 'Pagamento PIX será gerado manualmente',
          amount: dataset.price,
          instructions: 'Entre em contato para finalizar'
        };
      }
    }

    console.log(`[💰 MARKETPLACE] Compra iniciada: ${purchase_id} | Dataset: ${dataset.name} | Valor: R$ ${dataset.price}`);

    res.json({
      success: true,
      purchase_id,
      status: 'pending_payment',
      dataset: {
        id: dataset.id,
        name: dataset.name,
        price: dataset.price,
        type: dataset.type
      },
      credentials: {
        api_key,
        note: dataset.type === 'one_time' 
          ? 'API key será ativada após confirmação do pagamento'
          : 'API key ativa. Adicione créditos para usar.'
      },
      payment: pix_payment || {
        type: 'free',
        message: 'Dataset gratuito - API key ativada'
      },
      next_steps: [
        '1. Realize o pagamento PIX (se aplicável)',
        '2. Aguarde confirmação automática (1-5 min)',
        '3. Use seu API key para acessar: GET /v1/marketplace/access/:dataset_id'
      ]
    });

  } catch (error) {
    console.error('[❌ MARKETPLACE] Erro na compra:', error);
    res.status(500).json({
      success: false,
      error: 'PURCHASE_FAILED',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔓 ACCESS DATASET — GET /v1/marketplace/access/:dataset_id
// ═══════════════════════════════════════════════════════════════════════════
router.get('/access/:dataset_id', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const { dataset_id } = req.params;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'X-API-Key header obrigatório'
      });
    }

    // Validar API key (mock - substituir por Supabase)
    const purchase = Array.from(purchasesDB.values()).find(p => 
      p.api_key === apiKey && p.dataset_id === dataset_id
    );

    if (!purchase) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'API key inválida ou sem acesso a este dataset'
      });
    }

    if (purchase.status !== 'active' && purchase.status !== 'pending_payment') {
      return res.status(402).json({
        success: false,
        error: 'PAYMENT_REQUIRED',
        message: 'Pagamento pendente ou cancelado'
      });
    }

    const dataset = DATASETS.find(d => d.id === dataset_id);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        error: 'DATASET_NOT_FOUND'
      });
    }

    // Incrementar uso
    purchase.requests_used = (purchase.requests_used || 0) + 1;
    purchase.last_access = new Date().toISOString();

    // Mock data retrieval - integrar com Smart Engine real
    let data;
    
    switch (dataset_id) {
      case 'leads_google_maps':
        data = {
          leads: [
            { name: 'TechCorp Brasil', category: 'Software', phone: '+55 11 99999-1111', rating: 4.8 },
            { name: 'Digital Agency SP', category: 'Marketing', phone: '+55 11 99999-2222', rating: 4.5 },
            { name: 'StartupXYZ', category: 'Tecnologia', phone: '+55 11 99999-3333', rating: 4.9 }
          ],
          total: 3,
          query: 'tecnologia são paulo'
        };
        break;
        
      case 'leads_smart':
        data = {
          leads: [
            { name: 'Empresa Alta Conversão', score: 95, priority: 'CRITICAL', action: 'Contactar imediatamente', reason: 'No website + high demand' },
            { name: 'Negócio Promissor', score: 82, priority: 'HIGH', action: 'Oferecer marketing digital', reason: 'Low online presence' }
          ],
          total: 2
        };
        break;
        
      case 'trends_tiktok':
        data = {
          trends: [
            { hashtag: '#MarketingDigital', viral_score: 94, velocity: '+520%', views: '3.2M' },
            { hashtag: '#Empreendedorismo', viral_score: 88, velocity: '+340%', views: '1.8M' }
          ],
          timestamp: new Date().toISOString()
        };
        break;
        
      case 'competitor_intelligence':
        data = {
          report_status: purchase.status === 'active' ? 'READY' : 'PROCESSING',
          report_id: `RPT-${purchase.purchase_id}`,
          message: purchase.status === 'active' 
            ? 'Relatório completo disponível para download'
            : 'Relatório em preparação - será liberado após pagamento',
          estimated_completion: '24-48 horas'
        };
        break;
        
      default:
        data = { message: 'Dataset disponível', dataset_id };
    }

    console.log(`[✅ MARKETPLACE] Acesso: ${purchase.purchase_id} | Dataset: ${dataset_id} | Request #${purchase.requests_used}`);

    res.json({
      success: true,
      access: {
        dataset_id,
        dataset_name: dataset.name,
        status: purchase.status,
        requests_used: purchase.requests_used,
        request_limit: dataset.type === 'per_request' ? 'variable' : 'unlimited'
      },
      data
    });

  } catch (error) {
    console.error('[❌ MARKETPLACE] Erro no acesso:', error);
    res.status(500).json({
      success: false,
      error: 'ACCESS_ERROR',
      message: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 📊 USAGE ANALYTICS — GET /v1/marketplace/usage
// ═══════════════════════════════════════════════════════════════════════════
router.get('/usage', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      message: 'X-API-Key header obrigatório'
    });
  }

  // Buscar todas as compras com esta API key
  const userPurchases = Array.from(purchasesDB.values()).filter(p => p.api_key === apiKey);
  
  const totalRequests = userPurchases.reduce((sum, p) => sum + (p.requests_used || 0), 0);
  const totalSpent = userPurchases
    .filter(p => p.status === 'active' || p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  res.json({
    success: true,
    usage: {
      total_requests: totalRequests,
      total_spent: totalSpent,
      active_datasets: userPurchases.filter(p => p.status === 'active').length,
      purchases: userPurchases.map(p => ({
        purchase_id: p.purchase_id,
        dataset_name: p.dataset_name,
        status: p.status,
        requests_used: p.requests_used || 0,
        amount: p.amount,
        created_at: p.created_at
      }))
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔍 PURCHASE STATUS — GET /v1/marketplace/purchase/:id
// ═══════════════════════════════════════════════════════════════════════════
router.get('/purchase/:purchase_id', (req, res) => {
  const { purchase_id } = req.params;
  const purchase = purchasesDB.get(purchase_id);
  
  if (!purchase) {
    return res.status(404).json({
      success: false,
      error: 'PURCHASE_NOT_FOUND'
    });
  }
  
  res.json({
    success: true,
    purchase: {
      purchase_id: purchase.purchase_id,
      status: purchase.status,
      dataset_name: purchase.dataset_name,
      amount: purchase.amount,
      created_at: purchase.created_at,
      api_key: purchase.api_key.slice(0, 15) + '...',
      payment_status: purchase.mp_payment_id ? 'pending_confirmation' : 'manual'
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 💰 PRICING — GET /v1/marketplace/pricing
// ═══════════════════════════════════════════════════════════════════════════
router.get('/pricing', (req, res) => {
  const categories = {};
  
  DATASETS.forEach(d => {
    if (!categories[d.category]) {
      categories[d.category] = [];
    }
    categories[d.category].push({
      id: d.id,
      name: d.name,
      price: d.price,
      type: d.type,
      tier_required: d.tier_required
    });
  });

  res.json({
    success: true,
    categories,
    tiers: {
      FREE: { max_price: 0, features: ['Preview limitado'] },
      BASIC: { max_price: 1.00, features: ['Datasets per_request'] },
      PRO: { max_price: 1000, features: ['One-time reports', 'Priority'] },
      ENTERPRISE: { max_price: 5000, features: ['All datasets', 'Custom requests'] }
    }
  });
});

export default router;
