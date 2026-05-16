#!/bin/bash
# 🧠 GXEON SMART ENGINE - Teste Rápido

API_BASE="https://gxeon-core.up.railway.app"

echo ""
echo "🧠 GXEON SMART ENGINE v1.0 - Teste Rápido"
echo "=========================================="
echo ""

# Teste 1: Free endpoint
echo "1️⃣  Testando endpoint FREE..."
echo "   Request: /v1/leads/smart-free?query=tech&location=São%20Paulo"
RESPONSE=$(curl -s "${API_BASE}/v1/leads/smart-free?query=tech&location=São%20Paulo" 2>/dev/null | head -c 500)
echo "   Response: ${RESPONSE}"
echo ""

# Teste 2: Paid endpoint (sem key = paywall)
echo "2️⃣  Testando endpoint PAID (paywall)..."
echo "   Request: /v1/leads/smart?query=tech&location=São%20Paulo"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/v1/leads/smart?query=tech&location=São%20Paulo" 2>/dev/null)
echo "   HTTP Status: ${STATUS} (esperado: 402 Payment Required)"
echo ""

# Teste 3: Docs
echo "3️⃣  Testando documentação..."
echo "   Request: /v1/leads/smart/docs"
DOCS=$(curl -s "${API_BASE}/v1/leads/smart/docs" 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
echo "   Engine: ${DOCS}"
echo ""

echo "✅ Teste completo!"
echo ""
echo "🔗 Links:"
echo "   Free:  ${API_BASE}/v1/leads/smart-free?query=restaurant&location=São%20Paulo"
echo "   Paid:  ${API_BASE}/v1/leads/smart?query=restaurant&location=São%20Paulo"
echo "   Docs:  ${API_BASE}/v1/leads/smart/docs"
echo ""
