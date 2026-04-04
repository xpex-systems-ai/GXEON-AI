const { execSync } = require('child_process');
const path = require('path');

const cwd = 'c:\\Users\\P-c\\Documents\\xzeon-xpex-1';

const commands = [
  'git add package-lock.json',
  'git commit -m "fix: sync package-lock.json for railway deploy"',
  'git push origin runtime-hardening',
  'git checkout main',
  'git merge runtime-hardening --no-ff -m "deploy: merge runtime-hardening fixes for railway"',
  'git push origin main'
];

console.log('🚀 EXECUTANDO DEPLOY AUTOMATICO...\n');

for (let i = 0; i < commands.length; i++) {
  const cmd = commands[i];
  console.log(`[${i + 1}/${commands.length}] ${cmd}`);
  try {
    const result = execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' });
    console.log(result);
  } catch (error) {
    console.error(`❌ ERRO: ${error.message}`);
    console.log(error.stdout?.toString() || '');
    console.log(error.stderr?.toString() || '');
  }
}

console.log('\n✅ PROCESSO CONCLUIDO!');
console.log('Railway vai detectar o push para main e fazer deploy automaticamente.');
