# 🦁 GXEON PREDATOR v21.2 — Extensão Brave/Chrome

## 📦 Estrutura Completa

```
extension/
├── manifest.json              # Manifest V3 — RG da extensão
├── background.js              # Service Worker — Motor Silencioso
├── popup.html                 # Interface Visual
├── popup.js                   # Controller do Popup
├── icons/                     # Ícones em SVG (converta para PNG para produção)
│   ├── icon16.svg
│   ├── icon32.svg
│   ├── icon48.svg
│   └── icon128.svg
├── scripts/
│   └── generate-icons.js      # Gerador de ícones PNG
├── INSTALL.md                 # Guia de instalação passo a passo
└── README.md                  # Este arquivo
```

---

## 🚀 Instalação Rápida

### 1. Instalar no Brave (Modo Desenvolvedor)

```bash
# 1. Abra o Brave e digite:
brave://extensions/

# 2. Ative "Modo do desenvolvedor" (canto superior direito)

# 3. Clique "Carregar descompactada"

# 4. Selecione esta pasta: extension/
```

### 2. Gerar Ícones PNG (Opcional)

Se quiser ícones PNG (melhor compatibilidade):

```bash
# Na raiz do projeto:
npm install sharp
node extension/scripts/generate-icons.js
```

---

## 🧬 Funcionalidades

| Feature | Descrição |
|---------|-----------|
| 🔍 **Radar 24/7** | Escuta servidor Railway continuamente |
| 🔔 **Notificações** | Alerta visual + sonoro quando GARI encontrar ouro |
| 💰 **Display de Lucro** | Badge com valor da oportunidade |
| 🎯 **1-Click Execute** | Botão para abrir Brave Wallet |
| 🧹 **Histórico** | Persiste oportunidades no storage |

---

## 🔌 Integração com Servidor

A extensão se conecta ao seu servidor GXEON via:

```
Protocolo: DNA_CONVERSAO_v21.2
Endpoints: https://gxeon-ia-production.up.railway.app/*
          http://localhost:8080/*
```

### Payload Esperado

```json
{
  "type": "GARI_OPPORTUNITY_DETECTED",
  "payload": {
    "net_profit": 10.50,
    "roi_percent": 525,
    "contract": "0x...",
    "action_type": "review"
  }
}
```

---

## 🎨 Customização

### Cores
Edite `popup.html` para mudar o tema:
```css
--gold: #D4AF37;
--cyan: #00FFFF;
--bg: #0a0e27;
```

### Som de Alerta
Adicione em `background.js`:
```javascript
new Audio('assets/alert.mp3').play();
```

---

## 📋 Manifesto (Resumido)

- **Nome:** GXEON PREDATOR
- **Versão:** 21.2
- **Permissões:** Storage, Notifications, ActiveTab
- **Host Permissions:** Railway + Localhost
- **Modo:** Service Worker (MV3)

---

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| Extensão não carrega | Verifique se `manifest.json` existe |
| Ícones não aparecem | Converta SVG → PNG ou use gerador |
| Sem notificações | Permita notificações nas configs do Brave |
| Não conecta | Verifique `BRAVE_EXTENSION_ENDPOINT` no `.env` |

---

## 🎯 Roadmap

- [x] Manifest V3
- [x] Background Service Worker
- [x] Popup Cyberpunk UI
- [x] Notificações nativas
- [x] Handshake DNA
- [ ] Som de alerta
- [ ] Integração Brave Wallet API
- [ ] Dark/Light theme toggle
- [ ] Publicar na Chrome Web Store

---

## 🦁 GXEON PREDATOR v21.2

**DNA de Conversão Supremo ativado.**

Pronto para caçar oportunidades de arqueologia digital 24/7.

---

## 📄 Licença

Proprietário — GXEON Systems
