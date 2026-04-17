/**
 * 🤖 GXEON SWARM SCOUTER v3.0
 * Agent Autônomo de Prospecção M2M
 * Escaneia blockchain e marketplaces para identificar oportunidades
 */

const axios = require('axios');
const crypto = require('crypto');
const supabase = require('../services/supabase');

class SwarmScouter {
  constructor(config = {}) {
    this.config = {
      arbiscanApiKey: config.arbiscanApiKey || process.env.ARBISCAN_API_KEY,
      githubToken: config.githubToken || process.env.GITHUB_TOKEN,
      rapidapiKey: config.rapidapiKey || process.env.RAPIDAPI_KEY,
      scanInterval: config.scanInterval || 3600000, // 1h default
      maxTargetsPerScan: config.maxTargetsPerScan || 50,
      ...config
    };
    
    this.targets = [];
    this.isScanning = false;
    this.scanStats = {
      totalScanned: 0,
      botsIdentified: 0,
      lastScan: null
    };
    
    // Sources de prospecção
    this.sources = {
      arbiscan: 'https://api.arbiscan.io/api',
      github: 'https://api.github.com',
      rapidapi: 'https://rapidapi.com'
    };
  }

  /**
   * Inicializa o scouter
   */
  async initialize() {
    console.log('[🎯 SWARM_SCOUTER] Inicializando agente de prospecção...');
    await this.loadHistoricalData();
    console.log(`[🎯 SWARM_SCOUTER] Pronto - ${this.targets.length} targets históricos carregados`);
    return this;
  }

  /**
   * Carrega dados históricos do Supabase
   */
  async loadHistoricalData() {
    try {
      const { data, error } = await supabase
        .from('swarm_targets')
        .select('*')
        .eq('status', 'active')
        .order('discovered_at', { ascending: false })
        .limit(1000);
        
      if (error) throw error;
      this.targets = data || [];
    } catch (err) {
      console.warn('[🎯 SWARM_SCOUTER] Erro ao carregar dados históricos:', err.message);
      this.targets = [];
    }
  }

