import { ethers } from 'ethers';
import { DEX_ADDRESSES, TOKEN_ADDRESSES } from '../../config/contract';
import { estimateGasCosts, calculateFlashLoanPremium, validateArbitrageProfitability, type GasEstimate } from './aaveFlashLoan';

console.log(' [priceScanner] Module loading...');

// EMERGENCY FALLBACK - Hardcoded for production reliability
const EMERGENCY_RPC_URL = 'https://rpc.gelato.network/v2/sep/rpc/ded794a60b3b486891820911c7f04c12';

// Try env vars first, fallback to hardcoded
const GELATO_RPC_URL = (import.meta as any).env?.VITE_GELATO_RPC_URL 
  || (import.meta as any).env?.NEXT_PUBLIC_GELATO_RPC_URL 
  || (import.meta as any).env?.VITE_ALCHEMY_RPC_URL
  || EMERGENCY_RPC_URL; // FORCE FALLBACK

console.log('🔧 [priceScanner] ENV check:', {
  VITE_GELATO_RPC_URL: !!(import.meta as any).env?.VITE_GELATO_RPC_URL,
  NEXT_PUBLIC_GELATO_RPC_URL: !!(import.meta as any).env?.NEXT_PUBLIC_GELATO_RPC_URL,
  VITE_ALCHEMY_RPC_URL: !!(import.meta as any).env?.VITE_ALCHEMY_RPC_URL,
  FINAL_URL: GELATO_RPC_URL ? 'SET' : 'NOT SET'
});

console.warn('⚠️ [priceScanner] RPC URL ATIVA:', GELATO_RPC_URL?.substring(0, 50) + '...');

// DEX Router Addresses (Sepolia Testnet)
export const DEX_ADDRESSES = {
  uniswap_v2: '0xC532a74256D3ad42D7ed734e1e3458661846A3b2',
  sushiswap_v2: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
};

// Token Addresses (Sepolia Testnet)
const TOKEN_ADDRESSES = {
  WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

// Uniswap V2 Router ABI (simplified for getAmountsOut)
const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)',
  'function factory() external view returns (address)',
];

// Factory ABI to get pair
const FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
];

// Pair ABI for reserves
const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

export interface PriceData {
  dexName: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  price: number; // Price as tokenOut per tokenIn
  timestamp: number;
}

export interface ArbitrageOpportunity {
  pair: string;
  buyDex: string;
  sellDex: string;
  priceBuy: number;
  priceSell: number;
  spread: number; // Percentage difference
  profitPercent: number;
  estimatedGas: number;
  netProfit: number;
  timestamp: number;
}

let provider: ethers.JsonRpcProvider | null = null;

export function initializeProvider(): ethers.JsonRpcProvider {
  console.log('🔌 [priceScanner] initializeProvider called');
  
  // HARDCODED FALLBACK - DNA DO SISTEMA
  const FALLBACK_RPC = 'https://rpc.gelato.network/v2/sep/rpc/ded794a60b3b486891820911c7f04c12';
  const rpcUrl = GELATO_RPC_URL || FALLBACK_RPC;
  console.log('🔌 [priceScanner] Using RPC:', rpcUrl.substring(0, 50) + '...');
  console.log('🔌 [priceScanner] Source:', rpcUrl === FALLBACK_RPC ? 'HARDCODED' : 'ENV');
  
  if (!provider) {
    console.log('🔌 [priceScanner] Creating new JsonRpcProvider...');
    provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log('✅ [priceScanner] Provider created');
  } else {
    console.log('♻️ [priceScanner] Reusing existing provider');
  }
  
  return provider;
}

/**
 * Get token price from a specific DEX using getAmountsOut
 */
export async function getTokenPrice(
  dexAddress: string,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint = ethers.parseEther('1')
): Promise<PriceData> {
  console.log(`💰 [priceScanner] getTokenPrice called:`, {
    dex: getDexName(dexAddress),
    tokenIn: tokenIn === TOKEN_ADDRESSES.WETH ? 'WETH' : 'USDC',
    tokenOut: tokenOut === TOKEN_ADDRESSES.WETH ? 'WETH' : 'USDC',
  });
  
  const provider = initializeProvider();
  const router = new ethers.Contract(dexAddress, ROUTER_ABI, provider);
  
  try {
    console.log(`⏳ [priceScanner] Calling getAmountsOut...`);
    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    const amountOut = amounts[1];
    console.log(`✅ [priceScanner] Got amounts:`, amounts.toString());
    
    // Calculate price (tokenOut per 1 tokenIn)
    const decimalsIn = tokenIn === TOKEN_ADDRESSES.USDC ? 6 : 18;
    const decimalsOut = tokenOut === TOKEN_ADDRESSES.USDC ? 6 : 18;
    
    const normalizedIn = Number(ethers.formatUnits(amountIn, decimalsIn));
    const normalizedOut = Number(ethers.formatUnits(amountOut, decimalsOut));
    const price = normalizedOut / normalizedIn;
    
    console.log(`💰 [priceScanner] Price calculated: $${price.toFixed(2)}`);
    
    return {
      dexName: getDexName(dexAddress),
      tokenIn: tokenIn === TOKEN_ADDRESSES.WETH ? 'WETH' : 'USDC',
      tokenOut: tokenOut === TOKEN_ADDRESSES.WETH ? 'WETH' : 'USDC',
      amountIn: ethers.formatUnits(amountIn, decimalsIn),
      amountOut: ethers.formatUnits(amountOut, decimalsOut),
      price,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`❌ [priceScanner] Failed to get price from ${dexAddress}:`, error);
    throw error;
  }
}

