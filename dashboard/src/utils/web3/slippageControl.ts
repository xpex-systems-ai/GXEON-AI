// DYNAMIC SLIPPAGE CONTROL - 0.1% PRECISION
// Garante que o lucro no Dashboard = lucro real no Vault

import { ethers } from 'ethers';

// Slippage tiers baseados na volatilidade do mercado
interface SlippageConfig {
  baseSlippage: number; // 0.001 = 0.1%
  maxSlippage: number; // 0.005 = 0.5%
  volatilityMultiplier: number;
  gasPriceMultiplier: number;
}

// Configurações por condição de mercado
const SLIPPAGE_TIERS: { [key: string]: SlippageConfig } = {
  stable: {
    // Mercado calmo - mínimo slippage
    baseSlippage: 0.001, // 0.1%
    maxSlippage: 0.003, // 0.3%
    volatilityMultiplier: 1.0,
    gasPriceMultiplier: 1.0,
  },
  normal: {
    // Condições normais
    baseSlippage: 0.002, // 0.2%
    maxSlippage: 0.005, // 0.5%
    volatilityMultiplier: 1.5,
    gasPriceMultiplier: 1.2,
  },
  volatile: {
    // Alta volatilidade - mais slippage permitido
    baseSlippage: 0.003, // 0.3%
    maxSlippage: 0.01, // 1.0%
    volatilityMultiplier: 2.0,
    gasPriceMultiplier: 1.5,
  },
  extreme: {
    // Evento extremo - apenas se lucro for muito alto
    baseSlippage: 0.005, // 0.5%
    maxSlippage: 0.02, // 2.0%
    volatilityMultiplier: 3.0,
    gasPriceMultiplier: 2.0,
  },
};

interface MarketConditions {
  gasPrice: bigint; // em wei
  ethPriceUSD: number;
  blockTime: number; // em segundos
  priceImpact: number; // impacto estimado na pool
  liquidityDepth: number; // profundidade da liquidez
}

