"""
═══════════════════════════════════════════════════════════════════════════════
GXEON LIGHTHOUSE SIGNAL PROVIDER v3.0 — M2M Alpha Broadcast
═══════════════════════════════════════════════════════════════════════════════

Arquitetura: Zero-Gas Signal Station
Protocolo: M2M_ALPHA_BROADCAST
Entrega: FastAPI WebSocket Stream

O radar detecta, o farol transmite, os clientes consomem.
Monetização: Pay-per-signal / Subscription tier

Comandante: Júnior Sena
Beneficiário: 0x3955d559055DadB7067054cB6E6f974710345224
═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
import json
import time
import hashlib
import os
from datetime import datetime, timezone
from typing import Dict, Set, Optional, List, Any
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Supabase for hard auth validation (ENF-003)
from supabase import create_client as create_supabase_client

# ═══════════════════════════════════════════════════════════════════════════════
# SUPABASE CLIENT (Hard Auth)
# ═══════════════════════════════════════════════════════════════════════════════
supabase_url = os.environ.get('SUPABASE_PROJECT_URL') or os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
supabase = None
if supabase_url and supabase_key:
    try:
        supabase = create_supabase_client(supabase_url, supabase_key)
        print(f"🔐 [SIGNAL_SERVER] Supabase conectado para hard auth")
    except Exception as e:
        print(f"⚠️ [SIGNAL_SERVER] Erro ao conectar Supabase: {e}")

async def validate_api_key_hard_auth(api_key: str) -> Optional[str]:
    """
    ENF-003: Hard auth validation against Supabase
    Returns tier if valid, None if invalid
    """
    if not supabase:
        print("🚫 [SIGNAL_SERVER] Supabase offline - nenhuma conexão autorizada")
        return None
    
    try:
        # Consulta usuário na tabela gxeon_users
        response = supabase.table('gxeon_users') \
            .select('tier, balance_credits, status') \
            .eq('api_key', api_key) \
            .eq('status', 'active') \
            .single() \
            .execute()
        
        if not response.data:
            print(f"🚫 [SIGNAL_SERVER] API Key não encontrada ou inativa")
            return None
        
        user = response.data
        
        tier = user.get('tier', 'basic')
        
        # SG-005: ZERO_FREE_STREAM_POLICY - Block free tier explicitly
        if tier == 'free':
            print(f"🚫 [SIGNAL_SERVER] FREE_TIER_BLOCKED: {api_key[:8]}... | Upgrade required")
            return None
        
        # Verifica se tem créditos suficientes (mínimo $0.01)
        if user.get('balance_credits', 0) <= 0:
            print(f"🚫 [SIGNAL_SERVER] API Key sem créditos: {api_key[:8]}...")
            return None
        
        print(f"✅ [SIGNAL_SERVER] Auth OK: tier={tier}, credits={user.get('balance_credits')}")
        return tier
        
    except Exception as e:
        print(f"🚫 [SIGNAL_SERVER] Erro na validação: {e}")
        return None

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SignalPacket:
    """Pacote de sinal MEV otimizado para transmissão de alta velocidade"""
    signal_id: str
    timestamp: str
    source: str
    
    # Dados da oportunidade
    opportunity_type: str  # 'NEW_POOL', 'SMART_MONEY', 'LIQUIDITY_SPIKE'
    chain: str
    dex: str
    pool_address: str
    token_a: str
    token_b: str
    
    # Métricas financeiras
    liquidity_usd: float
    volume_24h: float
    estimated_profit_usd: float
    confidence_score: float  # 0.0 - 1.0
    
    # Dados técnicos
    block_number: Optional[int] = None
    tx_hash: Optional[str] = None
    gas_estimate: Optional[int] = None
    
    # Metadados para consumidor
    priority: str = 'normal'  # 'low', 'normal', 'high', 'critical'
    ttl_seconds: int = 300  # Time-to-live
    
    # SG-004: REAL_TIME_MONETIZATION_BINDING
    billing_gate: Optional[Dict[str, Any]] = None  # Billing metadata structure
    
    def to_json(self) -> str:
        return json.dumps(asdict(self), default=str)
    
    def to_dict(self) -> dict:
        return asdict(self)

@dataclass
class ConsumerSession:
    """Sessão de consumidor M2M"""
    client_id: str
    api_key: str
    tier: str  # 'free', 'basic', 'premium', 'enterprise'
    connected_at: datetime
    signals_consumed: int = 0
    last_signal_at: Optional[datetime] = None
    filters: Dict[str, Any] = None

# ═══════════════════════════════════════════════════════════════════════════════
# SIGNAL BROADCAST ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class SignalBroadcastEngine:
    """Motor de broadcast de alta fidelidade — Zero Gas, Infinite Uptime"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.consumer_sessions: Dict[str, ConsumerSession] = {}
        self.signal_history: List[SignalPacket] = []
        self.metrics = {
            'total_signals_broadcast': 0,
            'total_consumers_connected': 0,
            'signals_by_tier': {'free': 0, 'basic': 0, 'premium': 0, 'enterprise': 0},
            'potential_profit_broadcast': 0.0,
            'blocked_unauthorized_signals': 0,  # ENF-005: Grafana metric
            'revenue_per_signal_usd': 0.0,       # ENF-005: Revenue tracking
            'start_time': datetime.now(timezone.utc)
        }
        self.rate_limits = {
            'free': 0,       # SG-005: ZERO_FREE_STREAM_POLICY - No signals for free tier
            'basic': 60,     # 60 sinais/min
            'premium': 300,  # 300 sinais/min
            'enterprise': 0  # Unlimited
        }
        
    def record_blocked_signal(self, reason: str = 'unauthorized'):
        """ENF-005: Track blocked signals for Grafana"""
        self.metrics['blocked_unauthorized_signals'] += 1
        print(f"🚫 [METRICS] Signal blocked: {reason} | Total: {self.metrics['blocked_unauthorized_signals']}")
        
    async def connect(self, websocket: WebSocket, client_id: str, api_key: str, tier: str = 'free'):
        """Aceita conexão WebSocket e registra consumidor"""
        await websocket.accept()
        
        session = ConsumerSession(
            client_id=client_id,
            api_key=api_key,
            tier=tier,
            connected_at=datetime.now(timezone.utc),
            filters={'min_liquidity': 10000, 'min_profit': 0.5} if tier == 'free' else {}
        )
        
        self.active_connections[client_id] = websocket
        self.consumer_sessions[client_id] = session
        self.metrics['total_consumers_connected'] += 1
        
        print(f"🔌 [SIGNAL_SERVER] Cliente conectado: {client_id} (tier: {tier})")
        
        # Envia handshake de boas-vindas
        await websocket.send_json({
            'event': 'CONNECTED',
            'client_id': client_id,
            'tier': tier,
            'rate_limit': self.rate_limits[tier],
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    def disconnect(self, client_id: str):
        """Remove conexão ativa"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        session = self.consumer_sessions.get(client_id)
        if session:
            duration = (datetime.now(timezone.utc) - session.connected_at).total_seconds()
            print(f"🔌 [SIGNAL_SERVER] Cliente desconectado: {client_id} "
                  f"(sinais: {session.signals_consumed}, duração: {duration:.0f}s)")
            
    async def broadcast_signal(self, signal: SignalPacket):
        """Transmite sinal para todos os consumidores ativos
        
        SG-001: HARD_BILLING_GATE - Requires billing validation
        Failure Mode: billing_down = BLOCK_ALL_SIGNAL_OUTPUT
        """
        # SG-001: BLOCK_ALL_SIGNAL_OUTPUT if billing system unavailable
        if not supabase:
            print(f"🚫 [SIGNAL_SERVER] SIGNAL BLOCKED: Billing system offline | Signal: {signal.signal_id}")
            self.record_blocked_signal('billing_system_offline')
            return
        
        # SG-001: Require billing_gate metadata
        if not signal.billing_gate or not signal.billing_gate.get('billing_required'):
            print(f"🚫 [SIGNAL_SERVER] SIGNAL BLOCKED: No billing metadata | Signal: {signal.signal_id}")
            self.record_blocked_signal('missing_billing_metadata')
            return
        
        self.signal_history.append(signal)
        self.metrics['total_signals_broadcast'] += 1
        self.metrics['potential_profit_broadcast'] += signal.estimated_profit_usd
        
        # Mantém histórico limitado (últimos 1000)
        if len(self.signal_history) > 1000:
            self.signal_history.pop(0)
        
        disconnected = []
        
        for client_id, websocket in self.active_connections.items():
            session = self.consumer_sessions.get(client_id)
            if not session:
                continue
                
            # Rate limiting por tier
            if self.rate_limits[session.tier] > 0:
                if session.signals_consumed >= self.rate_limits[session.tier]:
                    continue  # Skip rate-limited consumers
            
            # Aplica filtros do consumidor
            if session.filters:
                min_liq = session.filters.get('min_liquidity', 0)
                min_profit = session.filters.get('min_profit', 0)
                if signal.liquidity_usd < min_liq or signal.estimated_profit_usd < min_profit:
                    continue
            
            try:
                await websocket.send_json(signal.to_dict())
                session.signals_consumed += 1
                session.last_signal_at = datetime.now(timezone.utc)
                self.metrics['signals_by_tier'][session.tier] += 1
                
            except Exception as e:
                disconnected.append(client_id)
                
        # Limpa conexões mortas
        for client_id in disconnected:
            self.disconnect(client_id)
            
        print(f"📡 [SIGNAL_SERVER] Sinal {signal.signal_id} → "
              f"{len(self.active_connections) - len(disconnected)} consumidores")
              
    def get_metrics(self) -> dict:
        """Retorna métricas de broadcast para Grafana/Dashboard
        
        ENF-005: Real revenue metrics for Grafana
        """
        uptime = (datetime.now(timezone.utc) - self.metrics['start_time']).total_seconds()
        total_signals = self.metrics['total_signals_broadcast']
        blocked = self.metrics['blocked_unauthorized_signals']
        
        # Calculate signal conversion rate (authorized vs blocked)
        authorized = total_signals
        total_attempts = authorized + blocked
        conversion_rate = authorized / max(1, total_attempts)
        
        return {
            'uptime_seconds': uptime,
            'active_connections': len(self.active_connections),
            'total_signals_broadcast': total_signals,
            'total_consumers_ever': self.metrics['total_consumers_connected'],
            'potential_profit_broadcast': round(self.metrics['potential_profit_broadcast'], 2),
            'signals_by_tier': self.metrics['signals_by_tier'],
            'avg_profit_per_signal': round(
                self.metrics['potential_profit_broadcast'] / max(1, total_signals), 2
            ),
            # ENF-005: Revenue metrics
            'revenue_per_signal_usd': round(self.metrics['revenue_per_signal_usd'], 4),
            'blocked_unauthorized_signals': blocked,
            'signal_conversion_rate': round(conversion_rate, 4),
            'enforcement_version': 'GXZ1_v1.0',
            'policy': 'STRICT_NO_FAIL_OPEN'
        }

# ═══════════════════════════════════════════════════════════════════════════════
# FASTAPI APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════

# Engine global
engine = SignalBroadcastEngine()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan manager para startup/shutdown"""
    print("🚀 [SIGNAL_SERVER] Lighthouse Signal Provider iniciado")
    print("📡 [SIGNAL_SERVER] Zero-Gas Architecture Active")
    print("💰 [SIGNAL_SERVER] M2M Billing Layer Ready")
    yield
    print("🛑 [SIGNAL_SERVER] Desligando...")

app = FastAPI(
    title="GXEON Lighthouse Signal Provider",
    description="M2M Alpha Broadcast — Zero-Gas Signal Station",
    version="3.0.0",
    lifespan=lifespan
)

# CORS para integração web/dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """Status do Signal Provider"""
    return {
        "name": "GXEON Lighthouse Signal Provider",
        "version": "3.0.0",
        "architecture": "M2M_ALPHA_BROADCAST",
        "gas_constraint": "STRICT_ZERO_ETH",
        "status": "operational",
        "beneficiary": "0x3955d559055DadB7067054cB6E6f974710345224"
    }

@app.get("/health")
async def health():
    """Health check para monitoring"""
    return {
        "status": "healthy",
        "active_connections": len(engine.active_connections),
        "uptime": engine.get_metrics()['uptime_seconds']
    }

@app.get("/metrics")
async def metrics():
    """Métricas para Grafana dashboard"""
    return engine.get_metrics()

@app.get("/signals/history")
async def signal_history(limit: int = 100):
    """Histórico de sinais recentes (para debug/análise)"""
    history = engine.signal_history[-limit:]
    return {
        "count": len(history),
        "signals": [s.to_dict() for s in history]
    }

@app.websocket("/ws/signals")
async def websocket_signals(websocket: WebSocket):
    """Endpoint principal: Stream de sinais MEV em tempo real
    
    ENF-003: HARD_AUTH_REQUIRED - No fallback access
    """
    # HARD AUTH: API Key obrigatória
    api_key = websocket.headers.get('x-api-key') or websocket.headers.get('x-gxeon-key')
    client_id = websocket.headers.get('x-client-id')
    
    # STRICT: Sem API Key = DENY (no fallback)
    if not api_key:
        print(f"🚫 [SIGNAL_SERVER] CONEXÃO RECUSADA: API Key ausente")
        await websocket.close(code=4001, reason="GXEON_AUTH_REQUIRED: API Key obrigatória")
        return
    
    if not client_id:
        client_id = f"client_{hashlib.sha256(api_key.encode()).hexdigest()[:12]}"
    
    # VALIDAR contra Supabase (hard auth)
    tier = await validate_api_key_hard_auth(api_key)
    
    if not tier:
        print(f"🚫 [SIGNAL_SERVER] CONEXÃO RECUSADA: API Key inválida - {client_id}")
        await websocket.close(code=4002, reason="GXEON_INVALID_KEY: API Key inválida ou sem créditos")
        return
    
    print(f"✅ [SIGNAL_SERVER] CONEXÃO AUTORIZADA: {client_id} (tier: {tier})")
    await engine.connect(websocket, client_id, api_key, tier)
    
    try:
        while True:
            # Mantém conexão viva e escuta comandos do cliente
            data = await websocket.receive_text()
            try:
                command = json.loads(data)
                
                # Cliente pode ajustar filtros em runtime
                if command.get('action') == 'set_filters':
                    session = engine.consumer_sessions.get(client_id)
                    if session:
                        session.filters = command.get('filters', {})
                        await websocket.send_json({
                            'event': 'FILTERS_UPDATED',
                            'filters': session.filters
                        })
                        
                elif command.get('action') == 'get_stats':
                    await websocket.send_json({
                        'event': 'STATS',
                        'data': engine.get_metrics()
                    })
                    
            except json.JSONDecodeError:
                pass  # Ignora mensagens inválidas
                
    except WebSocketDisconnect:
        engine.disconnect(client_id)

@app.websocket("/ws/radar")
async def websocket_radar_input(websocket: WebSocket):
    """Endpoint para receber sinais do radar SHIX (input privado)"""
    await websocket.accept()
    print("🔌 [SIGNAL_SERVER] Radar SHIX conectado ao input stream")
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                opportunity = json.loads(data)
                
                # Converte oportunidade do radar em SignalPacket
                signal = SignalPacket(
                    signal_id=opportunity.get('id') or f"sig_{int(time.time() * 1000)}",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    source='RADAR_SHIX',
                    opportunity_type=opportunity.get('type', 'UNKNOWN'),
                    chain=opportunity.get('chain', 'arbitrum'),
                    dex=opportunity.get('dex', 'unknown'),
                    pool_address=opportunity.get('poolAddress', ''),
                    token_a=opportunity.get('tokenA', ''),
                    token_b=opportunity.get('tokenB', ''),
                    liquidity_usd=opportunity.get('liquidityUsd', 0),
                    volume_24h=opportunity.get('volume24h', 0),
                    estimated_profit_usd=opportunity.get('profitUsd', 0),
                    confidence_score=opportunity.get('confidence', 0.7),
                    block_number=opportunity.get('blockNumber'),
                    tx_hash=opportunity.get('txHash'),
                    gas_estimate=150000,
                    priority=opportunity.get('priority', 'normal'),
                    ttl_seconds=300
                )
                
                # Broadcast para todos os consumidores
                await engine.broadcast_signal(signal)
                
            except json.JSONDecodeError:
                print(f"⚠️ [SIGNAL_SERVER] JSON inválido recebido do radar")
                
    except WebSocketDisconnect:
        print("🔌 [SIGNAL_SERVER] Radar SHIX desconectado")

# ═══════════════════════════════════════════════════════════════════════════════
# CLI ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════════════════╗
    ║  🌑 GXEON LIGHTHOUSE SIGNAL PROVIDER v3.0 — M2M Alpha Broadcast            ║
    ╠══════════════════════════════════════════════════════════════════════════╣
    ║  Architecture: Zero-Gas Signal Station                                 ║
    ║  Protocol: M2M_ALPHA_BROADCAST                                           ║
    ║  Endpoints: /ws/signals (consumers) | /ws/radar (input)                  ║
    ║  Metrics: /metrics | /health                                             ║
    ║  Beneficiary: 0x3955d559055DadB7067054cB6E6f974710345224               ║
    ╚══════════════════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "signalServer:app",
        host="0.0.0.0",
        port=8765,
        reload=False,
        log_level="info"
    )
