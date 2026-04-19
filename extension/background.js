/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦁 GXEON PREDATOR v21.2 — Motor Silencioso da Extensão Brave
 * Background Service Worker — DNA de Conversão Supremo
 * Escuta servidor Railway 24/7 e notifica oportunidades de arqueologia
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const CONFIG = {
    // Endpoints GXEON
    serverUrl: 'https://gxeon-ia-production.up.railway.app',
    localUrl: 'http://localhost:8080',
    
    // Polling interval (ms)
    heartbeatInterval: 30000, // 30s
    
    // Notificações
    notificationDuration: 10000, // 10s
    
    // Badges
    colors: {
        gold: '#D4AF37',
        cyan: '#00FFFF',
        red: '#FF4444',
        green: '#00FF00'
    }
};

// Estado da extensão
let gariState = {
    isConnected: false,
    opportunities: [],
    totalProfit: 0,
    lastPing: null,
    version: '21.2'
};

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

chrome.runtime.onInstalled.addListener(() => {
    console.log('🦁 [GXEON-PREDATOR] v21.2 instalado — DNA ativo');
    
    // Badge inicial
    updateBadge('ON', CONFIG.colors.gold);
    
    // Teste de conexão inicial
    testServerConnection();
    
    // Heartbeat periódico via setInterval (alarm permission removida)
    setInterval(() => {
        testServerConnection();
    }, 30000); // 30 segundos
});

// ═══════════════════════════════════════════════════════════════════════════
// 🧬 RECEPTOR EXTERNO — DNA_CONVERSAO_v21.2
// ═══════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    console.log('🦁 [GXEON-PREDATOR] Mensagem externa recebida:', request.type);
    
    // 🏓 Handler PING (para testes)
    if (request.type === 'PING') {
        console.log('🏓 [GXEON-PREDATOR] PING recebido — respondendo PONG');
        sendResponse({
            acknowledged: true,
            ackId: `pong_${Date.now()}`,
            predatorVersion: CONFIG.version,
            timestamp: Date.now(),
            status: 'active'
        });
        return true;
    }
    
    // 🧪 Handler TEST_SIGNAL (simula oportunidade para demonstração)
    if (request.type === 'TEST_SIGNAL' || request.type === 'SIMULATE_GARI') {
        const profit = request.profit || 10.50;
        console.log(`🧪 [GXEON-PREDATOR] TEST_SIGNAL recebido: $${profit}`);
        
        const response = simulateTestSignal(profit);
        sendResponse(response);
        
        // Mostrar notificação visual
        chrome.notifications.create('test_signal', {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: '🧪 MODO MONETIZAÇÃO ATIVADO!',
            message: `Sinal de teste: $${profit} | Extensão pronta para produção`,
            priority: 2
        });
        
        return true;
    }
    
    // Verificar protocolo DNA
    if (request.protocol !== 'DNA_CONVERSAO_v21.2' && 
        request.type !== 'GARI_OPPORTUNITY_DETECTED') {
        console.warn('⚠️ [GXEON-PREDATOR] Protocolo desconhecido:', request.protocol);
        return false;
    }
    
    // Processar oportunidade
    if (request.type === 'GARI_OPPORTUNITY_DETECTED' && request.payload) {
        handleGariOpportunity(request.payload);
    }
    
    // ✅ Handshake DNA
    const response = {
        acknowledged: true,
        ackId: `leo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        dnaVerified: true,
        processedCount: 1,
        predatorVersion: CONFIG.version,
        timestamp: Date.now()
    };
    
    console.log('🤝 [GXEON-PREDATOR] Handshake DNA confirmado:', response.ackId);
    sendResponse(response);
    
    return true; // Keep channel open for async
});

// ═══════════════════════════════════════════════════════════════════════════
// 🎯 HANDLER DE OPORTUNIDADE
// ═══════════════════════════════════════════════════════════════════════════

async function handleGariOpportunity(payload) {
    const { id, net_profit, roi_percent, action_type, priority, execution_data } = payload;
    
    console.log(`💎 [GXEON-PREDATOR] Oportunidade recebida: $${net_profit} (${roi_percent}% ROI)`);
    
    // Salvar na memória
    gariState.opportunities.push({
        ...payload,
        receivedAt: Date.now(),
        status: 'pending'
    });
    
    // Atualizar estatísticas
    gariState.totalProfit += parseFloat(net_profit);
    
    // Persistir no storage
    await chrome.storage.local.set({
        opportunities: gariState.opportunities,
        totalProfit: gariState.totalProfit,
        lastUpdate: Date.now()
    });
    
    // 🔔 Notificação visual
    const priorityEmoji = priority === 'urgent' ? '🔥' : priority === 'high' ? '⚡' : '🧹';
    const actionEmoji = action_type === 'auto_execute' ? '🤖' : '👁️';
    
    chrome.notifications.create(`gari_${id}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `${priorityEmoji} GARI: OURO ENCONTRADO!`,
        message: `💰 Lucro: $${net_profit} | 📈 ROI: ${roi_percent}% | ${actionEmoji} ${action_type.toUpperCase()}`,
        priority: priority === 'urgent' ? 2 : 1,
        requireInteraction: priority === 'urgent',
        buttons: [
            { title: '💰 EXECUTAR' },
            { title: '👁️ VER DETALHES' }
        ]
    });
    
    // 🎨 Badge pulsante
    const badgeText = net_profit > 50 ? '$50+' : net_profit > 20 ? '$20+' : '$';
    const badgeColor = priority === 'urgent' ? CONFIG.colors.red : 
                       priority === 'high' ? CONFIG.colors.gold : CONFIG.colors.cyan;
    
    updateBadge(badgeText, badgeColor);
    
    // Reset badge após 10 segundos
    setTimeout(() => {
        updateBadge(gariState.opportunities.length.toString(), CONFIG.colors.gold);
    }, CONFIG.notificationDuration);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔔 HANDLERS DE NOTIFICAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    const opportunity = gariState.opportunities.find(o => notificationId === `gari_${o.id}`);
    
    if (!opportunity) return;
    
    if (buttonIndex === 0) {
        // 💰 EXECUTAR — Abrir Brave Wallet
        console.log('🚀 [GXEON-PREDATOR] Executando coleta:', opportunity.id);
        
        // Aqui integraria com Brave Wallet API
        chrome.tabs.create({
            url: `https://debank.com/profile/${opportunity.contract}`
        });
        
    } else if (buttonIndex === 1) {
        // 👁️ VER DETALHES — Abrir popup
        chrome.action.openPopup();
    }
});

