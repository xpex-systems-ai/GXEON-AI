@echo off
cd /d "c:\Users\P-c\Documents\xzeon-xpex-1"
node scripts/sync_supreme_protocol.js 2>&1
echo.
echo Exit code: %errorlevel%
