# 🦁 GXEON PREDATOR v21.2 — Guia de Instalação

## 🚀 Instalação no Brave (Modo Desenvolvedor)

### 1. Gerar Ícones (se ainda não tiver)

```bash
cd c:\Users\P-c\Documents\xzeon-xpex-1

# Instalar sharp (se necessário)
npm install sharp --save-dev

# Gerar ícones PNG
node extension/scripts/generate-icons.js
```

### 2. Carregar no Brave

1. Abra o Brave browser
2. Digite na barra de endereço: `brave://extensions/`
3. Ative o **"Modo do desenvolvedor"** (canto superior direito)
4. Clique em **"Carregar descompactada"**
5. Selecione a pasta: `c:\Users\P-c\Documents\xzeon-xpex-1\extension`
6. ✅ A extensão aparecerá com o ícone dourado!

### 3. Testar Instalação

1. Clique no ícone 🦁 GXEON na barra de ferramentas
2. Verifique se o popup abre com o tema cyberpunk
3. Clique em **"ATUALIZAR"** para testar conexão

---

## 🧪 Testar DNA de Conversão

### Via simulador local:

```bash
# Terminal 1: Iniciar servidor GXEON
npm run start:oracle

# Terminal 2: Enviar sinal fake
node tests/simulateGari.js --profit=10.50
```

### Resultado esperado:

1. 🔔 Notificação no Windows: "🧹 GARI: OURO ENCONTRADO!"
2. 🦁 Badge da extensão pisca com `$10.50+`
3. 🎨 Popup atualiza com nova oportunidade

---

## 🔧 Configuração

### Variáveis de Ambiente (`.env`)

```env
# Endpoint da extensão (Brave recebe aqui)
BRAVE_EXTENSION_ENDPOINT=http://localhost:3001/gari/receive

# Ou use o Railway em produção
BRAVE_EXTENSION_ENDPOINT=https://gxeon-ia-production.up.railway.app/gari/receive
```

### Permissões necessárias

O `manifest.json` já inclui:
- `notifications` — Para alertas visuais
- `storage` — Para persistir oportunidades
- `host_permissions` — Conectar ao Railway e localhost

---

## 📁 Estrutura de Arquivos

```
extension/
├── manifest.json          # RG da extensão
├── background.js          # Motor silencioso (service worker)
├── popup.html             # Interface visual
├── popup.js               # Controller do popup
├── icons/
│   ├── icon16.png         # Favicon
│   ├── icon32.png         # Toolbar
│   ├── icon48.png         # Gerenciador
│   └── icon128.png        # Notificações & Store
└── scripts/
    └── generate-icons.js  # Gerador de ícones
```

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| "Ícones não encontrados" | Execute `npm install sharp && node extension/scripts/generate-icons.js` |
| "Failed to load extension" | Verifique se todos os arquivos estão na pasta |
| "Não conecta ao servidor" | Verifique `BRAVE_EXTENSION_ENDPOINT` no `.env` |
| "Notificações não aparecem" | Permitir notificações do Brave nas configurações do Windows |
| "CORS error" | Adicione `externally_connectable` no manifest.json (já incluso) |

---

## 🎨 Personalização

### Cores do Tema

Edite `popup.html`:
```css
--color-gold: #D4AF37;      /* Primário */
--color-cyan: #00FFFF;      /* Secundário */
--color-bg: #0a0e27;        /* Background */
```

### Som de Notificação

Adicione em `background.js`:
```javascript
const audio = new Audio('assets/alert.mp3');
audio.play();
```

---

## 🚀 Publicar na Chrome Web Store (Futuro)

1. Crie conta de desenvolvedor ($5 USD)
2. Compacte a pasta `extension/` em `.zip`
3. Acesse: https://chrome.google.com/webstore/devconsole
4. Clique **"Novo Item"** → Upload do ZIP
5. Preencha descrição, screenshots, política de privacidade

---

## 🎯 Próximos Passos

1. ✅ Instalar extensão no Brave
2. ✅ Testar com simulador
3. [ ] Criar conta Chrome Web Store
4. [ ] Adicionar som de alerta
5. [ ] Implementar integração Brave Wallet

---

**🦁 GXEON PREDATOR v21.2 — Pronto para caçar oportunidades!**
