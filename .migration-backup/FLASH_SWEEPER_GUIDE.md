# 🌙 MÓDULO FLASH-SWEEPER SOVEREIGN - GUIA DE OPERAÇÃO

**Autorizado por:** Comandante Sena  
**Status:** ATIVO | **Modo:** EXECUÇÃO TOTAL  
**Rede:** Arbitrum One | **Chain ID:** 42161

---

## 📋 RESUMO DO SISTEMA

O Flash-Sweeper é um motor de arbitragem atômica sem capital inicial, utilizando:
- **Flash Loans Aave V3** (0.05% premium)
- **Uniswap V3** (concentrated liquidity)
- **SushiSwap V3** (backup routing)
- **22 pools de elite** monitorados via WebSocket Alchemy

### Fluxo de Execução:
```
1. Detectar divergência de preço (off-chain)
2. Calcular lucro > custo gás (0.1 Gwei Arbitrum)
3. Gerar bundle de transação
4. Flash Loan → Arbitragem → Repagamento → Profit
5. Enviar lucro para: 0x3955d559055DadB7067054cB6E6f974710345224
```

---

## 🗂️ ARQUIVOS CRIADOS

### 1. Contrato Inteligente
**Arquivo:** `contracts/GxeonSovereignExecutor.sol`

**Funções Principais:**
- `initiateArbitrageFlashLoan()` - Inicia flash loan para arbitragem
- `initiateDustSweep()` - Arqueologia de dust em pools
- `initiateJitArbitrage()` - Arbitragem Just-In-Time
- `simulateProfitability()` - Simula lucratividade (view)

**Constantes:**
```solidity
PROFIT_DESTINATION = 0x3955d559055DadB7067054cB6E6f974710345224
FLASH_LOAN_PREMIUM_BPS = 5 (0.05%)
MAX_GAS_PRICE_GWEI = 0.1
MIN_PROFIT_BPS = 15 (0.15%)
```

### 2. Serviço de Monitoramento
**Arquivo:** `server/services/flashSweeper.js`

**Features:**
- Monitoramento WebSocket em tempo real
- 22 pools de elite configurados
- Simulação de lucratividade antes da execução
- Sistema de filas por prioridade
- Integração Supabase para logging

**Comandos:**
```bash
# Iniciar monitoramento
node server/services/flashSweeper.js start

# Ver estatísticas
node server/services/flashSweeper.js stats
```

### 3. Script de Deploy
**Arquivo:** `scripts/deploy_executor_contract.js`

**Uso:**
```bash
# Compilar contrato
npx hardhat compile

# Executar deploy
node scripts/deploy_executor_contract.js deploy
```

---

## 🔧 CONFIGURAÇÃO

### Variáveis de Ambiente (.env)
```env
# RPC WebSocket (obrigatório para velocidade)
ALCHEMY_ARBITRUM_WS_URL=wss://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY

# Chave privada (com prefixo 0x)
PRIVATE_KEY=0x...

# Endereço do contrato (após deploy)
SOVEREIGN_EXECUTOR_ADDRESS=0x...

# Supabase (opcional - para logging)
SUPABASE_PROJECT_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Configurações de execução
MIN_PROFIT_USD=5
FLASH_SIMULATION_MODE=false
EMERGENCY_KILL_SWITCH=INACTIVE
```

---

## 🌐 ENDEREÇOS NA ARBITRUM

### Aave V3
| Contrato | Endereço |
|----------|----------|
| PoolAddressesProvider | 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb |
| Pool | 0x794a61358D6845594F94dc1DB02A252b5b4814aD |

### DEXs
| Protocolo | Endereço |
|-----------|----------|
| Uniswap V3 Router | 0xE592427A0AEce92De3Edee1F18E0157C05861564 |
| Uniswap V3 Quoter | 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6 |
| SushiSwap Router | 0x2C5dd8FB1b71C5A43D44f47F69F867C5F7e5b6d1 |