/**
 * Get WETH/USDC prices from both DEXes
 */
export async function getWethUsdcPrices(): Promise<{
  uniswap: PriceData;
  sushiswap: PriceData;
}> {
  console.log('🔍 [priceScanner] getWethUsdcPrices called - fetching prices from DEXes...');
  
  const amountIn = ethers.parseEther('1'); // 1 WETH
  console.log(`📊 [priceScanner] Amount in: ${ethers.formatEther(amountIn)} WETH`);
  
  try {
    const [uniswapPrice, sushiswapPrice] = await Promise.all([
      getTokenPrice(DEX_ADDRESSES.uniswap_v2, TOKEN_ADDRESSES.WETH, TOKEN_ADDRESSES.USDC, amountIn),
      getTokenPrice(DEX_ADDRESSES.sushiswap_v2, TOKEN_ADDRESSES.WETH, TOKEN_ADDRESSES.USDC, amountIn),
    ]);
    
    console.log('✅ [priceScanner] Prices fetched successfully:', {
      uniswap: `$${uniswapPrice.price.toFixed(2)}`,
      sushiswap: `$${sushiswapPrice.price.toFixed(2)}`,
    });
    
    return {
      uniswap: uniswapPrice,
      sushiswap: sushiswapPrice,
    };
  } catch (error) {
    console.error('❌ [priceScanner] Error fetching prices:', error);
    throw error;
  }
}

/**
 * Calculate arbitrage opportunity between two DEXes
 */
export async function calculateArbitrageOpportunity(
  prices: { uniswap: PriceData; sushiswap: PriceData }
): Promise<ArbitrageOpportunity | null> {
  console.log('🔄 [priceScanner] Calculating arbitrage opportunity...');
  const { uniswap, sushiswap } = prices;
  
  // Determine which DEX has lower price (buy) and higher price (sell)
  let buyDex: PriceData;
  let sellDex: PriceData;
  
  if (uniswap.price < sushiswap.price) {
    buyDex = uniswap;
    sellDex = sushiswap;
    console.log(`📉 [priceScanner] Uniswap cheaper (${uniswap.price.toFixed(2)}) vs SushiSwap (${sushiswap.price.toFixed(2)})`);
  } else {
    buyDex = sushiswap;
    sellDex = uniswap;
    console.log(`📉 [priceScanner] SushiSwap cheaper (${sushiswap.price.toFixed(2)}) vs Uniswap (${uniswap.price.toFixed(2)})`);
  }
  
  // Calculate spread percentage
  const spread = ((sellDex.price - buyDex.price) / buyDex.price) * 100;
  console.log(`📊 [priceScanner] Spread: ${spread.toFixed(3)}%`);
  
  // Estimate gas costs (approximate for Sepolia)
  const estimatedGasUnits = 250000;
  const gasPriceGwei = 20;
  const ethPrice = (uniswap.price + sushiswap.price) / 2;
  
  const gasCostEth = (estimatedGasUnits * gasPriceGwei) / 1e9;
  const gasCostUsdc = gasCostEth * ethPrice;
  
  // Calculate potential profit on 1 WETH trade
  const tradeAmount = 1;
  const grossProfit = (sellDex.price - buyDex.price) * tradeAmount;
  const netProfit = grossProfit - gasCostUsdc;
  const profitPercent = (netProfit / (buyDex.price * tradeAmount)) * 100;
  
  console.log(`💵 [priceScanner] Net profit: $${netProfit.toFixed(2)} (${profitPercent.toFixed(2)}%)`);
  
  return {
    pair: 'WETH/USDC',
    buyDex: buyDex.dexName,
    sellDex: sellDex.dexName,
    priceBuy: buyDex.price,
    priceSell: sellDex.price,
    spread,
    profitPercent,
    estimatedGas: gasCostUsdc,
    netProfit,
    timestamp: Date.now(),
  };
}

/**
 * Scan for arbitrage opportunities
 */
export async function scanArbitrage(): Promise<ArbitrageOpportunity | null> {
  console.log('🚀 [priceScanner] scanArbitrage started');
  try {
    const prices = await getWethUsdcPrices();
    const opportunity = await calculateArbitrageOpportunity(prices);
    console.log('✅ [priceScanner] Arbitrage scan complete:', opportunity ? 'Opportunity found' : 'No opportunity');
    return opportunity;
  } catch (error) {
    console.error('❌ [priceScanner] Arbitrage scan failed:', error);
    return null;
  }
}

function getDexName(address: string): string {
  if (address.toLowerCase() === DEX_ADDRESSES.uniswap_v2.toLowerCase()) {
    return 'Uniswap V2';
  }
  if (address.toLowerCase() === DEX_ADDRESSES.sushiswap_v2.toLowerCase()) {
    return 'SushiSwap V2';
  }
  return 'Unknown DEX';
}

export function getProvider(): ethers.JsonRpcProvider {
  return initializeProvider();
}

export { TOKEN_ADDRESSES };
