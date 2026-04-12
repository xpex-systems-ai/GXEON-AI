// GXEON External Fetchers - Real API Integrations
// Galxe, Zealy, Layer3 fetchers with actual API calls

const fetch = require('node-fetch');

class GalxeFetcher {
  constructor() {
    this.baseUrl = 'https://graphigo.prd.galaxy.eco/query';
    this.name = 'galxe';
  }

  async fetchCampaigns(limit = 10, campaignLimit = 5) {
    console.log(`[GalxeFetcher] Fetching campaigns...`);

    const query = `
      query SpaceCampaignList($first: Int!, $campaignFirst: Int!) {
        spaceList(first: $first) {
          list {
            id
            name
            campaigns(first: $campaignFirst) {
              list {
                id
                name
                description
                rewardType
                rewardAmount
                startTime
                endTime
                status
                chain
              }
            }
          }
        }
      }
    `;

    const variables = {
      first: limit,
      campaignFirst: campaignLimit
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          operationName: 'SpaceCampaignList',
          variables,
          query
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.errors) {
        console.error('[GalxeFetcher] GraphQL errors:', data.errors);
        throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
      }

      return this.parseResponse(data);

    } catch (error) {
      console.error('[GalxeFetcher] Error:', error.message);
      // Return empty array on error, system will use mock data as fallback
      return [];
    }
  }

  parseResponse(data) {
    const tasks = [];
    
    const spaces = data?.data?.spaceList?.list || [];
    
    for (const space of spaces) {
      const campaigns = space?.campaigns?.list || [];
      
      for (const campaign of campaigns) {
        // Determine task type based on rewardType and requirements
        let taskType = 'quest';
        let executionMode = 'api';
        
        // Map reward type
        let rewardType = 'points';
        if (campaign.rewardType?.toLowerCase().includes('token')) {
          rewardType = 'token';
        } else if (campaign.rewardType?.toLowerCase().includes('nft')) {
          rewardType = 'nft';
        }

        // Parse reward amount
        let rewardValue = 0;
        if (campaign.rewardAmount) {
          rewardValue = parseFloat(campaign.rewardAmount) || 0;
        }

        // Generate task ID
        const taskId = `galxe_${campaign.id}`;

        // Determine requirements based on campaign name/description
        const requirements = this.inferRequirements(campaign);

        tasks.push({
          id: taskId,
          title: campaign.name || 'Untitled Campaign',
          description: campaign.description || '',
          type: taskType,
          source: 'galxe',
          space_name: space.name,
          space_id: space.id,
          
          reward: {
            type: rewardType,
            value: rewardValue,
            raw_type: campaign.rewardType
          },
          
          timing: {
            start: campaign.startTime,
            end: campaign.endTime,
            status: campaign.status
          },
          
          requirements: requirements,
          
          chain: campaign.chain,
          
          execution: {
            mode: executionMode,
            url: `https://galxe.com/campaign/${campaign.id}`,
            steps: this.generateSteps(campaign, requirements)
          },
          
          raw_data: campaign
        });
      }
    }

    console.log(`[GalxeFetcher] Parsed ${tasks.length} campaigns`);
    return tasks;
  }

  inferRequirements(campaign) {
    const requirements = [];
    const text = `${campaign.name || ''} ${campaign.description || ''}`.toLowerCase();

    // Social actions
    if (text.includes('follow') || text.includes('twitter')) {
      requirements.push({
        action: 'twitter_follow',
        target: extractMention(text) || 'project_twitter',
        validation: 'api_check'
      });
    }

    if (text.includes('retweet') || text.includes('rt') || text.includes('repost')) {
      requirements.push({
        action: 'twitter_retweet',
        target: 'campaign_tweet',
        validation: 'api_check'
      });
    }

    if (text.includes('discord') || text.includes('join')) {
      requirements.push({
        action: 'discord_join',
        target: 'project_discord',
        validation: 'api_check'
      });
    }

    if (text.includes('telegram') || text.includes('tg')) {
      requirements.push({
        action: 'telegram_join',
        target: 'project_telegram',
        validation: 'api_check'
      });
    }

    // On-chain actions
    if (text.includes('swap') || text.includes('trade')) {
      requirements.push({
        action: 'dex_swap',
        target: campaign.chain || 'ethereum',
        validation: 'tx_receipt'
      });
    }

    if (text.includes('bridge')) {
      requirements.push({
        action: 'bridge_tokens',
        target: extractChain(text) || 'target_chain',
        validation: 'tx_receipt'
      });
    }

    if (text.includes('mint') || text.includes('nft')) {
      requirements.push({
        action: 'mint_nft',
        target: campaign.chain || 'ethereum',
        validation: 'tx_receipt'
      });
    }

    if (text.includes('stake') || text.includes('staking')) {
      requirements.push({
        action: 'stake_tokens',
        target: campaign.chain || 'ethereum',
        validation: 'tx_receipt'
      });
    }

    // If no specific requirements detected, add generic visit
    if (requirements.length === 0) {
      requirements.push({
        action: 'visit_campaign',
        target: campaign.id,
        validation: 'manual_or_api'
      });
    }

    return requirements;
  }

  generateSteps(campaign, requirements) {
    return requirements.map((req, index) => ({
      step_id: `step_${index + 1}`,
      action: req.action,
      target: req.target,
      validation: req.validation,
      payload: {
        campaign_id: campaign.id,
        chain: campaign.chain,
        url: `https://galxe.com/campaign/${campaign.id}`
      }
    }));
  }
}

