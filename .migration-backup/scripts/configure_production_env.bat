@echo off
chcp 65001 >nul
REM ═══════════════════════════════════════════════════════════════════════════
REM GXEON Production Environment Configuration
REM Configure Railway with production credentials
REM ═══════════════════════════════════════════════════════════════════════════

echo 🌑 ═══════════════════════════════════════════════════════════════
echo    GXEON PRODUCTION ENV CONFIGURATION
echo ════════════════════════════════════════════════════════════════════
echo.

REM Verificar se railway CLI está instalado
where railway >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Railway CLI não encontrado
    echo 💡 Instale com: npm install -g @railway/cli
    exit /b 1
)

echo 🔐 Configurando variáveis de ambiente no Railway...
echo.

REM MercadoPago Production Credentials
echo 💳 Configurando MercadoPago...
railway variables set MERCADO_PAGO_ACCESS_TOKEN="APP_USR-2983592158025492-020720-f9926d8ddbda4138d33fec6165d89ce6-173807688"
railway variables set PIX_RECEIVER_KEY="6d7601d8-c20d-4057-99de-b84c8e55aa30"
railway variables set MP_CLIENT_ID="2983592158025492"
railway variables set MP_CLIENT_SECRET="99WUiSqAEMTNt6mCoGjCYvZeritlJpHx"
railway variables set MP_PUBLIC_KEY="APP_USR-565608d2-c119-4af8-9c1c-a9b20107e923"

REM Supabase Credentials
echo 🗄️  Configurando Supabase...
railway variables set SUPABASE_PROJECT_URL="https://telxvphgrsvsnxvmjkce.supabase.co"
railway variables set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbHh2cGhncnN2c254dm1qa2NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNjMzMSwiZXhwIjoyMDkwMTAyMzMxfQ.297P1WLrSDqiRWtyUk5OuLoLvAU99zy53_HodleZQkA"

REM Webhook URL (ajustar para seu domínio)
echo 📡 Configurando Webhook...
railway variables set MP_NOTIFICATION_URL="https://gxeon.railway.app/v1/webhook/mercadopago"

REM Telegram (manter existente ou configurar)
echo 📱 Configurando Telegram...
railway variables set TELEGRAM_BOT_TOKEN="8659197490:AAG-4X50tQahi0mnngfSeUyi49fpr1sDjBk"
railway variables set TELEGRAM_CHAT_ID="8506789322"

REM Production Settings
echo ⚙️  Configurando ambiente...
railway variables set NODE_ENV="production"
railway variables set TREASURY_LOCK="true"
railway variables set PROFIT_DESTINATION="0x3955d559055DadB7067054cB6E6f974710345224"

echo.
echo ✅ Variáveis configuradas com sucesso!
echo.
echo 🚀 Próximo passo:
echo    railway up
echo.
echo 📋 Verifique as variáveis:
echo    railway variables
echo.

pause
