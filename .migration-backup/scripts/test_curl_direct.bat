@echo off
echo ================================================================
echo  GXEON — Teste CURL direto ao PostgREST
echo ================================================================
echo.

set "SUPABASE_URL=https://uzqabkixgbbqwcjfvnma.supabase.co"
set "SUPABASE_KEY=%SUPABASE_SERVICE_ROLE_KEY%"

echo [TEST 1] Listando tabelas via REST API...
curl -s -X GET "%SUPABASE_URL%/rest/v1/" -H "apikey: %SUPABASE_KEY%" -H "Authorization: Bearer %SUPABASE_KEY%" | findstr "users billing"
echo.

echo [TEST 2] Tentando acessar users diretamente...
curl -s -X GET "%SUPABASE_URL%/rest/v1/users?limit=1" -H "apikey: %SUPABASE_KEY%" -H "Authorization: Bearer %SUPABASE_KEY%"
echo.

echo [TEST 3] Tentando RPC...
curl -s -X POST "%SUPABASE_URL%/rest/v1/rpc/deduct_credits_atomic" -H "apikey: %SUPABASE_KEY%" -H "Authorization: Bearer %SUPABASE_KEY%" -H "Content-Type: application/json" -d "{\"p_api_key\":\"test\",\"p_amount\":0.01,\"p_operation\":\"/test\",\"p_request_id\":\"test-001\"}"
echo.

echo ================================================================
echo  Teste concluido
echo ================================================================