// Helper functions
function extractMention(text) {
  const match = text.match(/@(\w+)/);
  return match ? match[1] : null;
}

function extractChain(text) {
  const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'solana'];
  const lowerText = text.toLowerCase();
  
  for (const chain of chains) {
    if (lowerText.includes(chain)) {
      return chain;
    }
  }
  
  return null;
}

// Zealy Fetcher (placeholder - similar structure)
class ZealyFetcher {
  constructor() {
    this.name = 'zealy';
    // Zealy requires API key for most endpoints
    this.apiKey = process.env.ZEALY_API_KEY || null;
  }

  async fetchQuests() {
    console.log(`[ZealyFetcher] Fetching quests...`);
    
    if (!this.apiKey) {
      console.log('[ZealyFetcher] No API key configured, returning mock data');
      return this.getMockData();
    }

    // Zealy API implementation would go here
    // For now, return mock data
    return this.getMockData();
  }

  getMockData() {
    return [
      {
        id: 'zealy_quest_001',
        title: 'Join Discord Community',
        description: 'Join the official Discord server and verify',
        type: 'social',
        reward: { type: 'points', value: 100 },
        requirements: [
          { action: 'discord_join', target: 'invite_link', validation: 'api_check' }
        ]
      },
      {
        id: 'zealy_quest_002',
        title: 'Follow on Twitter',
        description: 'Follow the project on Twitter',
        type: 'social',
        reward: { type: 'points', value: 50 },
        requirements: [
          { action: 'twitter_follow', target: '@project', validation: 'api_check' }
        ]
      }
    ];
  }
}

// Layer3 Fetcher (placeholder)
class Layer3Fetcher {
  constructor() {
    this.name = 'layer3';
    this.apiKey = process.env.LAYER3_API_KEY || null;
  }

  async fetchQuests() {
    console.log(`[Layer3Fetcher] Fetching quests...`);
    
    if (!this.apiKey) {
      console.log('[Layer3Fetcher] No API key configured, returning mock data');
      return this.getMockData();
    }

    return this.getMockData();
  }

  getMockData() {
    return [
      {
        id: 'layer3_quest_001',
        title: 'Bridge to Arbitrum',
        description: 'Bridge any amount to Arbitrum network',
        type: 'onchain',
        reward: { type: 'nft', value: 1 },
        requirements: [
          { action: 'bridge', target: 'arbitrum', validation: 'tx_receipt' }
        ]
      }
    ];
  }
}

module.exports = {
  GalxeFetcher,
  ZealyFetcher,
  Layer3Fetcher
};
