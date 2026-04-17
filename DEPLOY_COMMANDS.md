# 🚀 GXEON WEB3 DEPLOYMENT COMMANDS

## ⚠️ IMPORTANTE: NÃO EXECUTAR AUTOMATICAMENTE

Estes contratos devem ser **deployados manualmente** com sua private key.
**Nunca compartilhe sua chave privada!**

---

## 📋 PRÉ-REQUISITOS

### 1. Configurar .env

```bash
# Edite o arquivo .env com suas chaves reais:
nano .env
```

Variáveis obrigatórias:
```env
# Wallet
PRIVATE_KEY=0x_sua_chave_privada_aqui  # ⚠️ NUNCA COMMITAR!

# RPC (obtenha em https://alchemy.com ou https://quicknode.com)
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/SUA_API_KEY

# Commander (30% share)
COMMANDER_ADDRESS=0x3955d559055DadB7067054cB6E6f974710345224

# Arbiscan (para verificação)
ARBISCAN_API_KEY=sua_api_key_aqui
```

### 2. Fundos Necessários

| Recurso | Quantidade | Propósito |
|:---|:---:|:---|
| **ETH** | 0.05-0.1 | Gas para deploy (~$100-200) |
| **LINK** | 10-50 | Chainlink Functions subscription |

---

## 🏦 DEPLOY 1: TREASURY (Revenue Vault)

```bash
# Deploy Treasury na Arbitrum
npx hardhat run deploy/00_deploy_treasury.js --network arbitrum
```

**Output esperado:**
```
🏦 TREASURY ADDRESS: 0x...
🔍 Arbiscan: https://arbiscan.io/address/0x...
```

**Verificação:**
```bash
# Verificar contrato no Arbiscan
npx hardhat verify --network arbitrum TREASURY_ADDRESS 0x3955d559055DadB7067054cB6E6f974710345224
```

---

## 🔗 DEPLOY 2: CHAINLINK ORACLE

```bash
# Deploy Oracle (requer Treasury já deployado)
npx hardhat run deploy/01_deploy_oracle.js --network arbitrum
```

**Output esperado:**
```
🔗 ORACLE ADDRESS: 0x...
🔍 Arbiscan: https://arbiscan.io/address/0x...
```

**Verificação:**
```bash
# Verificar contrato
npx hardhat verify --network arbitrum ORACLE_ADDRESS 0x97083e831b38cE894180C0A5f40D8c5b1647F30A fun-arbitrum-1 TREASURY_ADDRESS
```

### Configurar Chainlink Functions:

1. Acesse: https://functions.chain.link/arbitrum
2. Crie uma **subscription**
3. Adicione fundos em **LINK** (mínimo 10 LINK)
4. Adicione o **Oracle Address** como consumer
5. Anote o **Subscription ID**

```bash
# Atualizar .env
CHAINLINK_SUBSCRIPTION_ID=seu_subscription_id_aqui
```

---

## 🌊 DEPLOY 3: OCEAN PROTOCOL (Data NFT)

```bash
cd scripts/web3
npm install @oceanprotocol/lib ethers

# Deploy na Arbitrum
node ocean_deploy.js
```

**Output esperado:**
```
🌊 Data NFT: 0x...
🪙 Datatoken: 0x...
🆔 DID: did:op:...
🌐 Market: https://market.oceanprotocol.com/asset/did:op:...
```

---

## 📊 RESUMO PÓS-DEPLOY

Após todos os deploys, seu `.env` deve ter:

```env
# Treasury
GXEON_TREASURY_ADDRESS=0x...

# Chainlink
CHAINLINK_ORACLE_ADDRESS=0x...
CHAINLINK_SUBSCRIPTION_ID=...

# Ocean
OCEAN_DATANFT_ADDRESS=0x...
OCEAN_DATATOKEN_ADDRESS=0x...
OCEAN_DID=did:op:...
```

---

## 🔍 COMANDOS DE VERIFICAÇÃO

### Verificar Saldo do Treasury

```javascript
// Usando Etherscan ou Hardhat console
const treasury = await ethers.getContractAt('GXeonTreasury', 'TREASURY_ADDRESS');
const stats = await treasury.getStats();
console.log(stats);
```

### Testar Oracle

```javascript
const oracle = await ethers.getContractAt('GXeonFunctionsOracle', 'ORACLE_ADDRESS');
const stats = await oracle.getStats();
console.log(stats);
```

---

## 🚨 SEGURANÇA

- ✅ **NUNCA** commite `.env` com chaves reais
- ✅ **SEMPRE** verifique contratos no Arbiscan
- ✅ **TESTE** na Arbitrum Sepolia primeiro
- ✅ **GUARDE** backup dos endereços em local seguro

---

## 🆘 SUPORTE

Problemas com deploy?
- Hardhat docs: https://hardhat.org/hardhat-runner/docs/guides/deploying
- Chainlink Functions: https://docs.chain.link/chainlink-functions
- Ocean Protocol: https://docs.oceanprotocol.com
