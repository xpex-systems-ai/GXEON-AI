// MAINNET NETWORK CONFIGURATIONS - REAL MONEY BRIDGE
// Arbitrum One & Polygon PoS - Low Gas Fee Networks

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrls: {
    public: string;
    flashbots?: string; // MEV Protection RPC
    quicknode?: string; // Premium RPC
  };
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorer: string;
  gasSettings: {
    maxFeePerGas: string; // In gwei
    maxPriorityFeePerGas: string; // In gwei
    gasLimitMultiplier: number;
  };
  aavePool: string;
  dexRouters: {
    uniswapV3: string;
    uniswapV2: string;
    sushiswap: string;
    curve?: string;
  };
  chainlinkPriceFeeds: {
    ETHUSD: string;
    USDCUSD: string;
    DAIUSD: string;
    WBTCUSD: string;
    LINKUSD: string;
  };
  tokens: {
    WETH: string;
    USDC: string;
    USDT: string;
    DAI: string;
    WBTC: string;
    AAVE: string;
    LINK: string;
  };
  flashLoanReceiver: string; // Deployed contract for flash loans
  gxeonVault: string; // Your vault contract
  minProfitThreshold: string; // Minimum profit in USD to execute
}

// ARBITRUM ONE - Primary Network (Ultra Low Gas: $0.50-2.00)
export const ARBITRUM_ONE: NetworkConfig = {
  chainId: 42161,
  name: 'Arbitrum One',
  rpcUrls: {
    public: 'https://arb1.arbitrum.io/rpc',
    flashbots: 'https://rpc.flashbots.net?hints=calldata', // MEV Protection
    quicknode: 'https://alpha-thrilling-needle.arbitrum-mainnet.quiknode.pro/', // Replace with your QuickNode
  },
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorer: 'https://arbiscan.io',
  gasSettings: {
    maxFeePerGas: '0.1', // 0.1 gwei - Arbitrum is cheap!
    maxPriorityFeePerGas: '0.01',
    gasLimitMultiplier: 1.2, // 20% buffer
  },
  aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Pool
  dexRouters: {
    uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    uniswapV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    curve: '0x445FE580eF8d70FF569aB36e80F81Ff6129d5606',
  },
  chainlinkPriceFeeds: {
    ETHUSD: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
    USDCUSD: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
    DAIUSD: '0xc5C8E77B397E531B8EC06BFb0048328B30E9eCf8',
    WBTCUSD: '0x6ce185860a184310952c9e595f859cd19493812f',
    LINKUSD: '0x86E53CF1B870786351Da77A57575e79CB55812CB',
  },
  tokens: {
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    AAVE: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
  },
  flashLoanReceiver: '0x0000000000000000000000000000000000000000', // DEPLOY YOUR CONTRACT
  gxeonVault: '0x0000000000000000000000000000000000000000', // DEPLOY YOUR VAULT
  minProfitThreshold: '10.00', // Minimum $10 profit to execute
};

// POLYGON POS - Backup Network (Low Gas: $0.01-0.10)
export const POLYGON_POS: NetworkConfig = {
  chainId: 137,
  name: 'Polygon (PoS)',
  rpcUrls: {
    public: 'https://polygon-rpc.com',
    flashbots: 'https://rpc.flashbots.net?hints=calldata', // MEV Protection
    quicknode: 'https://polygon-mainnet.g.alchemy.com/v2/', // Replace with Alchemy key
  },
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  blockExplorer: 'https://polygonscan.com',
  gasSettings: {
    maxFeePerGas: '50', // 50 gwei - Polygon is very cheap
    maxPriorityFeePerGas: '30',
    gasLimitMultiplier: 1.3, // 30% buffer for Polygon
  },
  aavePool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Aave V3 Pool
  dexRouters: {
    uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    uniswapV2: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    curve: '0x445FE580eF8d70FF569aB36e80F81Ff6129d5606',
  },
  chainlinkPriceFeeds: {
    ETHUSD: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    USDCUSD: '0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7',
    DAIUSD: '0x4746DeC9e833A82EC7C2C1356374CcFbc5bE5bd1',
    WBTCUSD: '0xC907E9EecF74e5D15fd8B703F4a38D1776dEcD75',
    LINKUSD: '0xd9FFdb71EbE7496Cc440152d43986aaEABAC7952',
  },
  tokens: {
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    AAVE: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
    LINK: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
  },
  flashLoanReceiver: '0x0000000000000000000000000000000000000000', // DEPLOY YOUR CONTRACT
  gxeonVault: '0x0000000000000000000000000000000000000000', // DEPLOY YOUR VAULT
  minProfitThreshold: '5.00', // Minimum $5 profit (lower for Polygon)
};

// SEPOLIA - Testnet (Keep for testing)
export const SEPOLIA: NetworkConfig = {
  chainId: 11155111,
  name: 'Sepolia Testnet',
  rpcUrls: {
    public: 'https://rpc.sepolia.org',
  },
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
  blockExplorer: 'https://sepolia.etherscan.io',
  gasSettings: {
    maxFeePerGas: '20',
    maxPriorityFeePerGas: '2',
    gasLimitMultiplier: 1.5,
  },
  aavePool: '0x6Ae43d3271d48b3863dD69F5Bd8e10fFf279f983',
  dexRouters: {
    uniswapV3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    uniswapV2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  },
  chainlinkPriceFeeds: {
    ETHUSD: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    USDCUSD: '0xA2F78ab2355fe2f984D808B5Ce00f3A93825843C',
    DAIUSD: '0x14866185B1962B63C3DbA8c2B61983C9A7616f5D',
    WBTCUSD: '0x1b44F3514812fcd5B1f7546a8E8E9c28e37e1233',
    LINKUSD: '0xc59E3633BAAC79493d908e63626716D20405231C',
  },
  tokens: {
    WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
    USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
    DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371B8a357',
    WBTC: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    AAVE: '0x88541670E6D74741f13D7c6946cf4a63b6C1D85E',
    LINK: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
  },
  flashLoanReceiver: '0x0000000000000000000000000000000000000000',
  gxeonVault: '0x0000000000000000000000000000000000000000',
  minProfitThreshold: '0.10', // 10 cents for testing
};

// Active Network Selector
export const ACTIVE_NETWORK = ARBITRUM_ONE; // Change this to switch networks
// export const ACTIVE_NETWORK = POLYGON_POS;
// export const ACTIVE_NETWORK = SEPOLIA;

// Multi-network support
export const SUPPORTED_NETWORKS = [ARBITRUM_ONE, POLYGON_POS, SEPOLIA];

export function getNetworkByChainId(chainId: number): NetworkConfig | undefined {
  return SUPPORTED_NETWORKS.find(n => n.chainId === chainId);
}

export function isSupportedNetwork(chainId: number): boolean {
  return SUPPORTED_NETWORKS.some(n => n.chainId === chainId);
}
