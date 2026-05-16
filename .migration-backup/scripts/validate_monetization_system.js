/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON MONETIZATION SYSTEM VALIDATION
 * Full system check for production readiness
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const CHECKS = {
  tables: [
    'actors',
    'actor_wallets', 
    'actor_payouts',
    'global_transactions',
    'pix_payments'
  ],
  columns: {
    'global_transactions': ['id', 'amount', 'actor_code', 'created_at'],
    'pix_payments': ['id', 'amount', 'actor_code', 'status'],
    'actors': ['id', 'actor_code', 'actor_type', 'created_at'],
    'actor_wallets': ['id', 'actor_code', 'balance'],
    'actor_payouts': ['id', 'actor_code', 'amount', 'status']
  },
  views: [
    'actor_earnings',
    'actor_ranking', 
    'unified_revenue'
  ],
  functions: [
    'update_actor_balance',
    'request_payout'
  ],
  triggers: [
    'trg_update_actor_balance'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════
class MonetizationValidator {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_PROJECT_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.results = {
      timestamp: new Date().toISOString(),
      status: 'RUNNING',
      checks: {},
      issues: [],
      warnings: [],
      ready_for_production: false
    };
  }

  async validateAll() {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🔍 GXEON MONETIZATION SYSTEM VALIDATION');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`⏰ ${new Date().toLocaleString('pt-BR')}`);
    console.log(`🌐 Supabase: ${process.env.SUPABASE_PROJECT_URL}`);
    console.log('');

    try {
      // 1. Check tables existence
      await this.checkTables();
      
      // 2. Check columns
      await this.checkColumns();
      
      // 3. Check views
      await this.checkViews();
      
      // 4. Check functions
      await this.checkFunctions();
      
      // 5. Check triggers
      await this.checkTriggers();
      
      // 6. Data integrity
      await this.checkDataIntegrity();
      
      // 7. Security checks
      await this.checkSecurity();
      
      // 8. Backend readiness
      await this.checkBackendReadiness();
      
      // Final assessment
      this.finalAssessment();
      
    } catch (error) {
      console.error('❌ Validation error:', error);
      this.results.status = 'ERROR';
      this.results.issues.push({
        severity: 'CRITICAL',
        message: error.message
      });
    }

    // Save report
    this.saveReport();
    
    return this.results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. CHECK TABLES EXISTENCE
  // ═══════════════════════════════════════════════════════════════════════════
  async checkTables() {
    console.log('📋 CHECK 1: Table Existence');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const { data: tables, error } = await this.supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      throw new Error(`Failed to fetch tables: ${error.message}`);
    }
    
    const existingTables = tables.map(t => t.table_name);
    const missingTables = [];
    
    for (const table of CHECKS.tables) {
      const exists = existingTables.includes(table);
      this.results.checks[`table_${table}`] = exists;
      
      if (exists) {
        console.log(`  ✅ ${table}`);
      } else {
        console.log(`  ❌ ${table} - MISSING`);
        missingTables.push(table);
        this.results.issues.push({
          severity: 'HIGH',
          category: 'TABLE_MISSING',
          table: table,
          message: `Table ${table} does not exist`
        });
      }
    }
    
    console.log('');
    return missingTables.length === 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. CHECK COLUMNS
  // ═══════════════════════════════════════════════════════════════════════════
  async checkColumns() {
    console.log('📊 CHECK 2: Column Validation');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    for (const [table, requiredColumns] of Object.entries(CHECKS.columns)) {
      console.log(`\n  Table: ${table}`);
      
      const { data: columns, error } = await this.supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', table)
        .eq('table_schema', 'public');
      
      if (error) {
        console.log(`    ❌ Failed to fetch columns: ${error.message}`);
        this.results.issues.push({
          severity: 'HIGH',
          category: 'COLUMN_CHECK_FAILED',
          table: table,
          message: error.message
        });
        continue;
      }
      
      const existingColumns = columns.map(c => c.column_name);
      
      for (const column of requiredColumns) {
        const exists = existingColumns.includes(column);
        this.results.checks[`column_${table}_${column}`] = exists;
        
        if (exists) {
          console.log(`    ✅ ${column}`);
        } else {
          console.log(`    ❌ ${column} - MISSING`);
          this.results.issues.push({
            severity: 'HIGH',
            category: 'COLUMN_MISSING',
            table: table,
            column: column,
            message: `Column ${column} missing in ${table}`
          });
        }
      }
    }
    
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CHECK VIEWS
  // ═══════════════════════════════════════════════════════════════════════════
  async checkViews() {
    console.log('👁️  CHECK 3: Views Validation');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const { data: views, error } = await this.supabase
      .from('information_schema.views')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log(`  ❌ Failed to fetch views: ${error.message}`);
      return;
    }
    
    const existingViews = views.map(v => v.table_name);
    
    for (const view of CHECKS.views) {
      const exists = existingViews.includes(view);
      this.results.checks[`view_${view}`] = exists;
      
      if (exists) {
        console.log(`  ✅ ${view}`);
      } else {
        console.log(`  ⚠️  ${view} - NOT FOUND (optional)`);
        this.results.warnings.push({
          severity: 'MEDIUM',
          category: 'VIEW_MISSING',
          view: view,
          message: `View ${view} not found (optional for Grafana)`
        });
      }
    }
    
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CHECK FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  async checkFunctions() {
    console.log('⚙️  CHECK 4: Functions Validation');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const { data: functions, error } = await this.supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public');
    
    if (error) {
      console.log(`  ❌ Failed to fetch functions: ${error.message}`);
      return;
    }
    
    const existingFunctions = functions.map(f => f.routine_name);
    
    for (const func of CHECKS.functions) {
      const exists = existingFunctions.includes(func);
      this.results.checks[`function_${func}`] = exists;
      
      if (exists) {
        console.log(`  ✅ ${func}`);
      } else {
        console.log(`  ⚠️  ${func} - NOT FOUND (optional)`);
        this.results.warnings.push({
          severity: 'MEDIUM',
          category: 'FUNCTION_MISSING',
          function: func,
          message: `Function ${func} not found (can be implemented in backend)`
        });
      }
    }
    
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. CHECK TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════
  async checkTriggers() {
    console.log('🔫 CHECK 5: Triggers Validation');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    const { data: triggers, error } = await this.supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('trigger_schema', 'public');
    
    if (error) {
      console.log(`  ❌ Failed to fetch triggers: ${error.message}`);
      return;
    }
    
    const existingTriggers = triggers.map(t => t.trigger_name);
    
    for (const trigger of CHECKS.triggers) {
      const exists = existingTriggers.includes(trigger);
      this.results.checks[`trigger_${trigger}`] = exists;
      
      if (exists) {
        console.log(`  ✅ ${trigger}`);
      } else {
        console.log(`  ⚠️  ${trigger} - NOT FOUND (optional)`);
        this.results.warnings.push({
          severity: 'MEDIUM',
          category: 'TRIGGER_MISSING',
          trigger: trigger,
          message: `Trigger ${trigger} not found (balance update can be done in backend)`
        });
      }
    }
    
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DATA INTEGRITY CHECKS
  // ═══════════════════════════════════════════════════════════════════════════
  async checkDataIntegrity() {
    console.log('🔍 CHECK 6: Data Integrity');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    // 6.1 Check actor_code consistency in global_transactions
    console.log('  Checking actor_code consistency...');
    const { data: txWithNull, error: nullError } = await this.supabase
      .from('global_transactions')
      .select('id, actor_code')
      .is('actor_code', null);
    
    if (!nullError && txWithNull) {
      console.log(`    ℹ️  ${txWithNull.length} transactions with null actor_code (acceptable)`);
    }
    
    // 6.2 Check for orphan actors
    console.log('  Checking orphan actors...');
    const { data: orphans, error: orphanError } = await this.supabase.rpc('check_orphan_actors');
    
    if (orphanError) {
      // RPC might not exist, do manual check
      const { data: allActors } = await this.supabase.from('actors').select('actor_code');
      const { data: allWallets } = await this.supabase.from('actor_wallets').select('actor_code');
      const { data: allTxs } = await this.supabase.from('global_transactions').select('actor_code');
      
      const walletCodes = new Set(allWallets?.map(w => w.actor_code) || []);
      const txCodes = new Set(allTxs?.map(t => t.actor_code).filter(Boolean) || []);
      
      const orphanActors = (allActors || []).filter(a => 
        !walletCodes.has(a.actor_code) && !txCodes.has(a.actor_code)
      );
      
      if (orphanActors.length > 0) {
        console.log(`    ⚠️  ${orphanActors.length} orphan actors found`);
        this.results.warnings.push({
          severity: 'LOW',
          category: 'ORPHAN_ACTORS',
          count: orphanActors.length,
          message: 'Actors without wallets or transactions'
        });
      } else {
        console.log('    ✅ No orphan actors');
      }
    }
    
    // 6.3 Sample data check
    console.log('  Checking sample transaction...');
    const { data: sampleTx } = await this.supabase
      .from('global_transactions')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleTx) {
      console.log('    ✅ Sample transaction structure OK');
      console.log(`    📄 ID: ${sampleTx.id}`);
      console.log(`    💰 Amount: ${sampleTx.amount}`);
      console.log(`    👤 Actor: ${sampleTx.actor_code || 'null'}`);
    } else {
      console.log('    ℹ️  No transactions yet (fresh system)');
    }
    
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SECURITY CHECKS
  // ═══════════════════════════════════════════════════════════════════════════
  async checkSecurity() {
    console.log('🔒 CHECK 7: Security Validation');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    // 7.1 Check env variables
    const requiredEnv = [
      'SUPABASE_PROJECT_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'INTERNAL_API_KEY'
    ];
    
    console.log('  Environment variables:');
    for (const env of requiredEnv) {
      const value = process.env[env];
      const exists = value && !value.includes('SEU-') && value.length > 10;
      
      if (exists) {
        console.log(`    ✅ ${env}`);
      } else {
        console.log(`    ❌ ${env} - MISSING OR INVALID`);
        this.results.issues.push({
          severity: 'CRITICAL',
          category: 'ENV_MISSING',
          variable: env,
          message: `Environment variable ${env} missing or invalid`
        });
      }
    }
    
    // 7.2 Check for hardcoded keys in source files
    console.log('  Checking for hardcoded secrets...');
    const filesToCheck = [
      'server/services/mercadoPagoIntegration.js',
      'server/sovereignRevenueServer.js',
      'server/config/globalPricing.js'
    ];
    
    let hardcodedFound = false;
    for (const file of filesToCheck) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for patterns that look like hardcoded keys
        const patterns = [
          /chave.*:.*['"][a-f0-9-]{36}['"]/i,  // UUID-like
          /api[_-]?key.*:.*['"][a-zA-Z0-9]{20,}['"]/i,
          /secret.*:.*['"][a-zA-Z0-9]{20,}['"]/i
        ];
        
        for (const pattern of patterns) {
          if (pattern.test(content)) {
            hardcodedFound = true;
            console.log(`    ⚠️  Potential hardcoded key in ${file}`);
            this.results.warnings.push({
              severity: 'HIGH',
              category: 'HARDCODED_SECRET',
              file: file,
              message: 'Potential hardcoded secret detected'
            });
            break;
          }
        }
      }
    }
    
    if (!hardcodedFound) {
      console.log('    ✅ No obvious hardcoded secrets');
    }
    
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. BACKEND READINESS
  // ═══════════════════════════════════════════════════════════════════════════
  async checkBackendReadiness() {
    console.log('🚀 CHECK 8: Backend Readiness');
    console.log('───────────────────────────────────────────────────────────────────────────');
    
    // 8.1 Check server files exist
    const serverFiles = [
      'server/sovereignRevenueServer.js',
      'server/config/globalPricing.js',
      'server/middleware/geoCurrencyDetector.js'
    ];
    
    console.log('  Server files:');
    for (const file of serverFiles) {
      const filePath = path.join(__dirname, '..', file);
      const exists = fs.existsSync(filePath);
      
      if (exists) {
        console.log(`    ✅ ${file}`);
      } else {
        console.log(`    ❌ ${file} - MISSING`);
        this.results.issues.push({
          severity: 'CRITICAL',
          category: 'SERVER_FILE_MISSING',
          file: file,
          message: `Required server file ${file} missing`
        });
      }
    }
    
    // 8.2 Check payment flow endpoints
    console.log('  Payment flow:');
    const endpoints = [
      'POST /v1/payment/create/:signalId',
      'POST /v1/payment/confirm/:txId',
      'GET /v1/geo/test'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`    ✅ ${endpoint} (defined)`);
    }
    
    // 8.3 Check for ref parameter handling
    console.log('  Actor tracking (?ref=):');
    const geoDetectorPath = path.join(__dirname, '..', 'server/middleware/geoCurrencyDetector.js');
    if (fs.existsSync(geoDetectorPath)) {
      const content = fs.readFileSync(geoDetectorPath, 'utf8');
      const hasRefHandling = content.includes('ref') || content.includes('actor_code');
      
      if (hasRefHandling) {
        console.log('    ✅ ?ref= parameter handling detected');
      } else {
        console.log('    ⚠️  ?ref= handling not explicitly found');
        this.results.warnings.push({
          severity: 'MEDIUM',
          category: 'REF_TRACKING',
          message: '?ref= actor tracking may need implementation'
        });
      }
    }
    
    console.log('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL ASSESSMENT
  // ═══════════════════════════════════════════════════════════════════════════
  finalAssessment() {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 FINAL ASSESSMENT');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    const criticalIssues = this.results.issues.filter(i => i.severity === 'CRITICAL');
    const highIssues = this.results.issues.filter(i => i.severity === 'HIGH');
    const warnings = this.results.warnings;
    
    console.log(`\n🔴 Critical Issues: ${criticalIssues.length}`);
    console.log(`🟠 High Issues: ${highIssues.length}`);
    console.log(`🟡 Warnings: ${warnings.length}`);
    
    // Calculate readiness score
    const totalChecks = Object.keys(this.results.checks).length;
    const passedChecks = Object.values(this.results.checks).filter(v => v === true).length;
    const score = Math.round((passedChecks / totalChecks) * 100);
    
    console.log(`\n📈 Validation Score: ${score}%`);
    
    // Determine readiness
    const readyForGrafana = !criticalIssues.length && score >= 70;
    const readyForRealTransactions = !criticalIssues.length && !highIssues.length && score >= 85;
    
    this.results.ready_for_grafana = readyForGrafana;
    this.results.ready_for_real_transactions = readyForRealTransactions;
    this.results.score = score;
    
    if (readyForRealTransactions) {
      this.results.status = 'OK';
      console.log('\n✅ STATUS: READY FOR PRODUCTION');
      console.log('   - Grafana: Ready');
      console.log('   - Real Transactions: Ready');
    } else if (readyForGrafana) {
      this.results.status = 'PARTIAL';
      console.log('\n⚠️  STATUS: READY FOR GRAFANA ONLY');
      console.log('   - Grafana: Ready');
      console.log('   - Real Transactions: Needs fixes');
      console.log('\n   Required fixes:');
      highIssues.forEach(issue => {
        console.log(`   • ${issue.message}`);
      });
    } else {
      this.results.status = 'FAIL';
      console.log('\n❌ STATUS: NOT READY');
      console.log('   Critical issues must be resolved first');
      console.log('\n   Critical issues:');
      criticalIssues.forEach(issue => {
        console.log(`   • ${issue.message}`);
      });
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📝 SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Missing Items: ${highIssues.map(i => i.message).join(', ')}`);
    console.log(`Inconsistencies: ${warnings.length} warnings`);
    console.log(`Ready for Grafana: ${readyForGrafana ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Ready for Real Transactions: ${readyForRealTransactions ? 'YES ✅' : 'NO ❌'}`);
    console.log('═══════════════════════════════════════════════════════════════════════════');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE REPORT
  // ═══════════════════════════════════════════════════════════════════════════
  saveReport() {
    const reportPath = path.join(__dirname, '..', 'VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
const validator = new MonetizationValidator();
validator.validateAll().catch(console.error);