### Tokens
| Token | Símbolo | Endereço |
|-------|---------|----------|
| USD Coin | USDC | 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8 |
| Tether | USDT | 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 |
| Wrapped ETH | WETH | 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1 |
| Wrapped BTC | WBTC | 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f |
| DAI Stablecoin | DAI | 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1 |
| Arbitrum Token | ARB | 0x912CE59144191C1204E64559FE8253a0e49E6548 |

---

## 🚀 PROCEDIMENTO DE ATIVAÇÃO

### Passo 1: Compilar Contrato
```bash
cd c:\Users\P-c\Documents\xzeon-xpex-1
npx hardhat compile
```

### Passo 2: Deploy na Arbitrum
```bash
node scripts/deploy_executor_contract.js deploy
```

O deployer irá:
1. Validar ambiente
2. Compilar (se necessário)
3. Deploy com 10 argumentos do construtor
4. Verificar estado inicial
5. Salvar artifact em `artifacts/deployments/`
6. Atualizar `.env` automaticamente

### Passo 3: Verificar no Arbiscan
```bash
npx hardhat verify --network arbitrum <CONTRACT_ADDRESS> \
  0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb \
  0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8 \
  0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9 \
  0x82aF49447D8a07e3bd95BD0d56f35241523fBab1 \
  0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f \
  0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1 \
  0x912CE59144191C1204E64559FE8253a0e49E6548 \
  0xE592427A0AEce92De3Edee1F18E0157C05861564 \
  0x2C5dd8FB1b71C5A43D44f47F69F867C5F7e5b6d1 \
  0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6
```

### Passo 4: Iniciar Monitoramento
```bash
node server/services/flashSweeper.js start
```

---

## 📊 POOLS DE ELITE (22)

### Tier 1 - Maior Liquidez
| Par | Fee Tier |
|-----|----------|
| USDC/WETH | 0.05% |
| USDC/USDT | 0.01% |
| USDT/WETH | 0.05% |
| WETH/WBTC | 0.05% |
| USDC/DAI | 0.01% |
| WETH/DAI | 0.05% |
| USDT/DAI | 0.01% |
| WETH/ARB | 0.3% |

### Tier 2 - Alta Liquidez
| Par | Fee Tier |
|-----|----------|
| USDC/WBTC | 0.3% |
| USDT/WBTC | 0.3% |
| WBTC/DAI | 0.3% |
| ARB/USDC | 0.3% |
| ARB/USDT | 0.3% |
| ARB/WETH | 0.3% |
| ARB/DAI | 0.3% |

### Tier 3 - Volátil/Alto Yield
| Par | Fee Tier |
|-----|----------|
| WETH/LINK | 0.3% |
| USDC/LINK | 0.3% |
| WBTC/LINK | 0.3% |
| WETH/UNI | 0.3% |
| USDC/UNI | 0.3% |
| ARB/LINK | 0.3% |
| ARB/UNI | 0.3% |

---

## ⚙️ PARÂMETROS DE EXECUÇÃO

### Thresholds
| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| `MIN_PROFIT_USD` | $5 | Lucro mínimo para execução |
| `MIN_PROFIT_BPS` | 15 | 0.15% mínimo sobre flash |
| `MAX_GAS_PRICE_GWEI` | 0.1 | Gás máximo na Arbitrum |
| `FLASH_LOAN_PREMIUM_BPS` | 5 | 0.05% taxa Aave |
| `GAS_LIMIT_ARBITRAGE` | 500k | Gas units por tx |

### Fee Tiers Uniswap V3
| Tier | Valor | Uso |
|------|-------|-----|
| 100 | 0.01% | Stable pairs |
| 500 | 0.05% | Standard |
| 3000 | 0.3% | Volatile |
| 10000 | 1% | Exotic |

---

## 🛡️ SEGURANÇA

### Proteções Implementadas
1. **Execução Atômica** - Tudo reverte se não lucrativo
2. **Slippage Control** - Mínimo output calculado
3. **MEV Protection** - Time constraints e gas limits
4. **ReentrancyGuard** - Proteção contra reentrada
5. **Owner-only** - Funções críticas restritas