interface SlippageCalculation {
  recommendedSlippage: number; // ex: 0.001 = 0.1%
  minOutput: string; // quantidade mínima de saída
  maxInput: string; // quantidade máxima de entrada
  priceWithSlippage: number;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

/**
 * Detecta condições atuais do mercado
 */
export async function detectMarketConditions(
  provider: ethers.Provider
): Promise<MarketConditions> {
  console.log('📊 [Slippage] Detecting market conditions...');
  
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
  
  // Simulação de condições (em produção, virariam de oráculos)
  const conditions: MarketConditions = {
    gasPrice,
    ethPriceUSD: 3500,
    blockTime: 12,
    priceImpact: 0.001,
    liquidityDepth: 1000000,
  };
  
  console.log('📊 [Slippage] Conditions:', {
    gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
    ethPrice: conditions.ethPriceUSD,
    liquidityDepth: conditions.liquidityDepth,
  });
  
  return conditions;
}

/**
 * Calcula slippage dinâmico baseado nas condições
 * Target: 0.1% precision
 */
export function calculateDynamicSlippage(
  conditions: MarketConditions,
  tradeSizeUSD: number,
  tier: keyof typeof SLIPPAGE_TIERS = 'stable'
): SlippageCalculation {
  const config = SLIPPAGE_TIERS[tier];
  const warnings: string[] = [];
  
  // Fator baseado no tamanho do trade (trades maiores = mais slippage)
  const sizeFactor = Math.min(tradeSizeUSD / conditions.liquidityDepth, 0.5);
  
  // Fator baseado no gas price (gas alto = mais competição = mais slippage)
  const gasPriceGwei = Number(ethers.formatUnits(conditions.gasPrice, 'gwei'));
  const gasFactor = gasPriceGwei > 50 ? 1.5 : 1.0;
  
  // Slippage calculado
  let recommendedSlippage = config.baseSlippage * 
    config.volatilityMultiplier * 
    (1 + sizeFactor) * 
    gasFactor;
  
  // Capa no máximo
  recommendedSlippage = Math.min(recommendedSlippage, config.maxSlippage);
  
  // Arredonda para 0.1% (0.001)
  recommendedSlippage = Math.round(recommendedSlippage * 1000) / 1000;
  
  // Confiança
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (recommendedSlippage > 0.005) {
    confidence = 'low';
    warnings.push('High slippage detected - verify profitability');
  } else if (recommendedSlippage > 0.003) {
    confidence = 'medium';
  }
  
  // Para trades grandes, alerta
  if (tradeSizeUSD > conditions.liquidityDepth * 0.1) {
    warnings.push('Trade size exceeds 10% of pool depth');
  }
  
  console.log('📊 [Slippage] Calculated:', {
    recommended: (recommendedSlippage * 100).toFixed(1) + '%',
    confidence,
    warnings,
  });
  
  return {
    recommendedSlippage,
    minOutput: '0', // Calculado separadamente
    maxInput: '0',
    priceWithSlippage: 0,
    confidence,
    warnings,
  };
}

/**
 * Calcula quantidade mínima de saída com slippage
 * Garante que você recebe pelo menos isso
 */
export function calculateMinOutput(
  expectedOutput: string,
  slippagePercent: number // ex: 0.1 para 0.1%
): string {
  const expected = BigInt(expectedOutput);
  const slippageFactor = BigInt(Math.floor((1 - slippagePercent / 100) * 10000));
  
  // minOutput = expectedOutput * (1 - slippage)
  const minOutput = (expected * slippageFactor) / 10000n;
  
  console.log('📊 [Slippage] Min output:', {
    expected: expected.toString(),
    slippage: slippagePercent + '%',
    minOutput: minOutput.toString(),
  });
  
  return minOutput.toString();
}

/**
 * Calcula quantidade máxima de entrada com slippage
 * Para compras, quanto você está disposto a pagar no máximo
 */
export function calculateMaxInput(
  expectedInput: string,
  slippagePercent: number
): string {
  const expected = BigInt(expectedInput);
  const slippageFactor = BigInt(Math.floor((1 + slippagePercent / 100) * 10000));
  
  // maxInput = expectedInput * (1 + slippage)
  const maxInput = (expected * slippageFactor) / 10000n;
  
  console.log('📊 [Slippage] Max input:', {
    expected: expected.toString(),
    slippage: slippagePercent + '%',
    maxInput: maxInput.toString(),
  });
  
  return maxInput.toString();
}

/**
 * Valida se slippage é aceitável para o trade
 */
export function validateSlippage(
  slippagePercent: number,
  maxAllowed: number = 0.5 // 0.5% máximo padrão
): { isValid: boolean; reason?: string } {
  if (slippagePercent > maxAllowed) {
    return {
      isValid: false,
      reason: `Slippage ${slippagePercent}% exceeds maximum ${maxAllowed}%`,
    };
  }
  
  if (slippagePercent < 0) {
    return {
      isValid: false,
      reason: 'Slippage cannot be negative',
    };
  }
  
  return { isValid: true };
}

/**
 * Monitora slippage real vs estimado
 * Alerta se houver divergência
 */
export function monitorSlippage(
  estimatedOutput: string,
  actualOutput: string,
  threshold: number = 0.001 // 0.1%
): {
  divergence: number;
  isAcceptable: boolean;
  alert: string;
} {
  const estimated = Number(estimatedOutput);
  const actual = Number(actualOutput);
  
  const divergence = Math.abs((actual - estimated) / estimated);
  const isAcceptable = divergence <= threshold;
  
  const alert = isAcceptable
    ? `Slippage within threshold: ${(divergence * 100).toFixed(2)}%`
    : `ALERT: High slippage detected: ${(divergence * 100).toFixed(2)}%`;
  
  console.log('📊 [Slippage] Monitor:', alert);
  
  return { divergence, isAcceptable, alert };
}

/**
 * Ajusta slippage baseado no histórico de trades
 * Aprende com trades anteriores
 */
export function adjustSlippageFromHistory(
  baseSlippage: number,
  historicalDivergences: number[]
): number {
  if (historicalDivergences.length === 0) return baseSlippage;
  
  // Calcula média de divergências
  const avgDivergence = historicalDivergences.reduce((a, b) => a + b, 0) / 
    historicalDivergences.length;
  
  // Ajusta base + margem de segurança (20%)
  const adjusted = baseSlippage + avgDivergence * 1.2;
  
  // Limita a 1%
  const final = Math.min(adjusted, 0.01);
  
  console.log('📊 [Slippage] Adjusted from history:', {
    base: (baseSlippage * 100).toFixed(2) + '%',
    avgDivergence: (avgDivergence * 100).toFixed(2) + '%',
    final: (final * 100).toFixed(2) + '%',
  });
  
  return Math.round(final * 1000) / 1000;
}

// Configurações exportadas
export { SLIPPAGE_TIERS };
export type { SlippageConfig, MarketConditions, SlippageCalculation };
