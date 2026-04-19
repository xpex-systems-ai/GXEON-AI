/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦁 GXEON PREDATOR v21.2 — Popup Controller
 * Interface do usuário — DNA de Conversão Supremo
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// ELEMENTOS DOM
// ═══════════════════════════════════════════════════════════════════════════

const elements = {
    radarStatus: document.getElementById('radar-status'),
    serverStatus: document.getElementById('server-status'),
    lastUpdate: document.getElementById('last-update'),
    oppCount: document.getElementById('opp-count'),
    totalProfit: document.getElementById('total-profit'),
    opportunityList: document.getElementById('opportunity-list'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnClear: document.getElementById('btn-clear')
};

// ═══════════════════════════════════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🦁 [GXEON-PREDATOR-POPUP] Interface carregada');
    
    // Carregar estado inicial
    await loadState();
    
    // Configurar listeners
    elements.btnRefresh.addEventListener('click', handleRefresh);
    elements.btnClear.addEventListener('click', handleClear);
    
    // Atualização automática a cada 5s
    setInterval(loadState, 5000);
});

// ═══════════════════════════════════════════════════════════════════════════
// CARREGAR ESTADO
// ═══════════════════════════════════════════════════════════════════════════

async function loadState() {
    try {
        // Obter estado do background
        const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
        
        if (response && response.state) {
            updateUI(response.state);
        }
        
        // Carregar oportunidades do storage
        const oppResponse = await chrome.runtime.sendMessage({ type: 'GET_OPPORTUNITIES' });
        
        if (oppResponse && oppResponse.opportunities) {
            renderOpportunities(oppResponse.opportunities);
        }
        
        // Atualizar timestamp
        elements.lastUpdate.textContent = new Date().toLocaleTimeString();
        
    } catch (err) {
        console.error('❌ [GXEON-PREDATOR-POPUP] Erro ao carregar estado:', err);
        showError('Falha na conexão com background');
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ATUALIZAR UI
// ═══════════════════════════════════════════════════════════════════════════

function updateUI(state) {
    // Status do radar
    if (state.isConnected) {
        elements.radarStatus.textContent = 'SCANNING...';
        elements.radarStatus.className = 'status-value scanning';
        
        elements.serverStatus.textContent = 'ONLINE';
        elements.serverStatus.className = 'status-value connected';
    } else {
        elements.radarStatus.textContent = 'PAUSED';
        elements.radarStatus.className = 'status-value disconnected';
        
        elements.serverStatus.textContent = 'OFFLINE';
        elements.serverStatus.className = 'status-value disconnected';
    }
    
    // Estatísticas
    elements.oppCount.textContent = state.opportunities?.length || 0;
    elements.totalProfit.textContent = `$${(state.totalProfit || 0).toFixed(2)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// RENDERIZAR OPORTUNIDADES
// ═══════════════════════════════════════════════════════════════════════════

function renderOpportunities(opportunities) {
    if (!opportunities || opportunities.length === 0) {
        elements.opportunityList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <div class="empty-text">Aguardando oportunidades...</div>
            </div>
        `;
        return;
    }
    
    // Ordenar por lucro (maior primeiro)
    const sorted = opportunities.sort((a, b) => b.net_profit - a.net_profit);
    
    elements.opportunityList.innerHTML = sorted.map(opp => {
        const priority = opp.priority || 'normal';
        const priorityEmoji = priority === 'urgent' ? '🔥' : priority === 'high' ? '⚡' : '🧹';
        const contractShort = opp.contract ? `${opp.contract.slice(0, 6)}...${opp.contract.slice(-4)}` : 'N/A';
        
        return `
            <div class="opportunity-item ${priority}" data-id="${opp.id}">
                <div class="opp-header">
                    <span class="opp-profit">$${parseFloat(opp.net_profit).toFixed(2)}</span>
                    <span class="opp-roi">${priorityEmoji} ${parseFloat(opp.roi_percent).toFixed(0)}% ROI</span>
                </div>
                <div class="opp-details">
                    <span class="opp-contract">${contractShort}</span> • 
                    Confiança: ${(opp.confidence * 100).toFixed(0)}% • 
                    ${opp.action_type === 'auto_execute' ? '🤖 AUTO' : '👁️ REVIEW'}
                </div>
            </div>
        `;
    }).join('');
    
    // Adicionar click handlers
    document.querySelectorAll('.opportunity-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.getAttribute('data-id');
            handleOpportunityClick(id);
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

async function handleRefresh() {
    elements.btnRefresh.textContent = '🔄 ATUALIZANDO...';
    elements.btnRefresh.disabled = true;
    
    try {
        const response = await chrome.runtime.sendMessage({ type: 'PING_SERVER' });
        
        if (response && response.connected) {
            showSuccess('Conectado ao servidor!');
        } else {
            showError('Servidor offline');
        }
        
        await loadState();
        
    } catch (err) {
        showError('Falha na atualização');
    } finally {
        elements.btnRefresh.textContent = '🔄 ATUALIZAR';
        elements.btnRefresh.disabled = false;
    }
}

async function handleClear() {
    if (!confirm('Limpar todo o histórico de oportunidades?')) {
        return;
    }
    
    try {
        await chrome.runtime.sendMessage({ type: 'CLEAR_OPPORTUNITIES' });
        await loadState();
        showSuccess('Histórico limpo!');
        
    } catch (err) {
        showError('Falha ao limpar');
    }
}

function handleOpportunityClick(id) {
    console.log('🦁 [GXEON-PREDATOR] Oportunidade selecionada:', id);
    
    // Buscar detalhes completos
    chrome.runtime.sendMessage({ type: 'GET_OPPORTUNITIES' }, (response) => {
        const opp = response.opportunities.find(o => o.id === id);
        
        if (opp) {
            // Abrir detalhes em nova aba ou mostrar modal
            chrome.tabs.create({
                url: `https://debank.com/profile/${opp.contract}`
            });
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICAÇÕES VISUAIS
// ═══════════════════════════════════════════════════════════════════════════

function showSuccess(message) {
    // Criar toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #00FF00;
        color: #000;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;
    toast.textContent = `✅ ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

function showError(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #FF4444;
        color: #fff;
        padding: 10px 20px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 1000;
    `;
    toast.textContent = `❌ ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}
