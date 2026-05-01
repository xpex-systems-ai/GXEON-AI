import { ethers } from 'ethers';
import { ACTIVE_NETWORK } from '../../config/networks';

// Chainlink Price Feed ABI (simplified)
const CHAINLINK_FEED_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { internalType: 'uint80', name: 'roundId', type: 'uint80' },
      { internalType: 'int256', name: 'answer', type: 'int256' },
      { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
      { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
      { internalType: 'uint80', name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
];

interface PriceData {
  price: number;
  timestamp: number;
  roundId: bigint;
  decimals: number;
}

interface PriceCache {
  [key: string]: {
    data: PriceData;
    expiry: number;
  };
}

// Cache para evitar chamadas excessivas (30 segundos)
const CACHE_DURATION = 30000;
const priceCache: PriceCache = {};

/**
 * Busca preço de um ativo via Chainlink Price Feed
 * Precisão de centavos de dólar garantida
 */
export async function getChainlinkPrice(
  provider: ethers.Provider,
  feedAddress: string
): Promise<PriceData> {
  const cacheKey = feedAddress;
  const now = Date.now();
  
  // Verifica cache
  if (priceCache[cacheKey] && priceCache[cacheKey].expiry > now) {
    console.log('💰 [Chainlink] Cache hit for:', feedAddress.slice(0, 16));
    return priceCache[cacheKey].data;
  }
  
  try {
    console.log('💰 [Chainlink] Fetching price for:', feedAddress.slice(0, 16));
    
    const feed = new ethers.Contract(feedAddress, CHAINLINK_FEED_ABI, provider);
    
    // Busca dados e decimals em paralelo
    const [roundData, decimals] = await Promise.all([
      feed.latestRoundData(),
      feed.decimals(),
    ]);
    
    const [roundId, answer, , updatedAt] = roundData;
    
    // Converte para número com precisão correta
    const price = Number(answer) / Math.pow(10, decimals);
    
    const result: PriceData = {
      price,
      timestamp: Number(updatedAt) * 1000, // Unix timestamp em ms
      roundId,
      decimals,
    };
    
    // Atualiza cache
    priceCache[cacheKey] = {
      data: result,
      expiry: now + CACHE_DURATION,
    };
    
    console.log('💰 [Chainlink] Price fetched:', price.toFixed(2), 'USD');
    return result;
    
  } catch (error) {
    console.error('💰 [Chainlink] Error fetching price:', error);
    throw error;
  }
}

/**
 * Busca todos os preços necessários para arbitragem
 */
export async function getAllTokenPrices(
  provider: ethers.Provider
): Promise<{
  ETH: PriceData;
  USDC: PriceData;
  DAI: PriceData;
  WBTC: PriceData;
  LINK: PriceData;
}> {
  console.log('💰 [Chainlink] Fetching all token prices...');
  
  const feeds = ACTIVE_NETWORK.chainlinkPriceFeeds;
  
  try {
    const [ETH, USDC, DAI, WBTC, LINK] = await Promise.all([
      getChainlinkPrice(provider, feeds.ETHUSD),
      getChainlinkPrice(provider, feeds.USDCUSD),
      getChainlinkPrice(provider, feeds.DAIUSD),
      getChainlinkPrice(provider, feeds.WBTCUSD),
      getChainlinkPrice(provider, feeds.LINKUSD),
    ]);
    
    console.log('💰 [Chainlink] All prices fetched:', {
      ETH: ETH.price.toFixed(2),
      USDC: USDC.price.toFixed(4),
      DAI: DAI.price.toFixed(4),
      WBTC: WBTC.price.toFixed(2),
      LINK: LINK.price.toFixed(4),
    });
    
    return { ETH, USDC, DAI, WBTC, LINK };
    
  } catch (error) {
    console.error('💰 [Chainlink] Failed to fetch prices:', error);
    throw error;
  }
}

/**
 * Calcula valor em USD com precisão de centavos
 */
export function calculateUSDValue(
  tokenAmount: string,
  tokenDecimals: number,
  priceUSD: number
): string {
  const amount = Number(tokenAmount) / Math.pow(10, tokenDecimals);
  const usdValue = amount * priceUSD;
  return usdValue.toFixed(2); // Precisão de centavos
}

/**
 * Verifica se preços estão desatualizados (mais de 1 hora)
 */
export function isPriceStale(timestamp: number): boolean {
  const oneHour = 60 * 60 * 1000;
  return Date.now() - timestamp > oneHour;
}

/**
 * Formata preço para display
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

// Exporta endereços dos feeds para conveniência
export { CHAINLINK_FEED_ABI };
export type { PriceData };
