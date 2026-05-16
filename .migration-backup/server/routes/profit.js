/**
 * 🌑 GXEON SOVEREIGN — Profit Claim & Withdrawal Routes
 * Financial Flow Activation for 0x3955d559055DadB7067054cB6E6f974710345224
 */

const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();

// 🏦 SOVEREIGN WALLET CONFIGURATION
const SOVEREIGN_CONFIG = {
  ownerAddress: '0x3955d559055DadB7067054cB6E6f974710345224',
  network: 'Arbitrum One',
  chainId: 42161,
  preferredToken: 'USDC',
  usdcAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Arbitrum USDC
  minProfitMultiplier: 5, // Only execute if profit > 5x gas fee
  vaultSharePercent: 70,
  commanderSharePercent: 30
};

// Provider real para Arbitrum Mainnet
const getProvider = () => {
  const rpcUrl = process.env.ARBITRUM_RPC_URL;
  if (!rpcUrl) {
    throw new Error('ARBITRUM_RPC_URL não configurada. Configure no Railway Dashboard.');
  }
  return new ethers.JsonRpcProvider(rpcUrl);
};

// Wallet com permissão de execução
const getExecutorWallet = () => {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY não configurada. Configure no Railway Dashboard.');
  }
  const provider = getProvider();
  return new ethers.Wallet(privateKey, provider);
};

// ABI mínimo para interações ERC20 e Vault
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

const VAULT_ABI = [
  'function getBalance() view returns (uint256)',
  'function getAvailableProfit() view returns (uint256)',
  'function claimProfit(uint256 amount)',
  'function getClaimHistory() view returns (tuple(uint256 amount, uint256 timestamp, bytes32 txHash)[])'
];

/**
 * 📊 GET /api/v1/profit/status
 * Returns current profit status and claim availability
 */
router.get('/status', async (req, res) => {
  try {
    const provider = getProvider();
    const vaultAddress = process.env.VAULT_ADDRESS || process.env.GXEON_TREASURY_ADDRESS;

    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        error: 'VAULT_ADDRESS não configurada',
        message: 'Configure VAULT_ADDRESS ou GXEON_TREASURY_ADDRESS no Railway Dashboard'
      });
    }

    // Verificar saldo USDC do vault
    const usdcContract = new ethers.Contract(SOVEREIGN_CONFIG.usdcAddress, ERC20_ABI, provider);
    const vaultBalanceRaw = await usdcContract.balanceOf(vaultAddress);
    const decimals = await usdcContract.decimals();
    const vaultBalance = Number(ethers.formatUnits(vaultBalanceRaw, decimals));

    // Calcular profit disponível (30% para commander)
    const availableProfit = vaultBalance * (SOVEREIGN_CONFIG.commanderSharePercent / 100);

    // Estimar gas para claim
    const gasPrice = await provider.getFeeData();
    const gasEstimate = gasPrice.maxFeePerGas
      ? Number(ethers.formatEther(gasPrice.maxFeePerGas * 100000n)) // ~100k gas
      : 0.0001;

    const profitToGasRatio = gasEstimate > 0 ? availableProfit / gasEstimate : 0;
    const canClaim = availableProfit > gasEstimate * SOVEREIGN_CONFIG.minProfitMultiplier;

    const status = {
      vaultBalance,
      availableProfit,
      totalRevenue: vaultBalance, // Simplificado - pode ser expandido com histórico
      gasEstimate,
      canClaim,
      gasOptimized: canClaim,
      profitToGasRatio: Math.floor(profitToGasRatio),
      lastClaim: null, // TODO: Implementar histórico no Supabase
      ownerAddress: SOVEREIGN_CONFIG.ownerAddress,
      network: SOVEREIGN_CONFIG.network,
      token: SOVEREIGN_CONFIG.preferredToken,
      vaultAddress
    };

    res.json({ success: true, status });
  } catch (error) {
    console.error('[Profit] Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

/**
 * 💰 POST /api/v1/profit/claim
 * Execute profit withdrawal to owner address
 */
router.post('/claim', async (req, res) => {
  try {
    const { amount = 0 } = req.body; // 0 = claim all

    const vaultAddress = process.env.VAULT_ADDRESS || process.env.GXEON_TREASURY_ADDRESS;
    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        error: 'VAULT_ADDRESS não configurada'
      });
    }

    // Verificar se há profit suficiente
    const provider = getProvider();
    const usdcContract = new ethers.Contract(SOVEREIGN_CONFIG.usdcAddress, ERC20_ABI, provider);
    const vaultBalanceRaw = await usdcContract.balanceOf(vaultAddress);
    const decimals = await usdcContract.decimals();
    const vaultBalance = Number(ethers.formatUnits(vaultBalanceRaw, decimals));
    const availableProfit = vaultBalance * (SOVEREIGN_CONFIG.commanderSharePercent / 100);

    const gasPrice = await provider.getFeeData();
    const gasEstimate = gasPrice.maxFeePerGas
      ? Number(ethers.formatEther(gasPrice.maxFeePerGas * 100000n))
      : 0.0001;

    if (availableProfit < gasEstimate * SOVEREIGN_CONFIG.minProfitMultiplier) {
      return res.status(400).json({
        success: false,
        error: 'Profit below gas threshold',
        availableProfit,
        gasEstimate,
        minRequired: gasEstimate * SOVEREIGN_CONFIG.minProfitMultiplier
      });
    }

    // Executar claim real
    const wallet = getExecutorWallet();
    const vaultContract = new ethers.Contract(vaultAddress, VAULT_ABI, wallet);

    const claimAmount = amount > 0
      ? ethers.parseUnits(amount.toString(), decimals)
      : ethers.parseUnits(availableProfit.toFixed(6), decimals);

    console.log('[💰 SOVEREIGN] Executando claim:', {
      amount: ethers.formatUnits(claimAmount, decimals),
      vault: vaultAddress
    });

    const tx = await vaultContract.claimProfit(claimAmount);
    const receipt = await tx.wait();

    const claimResult = {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: ethers.formatEther(receipt.gasUsed * receipt.gasPrice),
      amount: Number(ethers.formatUnits(claimAmount, decimals)),
      token: SOVEREIGN_CONFIG.preferredToken,
      to: SOVEREIGN_CONFIG.ownerAddress,
      network: SOVEREIGN_CONFIG.network,
      timestamp: new Date().toISOString()
    };

    console.log('[💰 SOVEREIGN] Profit claimed:', claimResult);

    res.json({
      success: true,
      message: '🌑 Profit claimed successfully on Arbitrum!',
      claim: claimResult
    });
  } catch (error) {
    console.error('[Profit] Claim error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'CLAIM_FAILED'
    });
  }
});