chrome.notifications.onClicked.addListener((notificationId) => {
    chrome.action.openPopup();
});

// ═══════════════════════════════════════════════════════════════════════════
// 💓 HEARTBEAT removido — usando setInterval no onInstalled

async function testServerConnection() {
    // Se modo teste ativo, simular conexão
    if (CONFIG.testMode) {
        gariState.isConnected = true;
        updateBadge('TEST', CONFIG.colors.gold);
        return;
    }
    
    // Tentar localhost primeiro, depois Railway
    const endpoints = [
        `${CONFIG.localUrl}/gari/status`,
        `${CONFIG.railwayUrl}/gari/status`
    ];
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: { 'X-GXEON-Source': 'predator_extension' },
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                gariState.isConnected = true;
                gariState.lastPing = Date.now();
                gariState.activeEndpoint = endpoint.includes('localhost') ? 'local' : 'railway';
                
                const data = await response.json();
                console.log('💓 [GXEON-PREDATOR] Heartbeat OK:', data);
                
                // Atualizar badge com contagem
                const count = data.stats?.totalFound || gariState.opportunities.length;
                updateBadge(count > 0 ? count.toString() : 'ON', CONFIG.colors.gold);
                return; // Conectado com sucesso
            }
        } catch (err) {
            console.log(`⚠️ [GXEON-PREDATOR] Falha em ${endpoint}: ${err.message}`);
        }
    }
    
    // Nenhum endpoint respondeu
    gariState.isConnected = false;
    console.warn('⚠️ [GXEON-PREDATOR] Todos os servidores offline');
    updateBadge('OFF', CONFIG.colors.red);
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 MODO TESTE — Simula sinal GARI sem servidor
// ═══════════════════════════════════════════════════════════════════════════

function simulateTestSignal(profit = 10.50) {
    console.log('🧪 [GXEON-PREDATOR] Simulando sinal de teste...');
    
    const mockPayload = {
        id: `gari_test_${Date.now()}`,
        token: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
        contract: `0x${Array(40).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        raw_value: profit + 2,
        net_profit: profit,
        gas_estimate: 2,
        roi_percent: (profit / 2 * 100),
        execution_data: {
            chainId: 42161,
            to: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
            data: '0xac9650d8',
            value: '0x0',
            gasLimit: '0x493E0',
            estimatedUsd: 2
        },
        confidence: 0.85,
        priority: profit > 20 ? 'high' : 'normal',
        action_type: 'review'
    };
    
    handleGariOpportunity(mockPayload);
    
    return {
        acknowledged: true,
        ackId: `test_${Date.now()}`,
        dnaVerified: true,
        testMode: true
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// 🎨 UTILS — Badge e UI
// ═══════════════════════════════════════════════════════════════════════════

function updateBadge(text, color) {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
    
    // Tooltip
    chrome.action.setTitle({
        title: `GXEON PREDATOR v21.2 | ${gariState.opportunities.length} oportunidades | $${gariState.totalProfit.toFixed(2)} lucro`
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// 📨 COMUNICAÇÃO INTERNA (popup.js)
// ═══════════════════════════════════════════════════════════════════════════

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'GET_STATE':
            sendResponse({
                state: gariState,
                config: CONFIG
            });
            break;
            
        case 'GET_OPPORTUNITIES':
            chrome.storage.local.get(['opportunities'], (result) => {
                sendResponse({ opportunities: result.opportunities || [] });
            });
            return true; // Async
            
        case 'CLEAR_OPPORTUNITIES':
            gariState.opportunities = [];
            gariState.totalProfit = 0;
            chrome.storage.local.set({
                opportunities: [],
                totalProfit: 0
            });
            updateBadge('ON', CONFIG.colors.gold);
            sendResponse({ cleared: true });
            break;
            
        case 'PING_SERVER':
            testServerConnection().then(() => {
                sendResponse({ connected: gariState.isConnected });
            });
            return true; // Async
    }
    
    return false;
});

// ═══════════════════════════════════════════════════════════════════════════
// 🧹 LIMPEZA PERIÓDICA — via setInterval no startup
setInterval(() => {
    // Limpar oportunidades antigas (mais de 24h)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    const originalCount = gariState.opportunities.length;
    gariState.opportunities = gariState.opportunities.filter(o => o.receivedAt > cutoff);
    
    if (gariState.opportunities.length !== originalCount) {
        chrome.storage.local.set({ opportunities: gariState.opportunities });
        console.log('🧹 [GXEON-PREDATOR] Limpeza:', gariState.opportunities.length, 'oportunidades ativas');
    }
}, 60 * 60 * 1000); // A cada hora

console.log('🦁 [GXEON-PREDATOR] v21.2 Background Service Worker iniciado');
