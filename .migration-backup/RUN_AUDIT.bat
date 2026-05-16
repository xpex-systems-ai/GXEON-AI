@echo off
cd /d "c:\Users\P-c\Documents\xzeon-xpex-1"
node scripts/final_monetization_audit.js > audit_output.txt 2>&1
echo Audit completo. Verifique audit_output.txt