/**
 * 📈 GET /api/v1/profit/history
 * Returns claim history
 */
router.get('/history', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: history, error } = await supabase
      .from('profit_claims')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      history: history || [],
      count: history?.length || 0
    });
  } catch (error) {
    console.error('[Profit] History error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      history: [] // Retorna array vazio em caso de erro
    });
  }
});

/**
 * 🔮 POST /api/v1/profit/estimate
 * Estimate gas and net profit before claiming
 */
router.post('/estimate', async (req, res) => {
  try {
    const provider = getProvider();
    const vaultAddress = process.env.VAULT_ADDRESS || process.env.GXEON_TREASURY_ADDRESS;

    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        error: 'VAULT_ADDRESS não configurada'
      });
    }

    const usdcContract = new ethers.Contract(SOVEREIGN_CONFIG.usdcAddress, ERC20_ABI, provider);
    const vaultBalanceRaw = await usdcContract.balanceOf(vaultAddress);
    const decimals = await usdcContract.decimals();
    const vaultBalance = Number(ethers.formatUnits(vaultBalanceRaw, decimals));
    const availableProfit = vaultBalance * (SOVEREIGN_CONFIG.commanderSharePercent / 100);

    const feeData = await provider.getFeeData();
    const gasUnits = 100000n;
    const gasCostWei = (feeData.maxFeePerGas || feeData.gasPrice || 0n) * gasUnits;
    const gasEstimate = Number(ethers.formatEther(gasCostWei));

    // Preço ETH aproximado para calcular gas em USD (simplificado)
    const ethPrice = 2500; // TODO: Implementar feed de preço real
    const gasInUsd = gasEstimate * ethPrice;
    const minRequiredProfit = gasEstimate * SOVEREIGN_CONFIG.minProfitMultiplier;
    const canExecute = availableProfit > minRequiredProfit;
    const netProfit = availableProfit - gasInUsd;
    const profitToGasRatio = gasEstimate > 0 ? availableProfit / gasEstimate : 0;

    const estimate = {
      availableProfit,
      gasEstimate,
      gasInUsd,
      minRequiredProfit,
      canExecute,
      netProfit,
      profitToGasRatio: Math.floor(profitToGasRatio),
      recommendation: canExecute
        ? `✅ Safe to claim - Profit is ${Math.floor(profitToGasRatio)}x gas cost`
        : `❌ Wait - Profit only ${Math.floor(profitToGasRatio)}x gas cost (need ${SOVEREIGN_CONFIG.minProfitMultiplier}x)`
    };

    res.json({ success: true, estimate });
  } catch (error) {
    console.error('[Profit] Estimate error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code || 'ESTIMATE_FAILED'
    });
  }
});

module.exports = router;
