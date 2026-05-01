/**
 * GXEON Settlement Contract Configuration
 * Deployed on Sepolia Testnet
 * 
 * Contract: GXeonSettlement
 * Address: 0x3955d559055DadB7067054cB6E6f974710345224
 * Network: Sepolia (Chain ID: 11155111)
 */

export const CONTRACT_ADDRESS = '0x3955d559055DadB7067054cB6E6f974710345224';

export const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "userId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "FundsDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "userId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "operationId",
        "type": "string"
      }
    ],
    "name": "FundsLocked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "userId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "FundsReleased",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "balances",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "userId",
        "type": "bytes32"
      }
    ],
    "name": "depositFunds",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "userId",
        "type": "bytes32"
      }
    ],
    "name": "getBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "userId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "releaseFunds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
];

// Sepolia Network Configuration
export const NETWORK_CONFIG = {
  chainId: 11155111,
  name: 'Sepolia Testnet',
  rpcUrl: (import.meta as any).env?.VITE_ALCHEMY_RPC_URL || 'https://rpc.sepolia.org',
  explorerUrl: 'https://sepolia.etherscan.io'
};

// Helper function to convert string userId to bytes32
export function toBytes32(userId: string): string {
  // If userId is already hex with 0x prefix and 64 chars, return it
  if (userId.startsWith('0x') && userId.length === 66) {
    return userId;
  }
  // Otherwise, pad or hash the string
  const hex = Buffer.from(userId).toString('hex');
  return '0x' + hex.padEnd(64, '0');
}

// DEX Addresses on Sepolia
export const DEX_ADDRESSES = {
  uniswap_v2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
  sushiswap_v2: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506', // SushiSwap V2 Router
  uniswap_v3: '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
};

// Token Addresses on Sepolia
export const TOKEN_ADDRESSES = {
  WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
  USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371B8a357',
  WBTC: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
};

// Router ABIs (simplified)
export const ROUTER_ABI = [
  'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)',
];
