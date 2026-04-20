/**
 * 🌑 GXEON SYSTEM AUDITOR — Ethers v6 Syntax Verification
 * 
 * Verifica:
 * - Sintaxe Ethers v6 em todos os módulos
 * - Hardcoded treasury address em contratos
 * - ESM module compliance
 * - Dependências críticas
 * 
 * Arquiteto: Júnior Sena — Sovereign AI Architect
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🎯 Configurações de auditoria
const CONFIG = {
  treasuryAddress: '0x3955d559055DadB7067054cB6E6f974710345224',
  ethersV6Patterns: [
    'ethers.getDefaultProvider',
    'ethers.JsonRpcProvider',
    'ethers.WebSocketProvider',
    'ethers.Contract',
    'ethers.Wallet',
    'ethers.parseEther',
    'ethers.formatEther',
    'ethers.parseUnits',
    'ethers.formatUnits',
    'ethers.keccak256',
    'ethers.toUtf8Bytes',
    'ethers.AbiCoder',
    'ethers.TransactionReceipt'
  ],
  ethersV6AntiPatterns: [
    'ethers.providers.JsonRpcProvider',  // v5 pattern
    'ethers.utils.parseEther',           // v5 pattern
    'ethers.utils.formatEther',          // v5 pattern
    'ethers.BigNumber',                  // v5 pattern
    'provider.getGasPrice',              // v5 pattern (use getFeeData)
    'provider.getNetwork',                 // v5 pattern
  ],
  criticalFiles: [
    'server/services/flashSweeper.js',
    'server/services/radarShix.js',
    'server/index.js',
    'core/autonolas_agent.js',
    'scripts/deploy_executor_contract.js'
  ],
  contractFiles: [
    'contracts/GXeonSovereignExecutor.sol',
    'contracts/GXeonSettlement.sol',
    'contracts/GXeonMainnetVault.sol',
    'contracts/GXEonAaveFlashReceiver.sol'
  ]
};

// 📝 Resultados da auditoria
const auditResults = {
  timestamp: new Date().toISOString(),
  architect: 'Júnior Sena — Sovereign AI Architect',
  treasury: CONFIG.treasuryAddress,
  status: 'PENDING',
  checks: {
    ethersV6: [],
    treasuryHardcoded: [],
    esmCompliance: [],
    dependencies: [],
    contracts: []
  },
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0
  }
};

/**
 * 🔍 Verificar sintaxe Ethers v6
 */
async function checkEthersV6Syntax(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { file: filePath, status: 'SKIPPED', reason: 'File not found' };
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const issues = [];
  
  // Verificar anti-padrões (v5)
  CONFIG.ethersV6AntiPatterns.forEach(pattern => {
    if (content.includes(pattern)) {
      issues.push({
        type: 'ERROR',
        pattern,
        message: `Ethers v5 pattern detected: ${pattern}. Migrate to Ethers v6.`
      });
    }
  });
  
  // Verificar padrões v6
  let v6PatternCount = 0;
  CONFIG.ethersV6Patterns.forEach(pattern => {
    if (content.includes(pattern)) {
      v6PatternCount++;
    }
  });
  
  // Verificar imports Ethers v6
  const hasV6Import = content.includes('ethers') && 
    (content.includes('from \'ethers\'') || content.includes('from "ethers"'));
  
  const result = {
    file: filePath,
    status: issues.length > 0 ? 'FAILED' : 'PASSED',
    v6Patterns: v6PatternCount,
    hasV6Import,
    issues
  };
  
  if (issues.length > 0) {
    auditResults.summary.failed++;
  } else {
    auditResults.summary.passed++;
  }
  
  return result;
}

/**
 * 🔐 Verificar treasury hardcoded
 */
async function checkTreasuryHardcoded(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { file: filePath, status: 'SKIPPED', reason: 'File not found' };
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const hasTreasury = content.includes(CONFIG.treasuryAddress);
  const has70_30 = content.includes('70') && content.includes('30');
  
  const result = {
    file: filePath,
    status: hasTreasury ? 'VERIFIED' : 'MISSING',
    treasuryFound: hasTreasury,
    splitFound: has70_30,
    address: hasTreasury ? CONFIG.treasuryAddress : null
  };
  
  if (!hasTreasury) {
    auditResults.summary.warnings++;
  }
  
  return result;
}

/**
 * 📦 Verificar ESM compliance
 */
async function checkESMCompliance() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const checks = {
    typeModule: packageJson.type === 'module',
    mainEntry: packageJson.main === 'server/index.js',
    engines: packageJson.engines?.node?.includes('20'),
    dependencies: {
      ethers: packageJson.dependencies?.ethers?.startsWith('6'),
      hardhat: packageJson.dependencies?.hardhat?.startsWith('2') || packageJson.devDependencies?.hardhat?.startsWith('2')
    }
  };
  
  const allPassed = Object.values(checks).every(v => 
    typeof v === 'boolean' ? v : Object.values(v).every(Boolean)
  );
  
  return {
    status: allPassed ? 'PASSED' : 'FAILED',
    checks
  };
}

/**
 * ⛓️ Verificar contratos Solidity
 */
