#!/bin/bash
# 🚀 PRIMEIRA VENDA - GXEON DATA ENGINE

echo "🌙 GXEON HYBRID DATA ENGINE - Venda Demo"
echo "==========================================="
echo ""

# 1. Mostrar o que está disponível (free)
echo "1. Testando endpoint FREE:"
curl -s "https://gxeon-core.up.railway.app/v1/leads/free?query=tech&location=São%20Paulo" | jq '.leads | length'
echo "   leads encontrados (preview limitado)"
echo ""

# 2. Mostrar paywall
echo "2. Testando endpoint PAID (sem API key):"
curl -s "https://gxeon-core.up.railway.app/v1/leads" | jq '.error'
echo "   → Retorna erro 401 (API key required)"
echo ""

# 3. Registrar cliente
echo "3. Registrando cliente de teste:"
CLIENTE=$(curl -s -X POST "https://gxeon-core.up.railway.app/v1/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@gxeon.ai","name":"Demo","tier":"BASIC"}')
echo $CLIENTE | jq '.actor.code'
echo ""

echo "💎 PRÓXIMO PASSO: Cliente recebe PIX e paga R$ 29.90"
echo "   Após pagamento, API key ativa automaticamente!"
