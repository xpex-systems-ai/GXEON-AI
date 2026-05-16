# 🔒 GXEON AI - Relatório de Auditoria de Segurança

> **Data:** 07/04/2026  
> **Auditor:** Cascade AI  
> **Escopo:** dashboard/, backend (server/, core/), infraestrutura Web3  

---

## 🟢 Sucessos (Check de Integridade)

| Item | Status | Detalhes |
|------|--------|----------|
| **CONTRACT_ADDRESS** | ✅ Correto | Fallback aponta para `0x3955d559055DadB7067054cB6E6f974710345224` conforme especificado em `dashboard/src/config/contract.ts:10` |
| **Ethers v6** | ✅ OK | Uso correto de `BrowserProvider` e `JsonRpcSigner` no `useWeb3.ts` |
| **Env Prefix (Frontend)** | ✅ OK | Todas as variáveis do dashboard usam prefixo `VITE_` corretamente |
| **Dashboard .gitignore** | ✅ OK | Ignora `.env`, `.env.local`, e arquivos de build adequadamente |
| **Supabase Auth** | ✅ OK | Integração com Supabase session tokens implementada corretamente em `api.ts` |
| **Choke-Point Header** | ✅ OK | Header `x-gxeon-key` sendo injetado corretamente para autenticação backend |

---

## 🟡 Avisos (Requerem Atenção)

### 1. Tratamento de Erros no useWeb3.ts
**Arquivo:** `dashboard/src/hooks/useWeb3.ts:143`

```typescript
catch (error) {
  console.error('Failed to connect wallet:', error);
  // ❌ Erro silenciado - usuário não é notificado visualmente
}
```

**Impacto:** Usuário não recebe feedback visual quando conexão falha (rejeição de promise não tratada adequadamente).

**Recomendação:** Adicionar estado de erro e UI feedback:
```typescript
const [error, setError] = useState<string | null>(null);
// ... no catch: setError(error.message);
```

### 2. Path Suspeito no .gitignore Raiz
**Arquivo:** `.gitignore:1`

```
config/secure/.env  # ⚠️ Path não verificado - garantir que exista
```

**Verificação:** O path `config/secure/.env` está listado mas a estrutura de diretórios não foi confirmada.

### 3. Uso de RPC Público em Fallback
**Arquivo:** `core/onchain_executor.js:22`

```javascript
rpc: config.networks?.ethereum_sepolia?.rpc || 'https://rpc.sepolia.org',
```

**Aviso:** RPC público `rpc.sepolia.org` pode ter rate limiting agressivo.

---

## 🔴 Vulnerabilidades Críticas

### 🚨 VULNERABILIDADE 1: API Key Alchemy Exposta (Dashboard)
**Severidade:** CRÍTICA  
**Arquivo:** `dashboard/src/config/contract.ts:192`  
**CWE-798:** Hardcoded Credentials

```typescript
export const NETWORK_CONFIG = {
  chainId: 11155111,
  name: 'Sepolia Testnet',
  rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/kohvVvNp-Kc415wIXkErk',  // 🔴 EXPOSTA
  explorerUrl: 'https://sepolia.etherscan.io'
};
```

**Risco:** 
- API Key visível em código-fonte (bundle JavaScript)
- Qualquer usuário pode extrair e abusar da key
- Potencial para ataques de rate limiting e custos inesperados

**Correção Imediata:**
```typescript
rpcUrl: import.meta.env.VITE_ALCHEMY_RPC_URL || 'https://rpc.sepolia.org'
```

---

### 🚨 VULNERABILIDADE 2: API Key Alchemy Exposta (Core/Backend)
**Severidade:** CRÍTICA  
**Arquivo:** `core/onchain_executor.js:34`  
**CWE-798:** Hardcoded Credentials

