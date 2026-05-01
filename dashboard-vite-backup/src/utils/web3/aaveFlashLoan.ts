import { ethers } from 'ethers';

// Aave V3 Pool Address on Sepolia
const AAVE_POOL_ADDRESS = '0x6Ae43d3271d48b3863dD69F5Bd8e10fFf279f983';

// Aave V3 Pool ABI (simplified - only flashLoan function)
const AAVE_POOL_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'receiverAddress',
        type: 'address'
      },
      {
        internalType: 'address[]',
        name: 'assets',
        type: 'address[]'
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]'
      },
      {
        internalType: 'uint256[]',
        name: 'interestRateModes',
        type: 'uint256[]'
      },
      {
        internalType: 'address',
        name: 'onBehalfOf',
        type: 'address'
      },
      {
        internalType: 'bytes',
        name: 'params',
        type: 'bytes'
      },
      {
        internalType: 'uint16',
        name: 'referralCode',
        type: 'uint16'
      }
    ],
    name: 'flashLoan',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'asset',
        type: 'address'
      }
    ],
    name: 'getReserveData',
    outputs: [
      {
        components: [
          {
            components: [
              { internalType: 'uint256', name: 'data', type: 'uint256' }
            ],
            internalType: 'struct DataTypes.ReserveConfigurationMap',
            name: 'configuration',
            type: 'tuple'
          },
          { internalType: 'uint128', name: 'liquidityIndex', type: 'uint128' },
          { internalType: 'uint128', name: 'currentLiquidityRate', type: 'uint128' },
          { internalType: 'uint128', name: 'variableBorrowIndex', type: 'uint128' },
          { internalType: 'uint128', name: 'currentVariableBorrowRate', type: 'uint128' },
          { internalType: 'uint128', name: 'currentStableBorrowRate', type: 'uint128' },
          { internalType: 'uint40', name: 'lastUpdateTimestamp', type: 'uint40' },
          { internalType: 'uint16', name: 'id', type: 'uint16' },
          { internalType: 'address', name: 'aTokenAddress', type: 'address' },
          { internalType: 'address', name: 'stableDebtTokenAddress', type: 'address' },
          { internalType: 'address', name: 'variableDebtTokenAddress', type: 'address' },
          { internalType: 'address', name: 'interestRateStrategyAddress', type: 'address' },
          { internalType: 'uint128', name: 'accruedToTreasury', type: 'uint128' },
          { internalType: 'uint128', name: 'unbacked', type: 'uint128' },
          { internalType: 'uint128', name: 'isolationModeTotalDebt', type: 'uint128' }
        ],
        internalType: 'struct DataTypes.ReserveData',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

// Flash Loan Receiver Interface
const FLASH_LOAN_RECEIVER_ABI = [
  {
    inputs: [
      { internalType: 'address[]', name: 'assets', type: 'address[]' },
      { internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'premiums', type: 'uint256[]' },
      { internalType: 'address', name: 'initiator', type: 'address' },
      { internalType: 'bytes', name: 'params', type: 'bytes' }
    ],
    name: 'executeOperation',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

// Sepolia Token Addresses
const TOKENS = {
  WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
  USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357'
};

interface FlashLoanParams {
  asset: string;
  amount: string;
  buyDex: string;
  sellDex: string;
  minProfit: string;
}

interface GasEstimate {
  flashLoanGas: number;
  swapGas: number;
  totalGas: number;
  gasCostEth: string;
  gasCostUsd: number;
}

/**
 * Calculate flash loan premium (0.05% on Aave V3)
 */
export function calculateFlashLoanPremium(amount: string): string {
  const amountWei = ethers.parseEther(amount);
  const premium = (amountWei * 5n) / 10000n; // 0.05%
  return ethers.formatEther(premium);
}

/**
 * Estimate gas costs for flash loan arbitrage
 */
export async function estimateGasCosts(
  provider: ethers.Provider,
  params: FlashLoanParams
): Promise<GasEstimate> {
  console.log('⛽ [Aave] Estimating gas costs...');
  
  // Aproximate gas units for each operation
  const flashLoanGas = 250000; // Base flash loan
  const swapGas = 180000; // Per swap (2 needed: buy + sell)
  const totalGas = flashLoanGas + (swapGas * 2);
  
  // Get current gas price
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
  
  const totalGasWei = BigInt(totalGas) * gasPrice;
  const gasCostEth = ethers.formatEther(totalGasWei);
  
  // Approximate ETH price (would come from oracle in production)
  const ethPriceUsd = 3500;
  const gasCostUsd = parseFloat(gasCostEth) * ethPriceUsd;
  
  console.log('⛽ [Aave] Gas Estimate:', {
    flashLoanGas,
    swapGas: swapGas * 2,
    totalGas,
    gasCostEth: gasCostEth.slice(0, 8),
    gasCostUsd: gasCostUsd.toFixed(2)
  });
  
  return {
    flashLoanGas,
    swapGas: swapGas * 2,
    totalGas,
    gasCostEth,
    gasCostUsd
  };
}

/**
 * Check Aave pool liquidity for an asset
 */
export async function checkAaveLiquidity(
  provider: ethers.Provider,
  asset: string
): Promise<string> {
  console.log('💧 [Aave] Checking liquidity for:', asset);
  
  try {
    const pool = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, provider);
    const reserveData = await pool.getReserveData(asset);
    
    // aToken address contains the liquidity
    const aTokenAddress = reserveData.aTokenAddress;
    console.log('💧 [Aave] aToken:', aTokenAddress);
    
    // Check aToken total supply (represents liquidity)
    const aToken = new ethers.Contract(
      aTokenAddress,
      ['function totalSupply() view returns (uint256)'],
      provider
    );
    
    const liquidity = await aToken.totalSupply();
    const formatted = ethers.formatEther(liquidity);
    
    console.log('💧 [Aave] Available liquidity:', formatted);
    return formatted;
  } catch (error) {
    console.error('💧 [Aave] Error checking liquidity:', error);
    return '0';
  }
}

/**
 * Execute flash loan arbitrage
 */
export async function executeFlashLoanArbitrage(
  signer: ethers.Signer,
  params: FlashLoanParams
): Promise<{ txHash: string; success: boolean }> {
  console.log('⚡ [Aave] Executing flash loan arbitrage...');
  console.log('⚡ [Aave] Params:', params);
  
  try {
    const provider = signer.provider;
    if (!provider) {
      throw new Error('Signer must have provider');
    }
    
    // Get gas estimate first
    const gasEstimate = await estimateGasCosts(provider, params);
    console.log('⚡ [Aave] Gas cost USD:', gasEstimate.gasCostUsd.toFixed(2));
    
    // Encode arbitrage parameters
    const arbitrageParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint256'],
      [params.buyDex, params.sellDex, ethers.parseEther(params.minProfit)]
    );
    
    // Prepare flash loan parameters
    const assets = [params.asset];
    const amounts = [ethers.parseEther(params.amount)];
    const interestRateModes = [0n]; // 0 = no debt, flash loan
    const onBehalfOf = await signer.getAddress();
    const referralCode = 0;
    
    // Note: In production, you would deploy a FlashLoanReceiver contract
    // that implements executeOperation() and handles the DEX swaps
    // For now, we'll simulate the call
    console.log('⚡ [Aave] Flash loan parameters:', {
      asset: params.asset,
      amount: params.amount,
      buyDex: params.buyDex,
      sellDex: params.sellDex,
      encodedParams: arbitrageParams.slice(0, 50) + '...'
    });
    
    // This would be the actual call:
    // const pool = new ethers.Contract(AAVE_POOL_ADDRESS, AAVE_POOL_ABI, signer);
    // const tx = await pool.flashLoan(
    //   receiverAddress,
    //   assets,
    //   amounts,
    //   interestRateModes,
    //   onBehalfOf,
    //   arbitrageParams,
    //   referralCode
    // );
    
    // For demo, return mock success
    return {
      txHash: '0x' + '0'.repeat(64),
      success: true
    };
    
  } catch (error: any) {
    console.error('⚡ [Aave] Flash loan error:', error);
    throw new Error(`Flash loan execution failed: ${error.message}`);
  }
}

/**
 * Validate if arbitrage is profitable after all costs
 */
export function validateArbitrageProfitability(
  grossProfitUsd: number,
  gasCostUsd: number,
  flashLoanAmount: string,
  flashLoanFeePercent: number = 0.05
): {
  isProfitable: boolean;
  netProfitUsd: number;
  flashLoanFeeUsd: number;
  totalCostsUsd: number;
  profitPercent: number;
} {
  const flashLoanAmountNum = parseFloat(flashLoanAmount);
  const flashLoanFeeUsd = (flashLoanAmountNum * flashLoanFeePercent) / 100;
  
  const totalCostsUsd = gasCostUsd + flashLoanFeeUsd;
  const netProfitUsd = grossProfitUsd - totalCostsUsd;
  const isProfitable = netProfitUsd > 0;
  
  const profitPercent = (netProfitUsd / flashLoanAmountNum) * 100;
  
  console.log('📊 [Aave] Profitability Analysis:');
  console.log('  Gross Profit:', grossProfitUsd.toFixed(2), 'USD');
  console.log('  Flash Loan Fee:', flashLoanFeeUsd.toFixed(2), 'USD');
  console.log('  Gas Cost:', gasCostUsd.toFixed(2), 'USD');
  console.log('  Net Profit:', netProfitUsd.toFixed(2), 'USD');
  console.log('  Is Profitable:', isProfitable);
  
  return {
    isProfitable,
    netProfitUsd,
    flashLoanFeeUsd,
    totalCostsUsd,
    profitPercent
  };
}

// Export constants
export { AAVE_POOL_ADDRESS, AAVE_POOL_ABI, TOKENS };
export type { FlashLoanParams, GasEstimate };
