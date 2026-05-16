/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🤖 GXEON DATA ENGINE - Apify Integration Layer
 * Coleta dados do mundo → Transforma em inteligência → Monetiza via API
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { getSupabase } from './supabase.js';

const APIFY_BASE_URL = 'https://api.apify.com/v2';
const APIFY_TOKEN = process.env.APIFY_TOKEN;

// ═══════════════════════════════════════════════════════════════════════════
// APIFY ACTORS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const APIFY_ACTORS = {
  google_maps: {
    id: 'compass~google-maps-scraper',
    name: 'Google Maps Scraper',
    description: 'Extract business data from Google Maps'
  },
  tiktok: {
    id: 'apify~tiktok-scraper',
    name: 'TikTok Scraper', 
    description: 'Extract trending videos and analytics'
  },
  instagram: {
    id: 'apify~instagram-scraper',
    name: 'Instagram Scraper',
    description: 'Extract profiles and engagement data'
  },
  twitter: {
    id: 'apify~twitter-scraper',
    name: 'Twitter Scraper',
    description: 'Extract tweets and sentiment data'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA COLLECTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class ApifyDataEngine {
  constructor() {
    if (!APIFY_TOKEN) {
      console.warn('[APIFY] Token not configured - using mock mode');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH LEADS FROM GOOGLE MAPS
  // ═══════════════════════════════════════════════════════════════════════════
  async fetchLeads(query, location, maxResults = 50) {
    console.log(`[APIFY] Fetching leads: ${query} in ${location}`);
    
    if (!APIFY_TOKEN) {
      // Mock data for testing
      return this.generateMockLeads(query, location, maxResults);
    }

    try {
      const response = await axios.post(
        `${APIFY_BASE_URL}/acts/${APIFY_ACTORS.google_maps.id}/runs`,
        {
          searchStringsArray: [query],
          locationQuery: location,
          maxCrawledPlaces: maxResults,
          language: 'pt',
          region: 'br'
        },
        {
          headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
          timeout: 30000
        }
      );

      const runId = response.data.data.id;
      
      // Wait for completion
      const results = await this.waitForResults(runId);
      
      // Process and qualify leads
      return this.processLeads(results);
      
    } catch (err) {
      console.error('[APIFY] Error fetching leads:', err.message);
      return this.generateMockLeads(query, location, maxResults);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH TRENDS FROM TIKTOK
  // ═══════════════════════════════════════════════════════════════════════════
  async fetchTrends(hashtag, maxResults = 20) {
    console.log(`[APIFY] Fetching trends: #${hashtag}`);
    
    if (!APIFY_TOKEN) {
      return this.generateMockTrends(hashtag, maxResults);
    }

    try {
      const response = await axios.post(
        `${APIFY_BASE_URL}/acts/${APIFY_ACTORS.tiktok.id}/runs`,
        {
          hashtags: [hashtag],
          resultsPerPage: maxResults,
          shouldDownloadVideos: false
        },
        {
          headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` },
          timeout: 30000
        }
      );

      const runId = response.data.data.id;
      const results = await this.waitForResults(runId);
      
      return this.processTrends(results);
      
    } catch (err) {
      console.error('[APIFY] Error fetching trends:', err.message);
      return this.generateMockTrends(hashtag, maxResults);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WAIT FOR ACTOR RUN COMPLETION
  // ═══════════════════════════════════════════════════════════════════════════
  async waitForResults(runId, maxWait = 120000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const response = await axios.get(
          `${APIFY_BASE_URL}/acts/runs/${runId}`,
          { headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` } }
        );
        
        const status = response.data.data.status;
        
        if (status === 'SUCCEEDED') {
          // Fetch dataset items
          const datasetId = response.data.data.defaultDatasetId;
          const itemsResponse = await axios.get(
            `${APIFY_BASE_URL}/datasets/${datasetId}/items`,
            { headers: { 'Authorization': `Bearer ${APIFY_TOKEN}` } }
          );
          return itemsResponse.data;
        }
        
        if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
          throw new Error(`Actor run ${status}`);
        }
        
        // Wait before polling again
        await new Promise(r => setTimeout(r, 5000));
        
      } catch (err) {
        console.error('[APIFY] Polling error:', err.message);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    
    throw new Error('Timeout waiting for results');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS & QUALIFY LEADS
  // ═══════════════════════════════════════════════════════════════════════════
  processLeads(rawData) {
    return rawData.map(place => ({
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: place.title || place.name,
      category: place.category || 'Unknown',
      address: place.address,
      phone: place.phone,
      website: place.website,
      rating: place.totalScore || place.rating,
      reviews_count: place.reviewsCount,
      coordinates: place.location || place.coordinates,
      // Qualification metrics
      qualified: this.qualifyLead(place),
      score: this.calculateLeadScore(place),
      source: 'google_maps',
      scraped_at: new Date().toISOString()
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS TRENDS
  // ═══════════════════════════════════════════════════════════════════════════
  processTrends(rawData) {
    return rawData.map(video => ({
      id: video.id || video.videoId,
      description: video.text || video.description,
      author: video.authorName || video.author,
      views: video.playCount || video.views || 0,
      likes: video.likeCount || video.likes || 0,
      shares: video.shareCount || video.shares || 0,
      comments: video.commentCount || video.comments || 0,
      hashtag: video.hashtag || 'general',
      // Trend metrics
      viral_score: this.calculateViralScore(video),
      trend_velocity: this.calculateTrendVelocity(video),
      recommended_action: this.getTrendRecommendation(video),
      source: 'tiktok',
      scraped_at: new Date().toISOString()
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAD QUALIFICATION LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  qualifyLead(place) {
    const rating = place.totalScore || place.rating || 0;
    const hasContact = place.phone || place.website || place.email;
    const hasReviews = (place.reviewsCount || 0) > 10;
    
    return rating >= 3.0 && hasContact && hasReviews;
  }

  calculateLeadScore(place) {
    let score = 0;
    
    // Rating weight: 40%
    score += (place.totalScore || place.rating || 0) * 8;
    
    // Reviews weight: 30%
    score += Math.min((place.reviewsCount || 0) / 10, 30);
    
    // Contact completeness: 30%
    if (place.phone) score += 10;
    if (place.website) score += 10;
    if (place.email) score += 10;
    
    return Math.min(Math.round(score), 100);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TREND ANALYSIS LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  calculateViralScore(video) {
    const views = video.playCount || video.views || 0;
    const likes = video.likeCount || video.likes || 0;
    const shares = video.shareCount || video.shares || 0;
    
    // Engagement rate
    const engagementRate = views > 0 ? (likes + shares * 2) / views : 0;
    
    // Viral coefficient
    return Math.min(Math.round(engagementRate * 1000 + (views / 1000)), 100);
  }

  calculateTrendVelocity(video) {
    // Mock velocity calculation
    const views = video.playCount || video.views || 0;
    if (views > 1000000) return 'explosive';
    if (views > 100000) return 'high';
    if (views > 10000) return 'medium';
    return 'low';
  }

  getTrendRecommendation(video) {
    const viralScore = this.calculateViralScore(video);
    
    if (viralScore > 80) return 'URGENT: Jump on trend immediately';
    if (viralScore > 60) return 'HIGH: Create content this week';
    if (viralScore > 40) return 'MEDIUM: Monitor and plan';
    return 'LOW: Observe only';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK DATA GENERATORS (for testing without APIFY token)
  // ═══════════════════════════════════════════════════════════════════════════
  generateMockLeads(query, location, count) {
    const categories = ['Restaurant', 'Store', 'Service', 'Clinic', 'Agency'];
    const leads = [];
    
    for (let i = 0; i < count; i++) {
      leads.push({
        id: `lead_mock_${Date.now()}_${i}`,
        name: `${query} Business ${i + 1}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        address: `${location}, Street ${i + 1}`,
        phone: `+55 11 9${Math.floor(Math.random() * 900000000 + 100000000)}`,
        website: Math.random() > 0.3 ? `https://business${i + 1}.com` : null,
        rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
        reviews_count: Math.floor(Math.random() * 500),
        coordinates: { lat: -23.5 + Math.random() * 0.1, lng: -46.6 + Math.random() * 0.1 },
        qualified: Math.random() > 0.4,
        score: Math.floor(Math.random() * 40 + 60),
        source: 'google_maps_mock',
        scraped_at: new Date().toISOString()
      });
    }
    
    return leads;
  }

  generateMockTrends(hashtag, count) {
    const trends = [];
    
    for (let i = 0; i < count; i++) {
      const views = Math.floor(Math.random() * 5000000 + 10000);
      
      trends.push({
        id: `trend_mock_${Date.now()}_${i}`,
        description: `Trending video about #${hashtag} - content ${i + 1}`,
        author: `@creator_${i + 1}`,
        views: views,
        likes: Math.floor(views * (Math.random() * 0.1 + 0.05)),
        shares: Math.floor(views * (Math.random() * 0.02 + 0.01)),
        comments: Math.floor(views * (Math.random() * 0.01 + 0.005)),
        hashtag: hashtag,
        viral_score: Math.floor(Math.random() * 60 + 40),
        trend_velocity: views > 1000000 ? 'explosive' : views > 100000 ? 'high' : 'medium',
        recommended_action: views > 100000 ? 'Create content now!' : 'Monitor trend',
        source: 'tiktok_mock',
        scraped_at: new Date().toISOString()
      });
    }
    
    return trends;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK EXECUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
export class TaskExecutionEngine {
  constructor() {
    this.apify = new ApifyDataEngine();
  }

  async executeTask(taskType, params) {
    console.log(`[TASK] Executing: ${taskType}`, params);
    
    const startTime = Date.now();
    let result;
    
    switch (taskType) {
      case 'fetch_leads':
        result = await this.apify.fetchLeads(
          params.query,
          params.location,
          params.maxResults || 50
        );
        break;
        
      case 'analyze_trends':
        result = await this.apify.fetchTrends(
          params.hashtag,
          params.maxResults || 20
        );
        break;
        
      case 'competitor_analysis':
        result = await this.analyzeCompetitor(params.target);
        break;
        
      case 'market_research':
        result = await this.conductMarketResearch(params);
        break;
        
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
    
    const duration = Date.now() - startTime;
    
    // Log execution for billing
    await this.logTaskExecution(taskType, params, duration, result.length);
    
    return {
      task: taskType,
      params,
      duration_ms: duration,
      result_count: result.length,
      results: result,
      timestamp: new Date().toISOString()
    };
  }

  async analyzeCompetitor(target) {
    // Mock competitor analysis
    return {
      name: target,
      social_presence: {
        instagram: { followers: 15000, engagement: 4.2 },
        tiktok: { followers: 45000, engagement: 8.5 }
      },
      top_content: ['Video 1', 'Video 2', 'Video 3'],
      weaknesses: ['Inconsistent posting', 'No website'],
      opportunities: ['Untapped hashtags', 'Local market gap']
    };
  }

  async conductMarketResearch(params) {
    // Mock market research
    return {
      market: params.industry || 'general',
      size_estimate: 'R$ 50M - R$ 100M',
      growth_rate: '15% YoY',
      key_players: ['Company A', 'Company B', 'Company C'],
      trends: ['Digital transformation', 'AI adoption'],
      opportunities: ['Niche underserved', 'Price gap']
    };
  }

  async logTaskExecution(taskType, params, duration, resultCount) {
    try {
      const supabase = getSupabase();
      await supabase.from('task_executions').insert({
        task_type: taskType,
        params: JSON.stringify(params),
        duration_ms: duration,
        result_count: resultCount,
        executed_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[TASK] Logging error:', err.message);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════
export const dataEngine = new ApifyDataEngine();
export const taskEngine = new TaskExecutionEngine();