```javascript
worldchain_sepolia: {
  name: 'World Chain Sepolia',
  rpc: 'https://worldchain-sepolia.g.alchemy.com/v2/gFGTH8S54T0GJ0SQ1he5n',  // 🔴 EXPOSTA
  chainId: 4801,
  symbol: 'ETH'
}
```

**Correção Imediata:**
```javascript
rpc: config.networks?.worldchain_sepolia?.rpc || process.env.WORLDCHAIN_RPC_URL
```

---

### 🚨 VULNERABILIDADE 3: Uso Incorreto de process.env no Vite Config
**Severidade:** ALTA  
**Arquivo:** `dashboard/vite.config.ts:10`

```typescript
proxy: {
  '/api': {
    target: process.env.VITE_API_URL || 'http://localhost:3000',  // 🔴 process.env não funciona no Vite!
    changeOrigin: true,
  }
}
```

**Problema:** `process.env` não é resolvido em arquivos Vite durante o build. Isso resultará em `undefined` em produção, causando falha no proxy.

**Correção Imediata:**
```typescript
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    }
  };
});
```

---

## 🛠️ Sugestões de Melhoria

### 1. Implementar Rate Limiting no Dashboard
Adicionar proteção contra abuse do frontend mesmo sendo autenticado.

### 2. Rotacionar as API Keys Expostas
**AÇÃO IMEDIATA NECESSÁRIA:**
1. Acessar https://dashboard.alchemy.com/
2. Rotacionar as keys `kohvVvNp-Kc415wIXkErk` e `gFGTH8S54T0GJ0SQ1he5n`
3. Adicionar restrições de domínio (CORS/Referrer)
4. Nunca commitar as novas keys - usar variáveis de ambiente

### 3. Adicionar Validação de Schema para Env Vars
Usar biblioteca como `zod` ou `envalid` para garantir que todas as variáveis necessárias existem no startup:

```typescript
// env.validation.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_SYSTEM_API_KEY: z.string().min(10),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
});

export const env = envSchema.parse(import.meta.env);
```

### 4. Implementar Health Check de Rede no useWeb3
Adicionar verificação de conectividade antes de tentar operações:

```typescript
const checkNetworkHealth = async () => {
  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    await provider.getBlockNumber();
    return true;
  } catch {
    return false;
  }
};
```

### 5. Adicionar .env.local ao .gitignore Raiz
Garantir que arquivos `.env.local` também sejam ignorados no nível raiz.

---

## 📋 Checklist de Ações Imediatas

- [ ] **PRIORIDADE 1:** Rotacionar API Keys Alchemy expostas
- [ ] **PRIORIDADE 1:** Mover RPC URLs para variáveis de ambiente (`VITE_ALCHEMY_RPC_URL`)
- [ ] **PRIORIDADE 2:** Corrigir `vite.config.ts` para usar `loadEnv()`
- [ ] **PRIORIDADE 2:** Adicionar tratamento de erro visual no `useWeb3.ts`
- [ ] **PRIORIDADE 3:** Implementar validação de schema para env vars
- [ ] **PRIORIDADE 3:** Adicionar rate limiting no dashboard API client

---

## 📁 Arquivos Auditados

```
✅ dashboard/src/config/contract.ts       (VULNERABILIDADE CRÍTICA)
✅ dashboard/src/hooks/useWeb3.ts         (OK - melhorias sugeridas)
✅ dashboard/vite.config.ts               (VULNERABILIDADE ALTA)
✅ dashboard/.env.example                  (OK)
✅ dashboard/.gitignore                    (OK)
✅ core/onchain_executor.js               (VULNERABILIDADE CRÍTICA)
✅ .env.example                           (OK)
✅ .gitignore                              (OK - path suspeito)
```

---

> **Nota para Operador Sena:** Este relatório deve ser revisado antes da ativação dos agentes GXeon AI. As vulnerabilidades críticas de API keys expostas devem ser corrigidas **IMEDIATAMENTE** para prevenir abuso e custos inesperados.