### Emergency Procedures
```javascript
// Parar serviço
node server/services/flashSweeper.js stop

// Desativar contrato (owner)
executorContract.setModuleActive(false)

// Resgatar tokens (emergência)
executorContract.rescueTokens(tokenAddress, amount)
```

---

## 📈 MÉTRICAS ESPERADAS

### Performance Estimada
- **Latência:** < 200ms (WebSocket Alchemy)
- **Gas por tx:** ~200-500k units
- **Custo gás:** ~$0.02-0.05 por tx (0.1 Gwei)
- **Oportunidades/dia:** 5-50 (depende da volatilidade)
- **Taxa de sucesso:** > 90% (simulação prévia)

### ROI Calculado
```
Flash Loan: $10,000 USDC
Divergência: 0.25% (25 bps)
Gross Profit: $25
Aave Premium (0.05%): $5
Gas Cost: $0.03
Net Profit: ~$19.97
ROI: 0.20% por operação
```

---

## 🔗 INTEGRAÇÕES

### Eventos Monitorados
```solidity
FlashLoanExecuted
ArbitrageAtomicExecuted
DustSwept
JitLiquidityInjected
ProfitSent
```

### Supabase Schema (sugerido)
```sql
CREATE TABLE flash_sweeper_executions (
    id SERIAL PRIMARY KEY,
    opportunity_id TEXT,
    pair TEXT,
    flash_amount NUMERIC,
    estimated_profit NUMERIC,
    gas_used NUMERIC,
    tx_hash TEXT,
    success BOOLEAN,
    block_number INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🐛 TROUBLESHOOTING

### Erros Comuns

#### "Hardhat not found"
```bash
npm install --save-dev hardhat
npx hardhat init
```

#### "Contract not compiled"
```bash
npx hardhat compile
```

#### "Insufficient funds"
- Mínimo 0.001 ETH na Arbitrum para gás
- Bridge de ETH via: https://bridge.arbitrum.io

#### "Simulation failed"
- Verificar `SOVEREIGN_EXECUTOR_ADDRESS`
- Verificar RPC URLs
- Verificar `moduleActive()` no contrato

---

## 📞 COMANDOS ÚTEIS

```bash
# Ver saldo
node -e "const {ethers} = require('ethers'); const p = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc'); p.getBalance('0x...').then(b => console.log(ethers.formatEther(b)))"

# Ver stats do contrato
node -e "const {ethers} = require('ethers'); const abi = ['function getStats() view returns (uint256,uint256,uint256,uint256,uint256,uint256)']; const c = new ethers.Contract('0x...', abi, new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc')); c.getStats().then(s => console.log('Executions:', s[0], 'Profit:', s[1]))"

# Ver pools de elite
node -e "const {ethers} = require('ethers'); const abi = ['function getElitePools() view returns (bytes32[])']; const c = new ethers.Contract('0x...', abi, new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc')); c.getElitePools().then(p => console.log('Pools:', p.length))"
```

---

## ✅ CHECKLIST DE ATIVAÇÃO

- [ ] Compilar contrato (`npx hardhat compile`)
- [ ] Configurar `.env` com todas as variáveis
- [ ] Executar deploy (`node scripts/deploy_executor_contract.js deploy`)
- [ ] Verificar contrato no Arbiscan
- [ ] Confirmar `SOVEREIGN_EXECUTOR_ADDRESS` no `.env`
- [ ] Testar serviço em modo simulação (`FLASH_SIMULATION_MODE=true`)
- [ ] Ativar módulo no contrato (`setModuleActive(true)`)
- [ ] Iniciar monitoramento (`node server/services/flashSweeper.js start`)
- [ ] Verificar logs e estatísticas

---

**Módulo Flash-Sweeper Sovereign v1.0**  
*Autorizado para extração atômica de lucro*  
🌙⚡🚀