async function checkSolidityContracts() {
  const results = [];
  
  for (const contractFile of CONFIG.contractFiles) {
    const fullPath = path.join(__dirname, '..', contractFile);
    
    if (!fs.existsSync(fullPath)) {
      results.push({ file: contractFile, status: 'NOT_FOUND' });
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Verificar treasury
    const hasTreasury = content.includes(CONFIG.treasuryAddress);
    
    // Verificar pragma
    const pragmaMatch = content.match(/pragma solidity \^(\d+\.\d+\.\d+)/);
    const solidityVersion = pragmaMatch ? pragmaMatch[1] : 'unknown';
    
    // Verificar licença
    const hasLicense = content.includes('SPDX-License-Identifier') || content.includes('Private Enterprise License');
    
    // Verificar OpenZeppelin imports
    const hasOZ = content.includes('@openzeppelin');
    
    results.push({
      file: contractFile,
      status: 'OK',
      solidityVersion,
      hasTreasury,
      hasLicense,
      hasOpenZeppelin: hasOZ,
      lines: content.split('\n').length
    });
  }
  
  return results;
}

/**
 * 🚀 Executar auditoria completa
 */
async function runAudit() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           🌑 GXEON SYSTEM AUDITOR — SUPREME SYNC                 ║');
  console.log('║              Ethers v6 Syntax Verification                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`👑 Architect: ${auditResults.architect}`);
  console.log(`🏦 Treasury: ${auditResults.treasury}`);
  console.log(`⏱️  Started: ${auditResults.timestamp}`);
  console.log('');
  
  // 1. Verificar Ethers v6 syntax
  console.log('🔍 [1/5] Checking Ethers v6 Syntax...');
  for (const file of CONFIG.criticalFiles) {
    const result = await checkEthersV6Syntax(file);
    auditResults.checks.ethersV6.push(result);
    const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
    console.log(`  ${icon} ${file} — ${result.status} (${result.v6Patterns || 0} v6 patterns)`);
    
    if (result.issues && result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`     ⚠️  ${issue.message}`);
      });
    }
  }
  console.log('');
  
  // 2. Verificar treasury hardcoded
  console.log('🔐 [2/5] Verifying Treasury Hardcoded...');
  for (const file of [...CONFIG.criticalFiles, ...CONFIG.contractFiles]) {
    const result = await checkTreasuryHardcoded(file);
    auditResults.checks.treasuryHardcoded.push(result);
    const icon = result.status === 'VERIFIED' ? '✅' : result.status === 'MISSING' ? '⚠️' : '⏭️';
    console.log(`  ${icon} ${file} — ${result.status}`);
  }
  console.log('');
  
  // 3. Verificar ESM compliance
  console.log('📦 [3/5] Checking ESM Compliance...');
  const esmResult = await checkESMCompliance();
  auditResults.checks.esmCompliance = [esmResult];
  console.log(`  ${esmResult.status === 'PASSED' ? '✅' : '❌'} package.json ESM compliance`);
  console.log(`     • type: "module": ${esmResult.checks.typeModule ? '✅' : '❌'}`);
  console.log(`     • Node.js >=20: ${esmResult.checks.engines ? '✅' : '❌'}`);
  console.log(`     • Ethers v6: ${esmResult.checks.dependencies.ethers ? '✅' : '❌'}`);
  console.log('');
  
  // 4. Verificar contratos
  console.log('⛓️  [4/5] Auditing Solidity Contracts...');
  const contractResults = await checkSolidityContracts();
  auditResults.checks.contracts = contractResults;
  contractResults.forEach(result => {
    const icon = result.status === 'OK' ? '✅' : '❌';
    console.log(`  ${icon} ${result.file}`);
    console.log(`     • Solidity: ${result.solidityVersion}`);
    console.log(`     • Treasury: ${result.hasTreasury ? '✅' : '❌'}`);
    console.log(`     • License: ${result.hasLicense ? '✅' : '❌'}`);
    console.log(`     • Lines: ${result.lines || 'N/A'}`);
  });
  console.log('');
  
  // 5. Verificar dependências
  console.log('📋 [5/5] Checking Dependencies...');
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const criticalDeps = ['ethers', 'hardhat', '@supabase/supabase-js', 'alchemy-sdk'];
    criticalDeps.forEach(dep => {
      const hasDep = !!deps[dep];
      const version = deps[dep] || 'not installed';
      console.log(`  ${hasDep ? '✅' : '❌'} ${dep}: ${version}`);
    });
    
    auditResults.checks.dependencies.push({
      status: 'OK',
      totalDeps: Object.keys(deps).length
    });
  } catch (e) {
    console.log('  ❌ Error reading package.json');
    auditResults.checks.dependencies.push({ status: 'ERROR', error: e.message });
  }
  console.log('');
  
  // Summary
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                      AUDIT SUMMARY                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ PASSED: ${auditResults.summary.passed}`);
  console.log(`❌ FAILED: ${auditResults.summary.failed}`);
  console.log(`⚠️  WARNINGS: ${auditResults.summary.warnings}`);
  console.log('');
  
  const overallStatus = auditResults.summary.failed === 0 ? 'SUPREME_SYNC_READY' : 'ISSUES_DETECTED';
  auditResults.status = overallStatus;
  
  console.log(`🌑 OVERALL STATUS: ${overallStatus}`);
  console.log('');
  
  if (overallStatus === 'SUPREME_SYNC_READY') {
    console.log('✨ System is ready for Production Deployment!');
    console.log('🚀 Sovereign Mode Active — Ready for GitHub push');
  } else {
    console.log('⚠️  Please fix the issues above before deployment.');
  }
  
  console.log('');
  console.log(`🏦 Treasury: ${CONFIG.treasuryAddress}`);
  console.log('👑 Júnior Sena — Sovereign AI Architect');
  console.log('🌑 GXEON Nexus v4.0');
  
  // Salvar relatório
  const reportPath = path.join(__dirname, '..', 'audit', `supreme_sync_audit_${Date.now()}.json`);
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  console.log('');
  console.log(`📄 Audit report saved to: ${reportPath}`);
  
  return auditResults;
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
  runAudit().catch(console.error);
}

export { runAudit, checkEthersV6Syntax, checkTreasuryHardcoded };