  /**
   * EXECUTE_SCAN_PRINCIPAL
   * Escaneia todas as fontes configuradas
   */
  async executeFullScan() {
    if (this.isScanning) {
      console.log('[🎯 SWARM_SCOUTER] Scan já em andamento...');
      return { status: 'already_scanning' };
    }
    
    this.isScanning = true;
    console.log('[🎯 SWARM_SCOUTER] Iniciando scan completo do ecossistema...');
    
    const results = {
      arbiscan: [],
      github: [],
      rapidapi: [],
      timestamp: new Date().toISOString()
    };
    
    try {
      // Scan paralelo de todas as fontes
      const scans = [];
      
      if (this.config.arbiscanApiKey) {
        scans.push(this.scanArbiscan().then(data => {
          results.arbiscan = data;
          console.log(`[🎯 SWARM_SCOUTER] Arbiscan: ${data.length} contratos encontrados`);
        }));
      }
      
      if (this.config.githubToken) {
        scans.push(this.scanGitHub().then(data => {
          results.github = data;
          console.log(`[🎯 SWARM_SCOUTER] GitHub: ${data.length} repositórios MEV encontrados`);
        }));
      }
      
      scans.push(this.scanRapidAPI().then(data => {
        results.rapidapi = data;
        console.log(`[🎯 SWARM_SCOUTER] RapidAPI: ${data.length} competidores identificados`);
      }));
      
      await Promise.allSettled(scans);
      
      // Processa e qualifica os leads
      const qualifiedLeads = await this.qualifyLeads(results);
      
      // Persiste no banco
      await this.persistTargets(qualifiedLeads);
      
      this.scanStats.totalScanned += Object.values(results).flat().length;
      this.scanStats.botsIdentified += qualifiedLeads.length;
      this.scanStats.lastScan = new Date().toISOString();
      
      console.log(`[🎯 SWARM_SCOUTER] Scan completo: ${qualifiedLeads.length} leads qualificados`);
      
      return {
        status: 'success',
        leadsFound: qualifiedLeads.length,
        bySource: {
          arbiscan: results.arbiscan.length,
          github: results.github.length,
          rapidapi: results.rapidapi.length
        },
        qualifiedLeads: qualifiedLeads.slice(0, 10) // Top 10 para análise
      };
      
    } catch (error) {
      console.error('[🎯 SWARM_SCOUTER] Erro no scan:', error);
      return { status: 'error', error: error.message };
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * SCAN_ARBISCAN
   * Escaneia contratos ativos na Arbitrum
   */
  async scanArbiscan() {
    const targets = [];
    
    try {
      // Busca contratos com atividade recente (transações > 1000)
      const response = await axios.get(this.sources.arbiscan, {
        params: {
          module: 'account',
          action: 'txlist',
          address: '0x0000000000000000000000000000000000000000', // Placeholder - em produção usa algoritmo de descoberta
          startblock: '0',
          endblock: '99999999',
          sort: 'desc',
          apikey: this.config.arbiscanApiKey
        },
        timeout: 30000
      });
      
      if (response.data?.result) {
        // Analisa transações para identificar bots
        const txAnalysis = this.analyzeTransactions(response.data.result);
        
        for (const bot of txAnalysis.potentialBots.slice(0, this.config.maxTargetsPerScan)) {
          targets.push({
            id: crypto.randomUUID(),
            type: 'arbiscan_contract',
            address: bot.address,
            chain: 'arbitrum',
            txCount: bot.txCount,
            avgGasPrice: bot.avgGasPrice,
            lastActivity: bot.lastActivity,
            score: this.calculateBotScore(bot),
            endpoint: null, // Será descoberto via heurística
            discoveryMethod: 'arbiscan_scan',
            status: 'pending_infiltration'
          });
        }
      }
    } catch (error) {
      console.error('[🎯 SWARM_SCOUTER] Erro Arbiscan:', error.message);
    }
    
    return targets;
  }

  /**
   * SCAN_GITHUB
   * Busca repositórios MEV e bots
   */
  async scanGitHub() {
    const targets = [];
    const searchQueries = [
      'MEV bot Arbitrum',
      'arbitrage bot ethereum',
      'flashloan bot',
      'trading bot API',
      'crypto trading automation'
    ];
    
    try {
      for (const query of searchQueries.slice(0, 3)) {
        const response = await axios.get(`${this.sources.github}/search/repositories`, {
          headers: {
            'Authorization': `token ${this.config.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          params: {
            q: query,
            sort: 'updated',
            order: 'desc',
            per_page: 10
          },
          timeout: 30000
        });
        
        if (response.data?.items) {
          for (const repo of response.data.items) {
            const target = {
              id: crypto.randomUUID(),
              type: 'github_repo',
              name: repo.full_name,
              url: repo.html_url,
              stars: repo.stargazers_count,
              lastPush: repo.pushed_at,
              language: repo.language,
              description: repo.description,
              owner: {
                login: repo.owner.login,
                type: repo.owner.type,
                url: repo.owner.html_url
              },
              // Tenta extrair email/endpoint do README ou owner
              endpoint: await this.extractEndpointFromRepo(repo),
              score: this.calculateRepoScore(repo),
              discoveryMethod: 'github_scan',
              status: 'pending_infiltration'
            };
            
            targets.push(target);
          }
        }
        
        // Rate limit compliance
        await this.delay(2000);
      }
    } catch (error) {
      console.error('[🎯 SWARM_SCOUTER] Erro GitHub:', error.message);
    }
    
    return targets;
  }

  /**
   * SCAN_RAPIDAPI
   * Analisa competidores no marketplace
   */
  async scanRapidAPI() {
    const targets = [];
    
    try {
      // Scrape de APIs relacionadas a trading/crypto
      const response = await axios.get('https://rapidapi.com/search', {
        params: { q: 'crypto trading bot' },
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });
      
      // Parse básico para identificar APIs
      const apiMatches = response.data.match(/\/api\/[^"\s]+/g) || [];
      const uniqueApis = [...new Set(apiMatches)].slice(0, 20);
      
      for (const apiPath of uniqueApis) {
        targets.push({
          id: crypto.randomUUID(),
          type: 'rapidapi_competitor',
          apiPath: apiPath,
          marketplace: 'rapidapi',
          discoveryMethod: 'marketplace_scan',
          status: 'pending_analysis',
          score: 50 // Base score, será refinado
        });
      }
    } catch (error) {
      console.error('[🎯 SWARM_SCOUTER] Erro RapidAPI scan:', error.message);
    }
    
    return targets;
  }

  /**
   * Métodos auxiliares privados
   */
  analyzeTransactions(transactions) {
    const addressStats = {};
    
    for (const tx of transactions) {
      const addr = tx.from;
      if (!addressStats[addr]) {
        addressStats[addr] = { txCount: 0, gasPrices: [], lastActivity: null };
      }
      
      addressStats[addr].txCount++;
      addressStats[addr].gasPrices.push(parseInt(tx.gasPrice) || 0);
      addressStats[addr].lastActivity = tx.timeStamp;
    }
    
    // Identifica bots por padrão de uso
    const potentialBots = Object.entries(addressStats)
      .filter(([_, stats]) => stats.txCount > 100) // Alto volume
      .map(([address, stats]) => ({
        address,
        txCount: stats.txCount,
        avgGasPrice: stats.gasPrices.reduce((a, b) => a + b, 0) / stats.gasPrices.length,
        lastActivity: stats.lastActivity
      }))
      .sort((a, b) => b.txCount - a.txCount);
    
    return { potentialBots };
  }

  async extractEndpointFromRepo(repo) {
    // Heurística para tentar encontrar contato do dono
    const possibleEndpoints = [];
    
    // Tenta endpoint do owner
    if (repo.owner?.type === 'User') {
      try {
        const userResponse = await axios.get(`${this.sources.github}/users/${repo.owner.login}`, {
          headers: { 'Authorization': `token ${this.config.githubToken}` },
          timeout: 10000
        });
        
        if (userResponse.data?.email) {
          possibleEndpoints.push({ type: 'email', value: userResponse.data.email });
        }
        if (userResponse.data?.blog) {
          possibleEndpoints.push({ type: 'website', value: userResponse.data.blog });
        }
        if (userResponse.data?.twitter_username) {
          possibleEndpoints.push({ type: 'twitter', value: userResponse.data.twitter_username });
        }
      } catch (e) {
        // Silencioso
      }
    }
    
    return possibleEndpoints.length > 0 ? possibleEndpoints : null;
  }

  calculateBotScore(bot) {
    // Score baseado em: volume, consistência, recência
    let score = 0;
    
    if (bot.txCount > 1000) score += 30;
    else if (bot.txCount > 500) score += 20;
    else if (bot.txCount > 100) score += 10;
    
    // Recência (dias desde última atividade)
    const daysSince = (Date.now() / 1000 - parseInt(bot.lastActivity)) / 86400;
    if (daysSince < 7) score += 20;
    else if (daysSince < 30) score += 10;
    
    return Math.min(score, 100);
  }

  calculateRepoScore(repo) {
    let score = 0;
    
    // Stars
    if (repo.stargazers_count > 100) score += 25;
    else if (repo.stargazers_count > 50) score += 15;
    else if (repo.stargazers_count > 10) score += 10;
    
    // Atividade recente
    const daysSincePush = (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000;
    if (daysSincePush < 7) score += 25;
    else if (daysSincePush < 30) score += 15;
    else if (daysSincePush < 90) score += 10;
    
    // Linguagem relevante
    if (['JavaScript', 'TypeScript', 'Python', 'Solidity'].includes(repo.language)) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  async qualifyLeads(results) {
    const allLeads = Object.values(results).flat();
    
    // Filtra leads de alta qualidade (score > 40)
    const qualified = allLeads.filter(lead => lead.score > 40);
    
    // Remove duplicados por identificador único
    const seen = new Set();
    const unique = qualified.filter(lead => {
      const key = lead.address || lead.name || lead.apiPath;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Ordena por score
    return unique.sort((a, b) => b.score - a.score);
  }

  async persistTargets(targets) {
    if (!targets.length) return;
    
    try {
      // Batch insert com upsert
      const { error } = await supabase
        .from('swarm_targets')
        .upsert(targets.map(t => ({
          ...t,
          discovered_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })), {
          onConflict: 'id',
          ignoreDuplicates: false
        });
        
      if (error) throw error;
      console.log(`[🎯 SWARM_SCOUTER] ${targets.length} targets persistidos`);
    } catch (err) {
      console.error('[🎯 SWARM_SCOUTER] Erro ao persistir:', err.message);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * API Pública
   */
  getStats() {
    return {
      ...this.scanStats,
      targetsInQueue: this.targets.length,
      isScanning: this.isScanning
    };
  }

  getPendingTargets(limit = 50) {
    return this.targets
      .filter(t => t.status === 'pending_infiltration')
      .slice(0, limit);
  }
}

module.exports = SwarmScouter;
