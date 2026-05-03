/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧠 GXEON SMART ENGINE v1.0
 * Lead Intelligence & Scoring System
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// ═══════════════════════════════════════════════════════════════════════════
// SCORING RULES CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const SCORING_RULES = {
  NO_WEBSITE: { value: 30, reason: 'No website - opportunity for web dev services' },
  RATING_ABOVE_4_5: { value: 25, reason: 'High rating indicates quality business' },
  LOW_COMPETITION: { value: 20, reason: 'Low competition area' },
  HAS_PHONE: { value: 15, reason: 'Direct contact available' },
  RECENT_ACTIVITY: { value: 10, reason: 'Recent reviews/activity' }
};

// ═══════════════════════════════════════════════════════════════════════════
// SMART ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════════════
export class GxeonSmartEngine {
  constructor() {
    this.apiKey = APIFY_TOKEN;
    this.baseUrl = 'https://api.apify.com/v2';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN PIPELINE: collect → enrich → score → rank → action
  // ═══════════════════════════════════════════════════════════════════════════
  async processLeads(query, location, max = 50) {
    console.log(`[SMART_ENGINE] Processing: "${query}" in "${location}"`);
    
    try {
      // 1. COLLECT LEADS
      const rawLeads = await this.collectLeads(query, location, max);
      
      // 2. ENRICH DATA
      const enrichedLeads = await this.enrichData(rawLeads);
      
      // 3. CALCULATE SCORES
      const scoredLeads = this.calculateScores(enrichedLeads);
      
      // 4. RANK BY PRIORITY
      const rankedLeads = this.rankByPriority(scoredLeads);
      
      // 5. GENERATE ACTIONS
      const finalLeads = this.generateActions(rankedLeads);
      
      return {
        success: true,
        query,
        location,
        total_processed: finalLeads.length,
        leads: finalLeads,
        summary: this.generateSummary(finalLeads)
      };
      
    } catch (error) {
      console.error('[SMART_ENGINE] Pipeline error:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: COLLECT LEADS (via Apify Google Maps)
  // ═══════════════════════════════════════════════════════════════════════════
  async collectLeads(query, location, max) {
    console.log(`[SMART_ENGINE:1/5] Collecting leads...`);
    
    try {
      // Call Apify Google Maps scraper
      const response = await axios.get(
        `${this.baseUrl}/acts/apify~google-maps-scraper/run-sync-get-dataset-items`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          params: {
            search: `${query} in ${location}`,
            maxResults: max,
            reviewsLimit: 10
          },
          timeout: 60000
        }
      );
      
      const places = response.data || [];
      
      // Transform to lead format
      const leads = places.map(place => ({
        id: place.placeId || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: place.title || 'Unknown',
        category: place.categoryName || query,
        address: place.address || '',
        phone: place.phone || '',
        website: place.website || '',
        rating: place.totalScore || 0,
        reviews: place.reviewsCount || 0,
        location: {
          lat: place.location?.lat,
          lng: place.location?.lng
        },
        url: place.url || '',
        raw_data: place
      }));
      
      console.log(`   ✅ Collected ${leads.length} leads`);
      return leads;
      
    } catch (error) {
      console.warn('[SMART_ENGINE] Apify error, using mock:', error.message);
      return this.generateMockLeads(query, location, max);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: ENRICH DATA (analyze each lead for additional signals)
  // ═══════════════════════════════════════════════════════════════════════════
  async enrichData(leads) {
    console.log(`[SMART_ENGINE:2/5] Enriching ${leads.length} leads...`);
    
    const enriched = leads.map(lead => {
      const signals = {
        has_website: !!(lead.website && lead.website.length > 0),
        has_phone: !!(lead.phone && lead.phone.length > 0),
        has_reviews: lead.reviews > 0,
        rating_tier: this.getRatingTier(lead.rating),
        review_velocity: this.estimateReviewVelocity(lead),
        business_age_indicator: this.estimateBusinessAge(lead),
        competition_level: 'medium' // default, would require local search
      };
      
      return {
        ...lead,
        signals,
        enriched: true,
        enrichment_timestamp: new Date().toISOString()
      };
    });
    
    console.log(`   ✅ Enriched ${enriched.length} leads`);
    return enriched;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: CALCULATE SCORES (apply scoring rules)
  // ═══════════════════════════════════════════════════════════════════════════
  calculateScores(leads) {
    console.log(`[SMART_ENGINE:3/5] Calculating scores...`);
    
    const scored = leads.map(lead => {
      let score = 0;
      const reasons = [];
      
      // Rule: NO_WEBSITE (+30)
      if (!lead.signals.has_website) {
        score += SCORING_RULES.NO_WEBSITE.value;
        reasons.push(SCORING_RULES.NO_WEBSITE.reason);
      }
      
      // Rule: RATING_ABOVE_4_5 (+25)
      if (lead.rating >= 4.5) {
        score += SCORING_RULES.RATING_ABOVE_4_5.value;
        reasons.push(SCORING_RULES.RATING_ABOVE_4_5.reason);
      }
      
      // Rule: LOW_COMPETITION (+20) - simplified detection
      if (lead.reviews < 50 && lead.rating >= 4.0) {
        score += SCORING_RULES.LOW_COMPETITION.value;
        reasons.push(SCORING_RULES.LOW_COMPETITION.reason);
        lead.signals.competition_level = 'low';
      }
      
      // Rule: HAS_PHONE (+15)
      if (lead.signals.has_phone) {
        score += SCORING_RULES.HAS_PHONE.value;
        reasons.push(SCORING_RULES.HAS_PHONE.reason);
      }
      
      // Rule: RECENT_ACTIVITY (+10)
      if (lead.reviews > 10) {
        score += SCORING_RULES.RECENT_ACTIVITY.value;
        reasons.push(SCORING_RULES.RECENT_ACTIVITY.reason);
      }
      
      // Base score adjustment
      if (lead.rating > 0) {
        score += Math.min(lead.rating * 2, 10); // Up to +10 for rating
      }
      
      // Cap at 100
      score = Math.min(score, 100);
      
      return {
        ...lead,
        score,
        score_breakdown: reasons,
        scored: true
      };
    });
    
    console.log(`   ✅ Scored ${scored.length} leads`);
    return scored;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: RANK BY PRIORITY
  // ═══════════════════════════════════════════════════════════════════════════
  rankByPriority(leads) {
    console.log(`[SMART_ENGINE:4/5] Ranking by priority...`);
    
    const ranked = leads.map(lead => {
      let priority = 'LOW';
      
      if (lead.score >= 70) {
        priority = 'HIGH';
      } else if (lead.score >= 40) {
        priority = 'MEDIUM';
      }
      
      return {
        ...lead,
        priority,
        ranked: true
      };
    });
    
    // Sort by score descending
    ranked.sort((a, b) => b.score - a.score);
    
    console.log(`   ✅ Ranked ${ranked.length} leads`);
    console.log(`      HIGH: ${ranked.filter(l => l.priority === 'HIGH').length}`);
    console.log(`      MEDIUM: ${ranked.filter(l => l.priority === 'MEDIUM').length}`);
    console.log(`      LOW: ${ranked.filter(l => l.priority === 'LOW').length}`);
    
    return ranked;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: GENERATE ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  generateActions(leads) {
    console.log(`[SMART_ENGINE:5/5] Generating actions...`);
    
    const withActions = leads.map(lead => {
      let action = '';
      let estimatedConversion = 0;
      
      if (lead.priority === 'HIGH') {
        if (!lead.signals.has_website) {
          action = 'PRIORITY: Contact immediately - No website, high rating. Offer web development services.';
          estimatedConversion = 65;
        } else if (lead.rating >= 4.5 && lead.reviews < 50) {
          action = 'HIGH: Quality business with low visibility. Offer SEO/marketing services.';
          estimatedConversion = 55;
        } else {
          action = 'HIGH: Strong lead. Contact for partnership or service offering.';
          estimatedConversion = 50;
        }
      } else if (lead.priority === 'MEDIUM') {
        action = 'MEDIUM: Good potential. Follow up with tailored proposal.';
        estimatedConversion = 35;
      } else {
        action = 'LOW: Monitor or deprioritize. May improve over time.';
        estimatedConversion = 15;
      }
      
      return {
        ...lead,
        action,
        estimated_conversion: estimatedConversion,
        reason: lead.score_breakdown.join('; '),
        action_generated: true
      };
    });
    
    console.log(`   ✅ Generated actions for ${withActions.length} leads`);
    return withActions;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FREE RESPONSE (partial data only)
  // ═══════════════════════════════════════════════════════════════════════════
  generateFreeResponse(fullResults, limit = 2) {
    const limited = fullResults.leads.slice(0, limit);
    
    return {
      success: true,
      query: fullResults.query,
      location: fullResults.location,
      tier: 'FREE',
      leads_found: fullResults.total_processed,
      leads_shown: limited.length,
      leads: limited.map(lead => ({
        id: lead.id,
        name: lead.name,
        category: lead.category,
        score: lead.score,
        priority: lead.priority,
        // Hide: action, reason, contact info, estimated_conversion
      })),
      upgrade: {
        message: '💎 Unlock full lead intelligence including actions and contact details',
        endpoint: '/v1/leads/smart',
        pricing: 'https://gxeon-core.up.railway.app/v1/pricing',
        unlocks: ['full_contact', 'action_recommendations', 'conversion_estimates', 'score_breakdown']
      },
      high_score_locked: limited.some(l => l.score >= 70)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAID RESPONSE (full data)
  // ═══════════════════════════════════════════════════════════════════════════
  generatePaidResponse(fullResults) {
    return {
      success: true,
      query: fullResults.query,
      location: fullResults.location,
      tier: 'PAID',
      leads_found: fullResults.total_processed,
      leads_shown: fullResults.leads.length,
      leads: fullResults.leads.map(lead => ({
        id: lead.id,
        name: lead.name,
        category: lead.category,
        address: lead.address,
        phone: lead.phone,
        website: lead.website,
        rating: lead.rating,
        reviews: lead.reviews,
        score: lead.score,
        priority: lead.priority,
        action: lead.action,
        reason: lead.reason,
        estimated_conversion: lead.estimated_conversion,
        signals: lead.signals,
        location: lead.location
      })),
      summary: fullResults.summary,
      high_priority_count: fullResults.leads.filter(l => l.priority === 'HIGH').length
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  getRatingTier(rating) {
    if (rating >= 4.5) return 'EXCELLENT';
    if (rating >= 4.0) return 'GOOD';
    if (rating >= 3.0) return 'AVERAGE';
    return 'POOR';
  }

  estimateReviewVelocity(lead) {
    // Simplified - would need historical data for real calculation
    if (lead.reviews > 100) return 'HIGH';
    if (lead.reviews > 20) return 'MEDIUM';
    return 'LOW';
  }

  estimateBusinessAge(lead) {
    // Simplified heuristic based on review count
    if (lead.reviews > 200) return 'ESTABLISHED';
    if (lead.reviews > 50) return 'MATURE';
    if (lead.reviews > 10) return 'GROWING';
    return 'NEW';
  }

  generateSummary(leads) {
    const highPriority = leads.filter(l => l.priority === 'HIGH');
    const avgScore = leads.reduce((sum, l) => sum + l.score, 0) / leads.length;
    const noWebsite = leads.filter(l => !l.signals.has_website).length;
    const withPhone = leads.filter(l => l.signals.has_phone).length;
    
    return {
      total_leads: leads.length,
      high_priority: highPriority.length,
      medium_priority: leads.filter(l => l.priority === 'MEDIUM').length,
      low_priority: leads.filter(l => l.priority === 'LOW').length,
      average_score: Math.round(avgScore),
      without_website: noWebsite,
      with_contact: withPhone,
      top_opportunity: highPriority[0]?.name || 'N/A',
      estimated_revenue_potential: highPriority.length * 500 // rough estimate
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK DATA (fallback when Apify unavailable)
  // ═══════════════════════════════════════════════════════════════════════════
  generateMockLeads(query, location, max) {
    console.log('[SMART_ENGINE] Using mock data');
    
    const mockBusinesses = [
      { name: `${query} Premium`, rating: 4.8, reviews: 15, hasWebsite: false, hasPhone: true },
      { name: `${query} Express`, rating: 4.2, reviews: 45, hasWebsite: true, hasPhone: true },
      { name: `${query} Center`, rating: 3.9, reviews: 8, hasWebsite: false, hasPhone: false },
      { name: `Super ${query}`, rating: 4.9, reviews: 120, hasWebsite: true, hasPhone: true },
      { name: `${query} Plus`, rating: 4.5, reviews: 25, hasWebsite: false, hasPhone: true },
    ];
    
    return mockBusinesses.slice(0, max).map((biz, i) => ({
      id: `mock_${Date.now()}_${i}`,
      name: biz.name,
      category: query,
      address: `Rua ${i + 1}, ${location}`,
      phone: biz.hasPhone ? `(11) 9${1000 + i}-${2000 + i}` : '',
      website: biz.hasWebsite ? `https://${biz.name.toLowerCase().replace(/\s/g, '')}.com` : '',
      rating: biz.rating,
      reviews: biz.reviews,
      location: { lat: -23.5 + (i * 0.01), lng: -46.6 + (i * 0.01) },
      url: ''
    }));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════
export const smartEngine = new GxeonSmartEngine();
export default smartEngine;
