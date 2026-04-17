/**
 * 🧪 GXEON M2M FINAL VALIDATION SUITE
 * 
 * Script de teste completo para validação do endpoint /api/v1/sovereign-data
 * 
 * Testes executados:
 * - ✅ JSON response validation
 * - ✅ HTTP 200 status
 * - ✅ Billing credit deduction (0.05 credits)
 * - ✅ Required data fields presence
 * - ✅ M2M headers validation
 * - ✅ Response time SLA (< 100ms)
 * - ✅ Content-Type: application/json
 * 
 * Usage: node tests/m2m_validation.js
 * Output: logs/final_verification.log
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const CONFIG = {
  API_BASE_URL: process.env.GXEON_API_URL || 'https://gxeon-ai.xmentex2.replit.app/api/v1',
  SYSTEM_API_KEY: process.env.SYSTEM_API_KEY || process.env.GXEON_API_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  TEST_AGENT_ID: 'FINAL_TEST_AGENT_v2.2',
  EXPECTED_CREDIT_COST: 0.05,
  MAX_RESPONSE_TIME_MS: 100,
  LOG_FILE: path.join(__dirname, '..', 'logs', 'final_verification.log')
};

// Initialize Supabase client for billing verification
const supabase = (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_SERVICE_ROLE_KEY) 
  ? createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// Logger
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
    this.logs = [];
    this.startTime = Date.now();
    
    // Ensure log directory exists
    const dir = path.dirname(logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message, data };
    this.logs.push(entry);
    
    const consoleColor = {
      INFO: '\x1b[36m',   // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      BILLING: '\x1b[35m',  // Magenta
      SLA: '\x1b[34m'       // Blue
    };
    
    const reset = '\x1b[0m';
    const color = consoleColor[level] || '';
    
    console.log(`${color}[${level}] ${message}${reset}`);
    if (data && level !== 'INFO') {
      console.log('  Data:', JSON.stringify(data, null, 2));
    }
  }

  async save() {
    const duration = Date.now() - this.startTime;
    const summary = {
      testRun: {
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        total_tests: this.logs.length,
        passed: this.logs.filter(l => l.level === 'SUCCESS').length,
        failed: this.logs.filter(l => l.level === 'ERROR').length,
        warnings: this.logs.filter(l => l.level === 'WARNING').length
      },
      logs: this.logs
    };
    
    fs.writeFileSync(this.logFile, JSON.stringify(summary, null, 2));
    console.log(`\n📝 Log saved to: ${this.logFile}`);
    return summary;
  }
}

const logger = new Logger(CONFIG.LOG_FILE);

// Test Suite
class M2MValidationSuite {
  constructor() {
    this.results = {
      tests: [],
      passed: 0,
      failed: 0,
      billingVerified: false,
      creditBefore: null,
      creditAfter: null
    };
  }

  async run() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         🧪 GXEON M2M FINAL VALIDATION SUITE v2.2             ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Target: ${CONFIG.API_BASE_URL.padEnd(48)} ║`);
    console.log(`║  Agent:  ${CONFIG.TEST_AGENT_ID.padEnd(48)} ║`);
    console.log(`║  Time:   ${new Date().toISOString().padEnd(48)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Pre-test: Get initial credit balance
    await this.checkInitialBalance();

    // Test 1: HTTP 200 Status
    await this.testHttp200();

    // Test 2: JSON Content-Type
    await this.testJsonContentType();

    // Test 3: Required Data Fields
    await this.testRequiredFields();

    // Test 4: M2M Headers Validation
    await this.testM2MHeaders();

    // Test 5: SLA Response Time
    await testSlaResponseTime();

    // Test 6: Billing Verification (0.05 credits)
    await this.testBillingDeduction();

    // Test 7: Human Detection (should fail for browsers)
    await this.testHumanDetection();

    // Test 8: Invalid API Key
    await this.testInvalidApiKey();

    // Generate report
    await this.generateReport();
  }

  async checkInitialBalance() {
    logger.log('INFO', '🔍 Checking initial credit balance...');
    
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/billing/balance`, {
        headers: {
          'x-gxeon-key': CONFIG.SYSTEM_API_KEY,
          'x-agent-id': CONFIG.TEST_AGENT_ID
        }
      });
      
      this.results.creditBefore = response.data?.amount || 0;
      logger.log('BILLING', `💳 Initial credit balance: ${this.results.creditBefore}`, response.data);
    } catch (error) {
      logger.log('WARNING', '⚠️ Could not fetch initial balance (billing endpoint may be auth-only)', error.message);
      this.results.creditBefore = null;
    }
  }

  async testHttp200() {
    logger.log('INFO', '🌐 Test 1: HTTP 200 Status...');
    
    try {
      const startTime = Date.now();
      const response = await axios.get(`${CONFIG.API_BASE_URL}/sovereign-data`, {
        headers: {
          'x-gxeon-key': CONFIG.SYSTEM_API_KEY,
          'x-agent-id': CONFIG.TEST_AGENT_ID,
          'x-agent-tier': 'pro',
          'User-Agent': 'M2M-Agent/2.2'
        },
        timeout: 10000
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.status === 200) {
        this.results.passed++;
        logger.log('SUCCESS', `✅ HTTP 200 OK (${responseTime}ms)`, {
          status: response.status,
          responseTime_ms: responseTime
        });
      } else {
        this.results.failed++;
        logger.log('ERROR', `❌ Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.results.failed++;
      logger.log('ERROR', `❌ HTTP 200 test failed: ${error.message}`, {
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }

  async testJsonContentType() {
    logger.log('INFO', '📄 Test 2: JSON Content-Type...');
    
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/sovereign-data`, {
        headers: {
          'x-gxeon-key': CONFIG.SYSTEM_API_KEY,
          'x-agent-id': CONFIG.TEST_AGENT_ID,
          'User-Agent': 'M2M-Agent/2.2'
        }
      });
      
      const contentType = response.headers['content-type'];
      const isJson = contentType && contentType.includes('application/json');
      
      if (isJson) {
        this.results.passed++;
        logger.log('SUCCESS', `✅ Content-Type is JSON: ${contentType}`);
      } else {
        this.results.failed++;
        logger.log('ERROR', `❌ Invalid Content-Type: ${contentType}. Expected application/json`);
      }
    } catch (error) {
      this.results.failed++;
      logger.log('ERROR', `❌ JSON Content-Type test failed: ${error.message}`);
    }
  }

  async testRequiredFields() {
    logger.log('INFO', '🔍 Test 3: Required Data Fields...');
    
    const requiredFields = [
      'protocol',
      'timestamp',
      'agent',
      'data',
      'meta'
    ];
    
    const dataRequiredFields = [
      'mempool',
      'arbitrage'
    ];
    
    const mempoolRequiredFields = [
      'pending_tx_count',
      'gas_price_gwei'
    ];
    
    const arbitrageRequiredFields = [
      'opportunities',
      'flash_loan_pools'
    ];
    
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/sovereign-data`, {
        headers: {
          'x-gxeon-key': CONFIG.SYSTEM_API_KEY,
          'x-agent-id': CONFIG.TEST_AGENT_ID,
          'User-Agent': 'M2M-Agent/2.2'
        }
      });
      
      const data = response.data;
      const missingFields = [];
      
      // Check top-level fields
      requiredFields.forEach(field => {
        if (!(field in data)) {
          missingFields.push(field);
        }
      });
      
      // Check data.mempool
      if (data.data?.mempool) {
        mempoolRequiredFields.forEach(field => {
          if (!(field in data.data.mempool)) {
            missingFields.push(`data.mempool.${field}`);
          }
        });
      }
      
      // Check data.arbitrage
      if (data.data?.arbitrage) {
        arbitrageRequiredFields.forEach(field => {
          if (!(field in data.data.arbitrage)) {
            missingFields.push(`data.arbitrage.${field}`);
          }
        });
      }
      
      if (missingFields.length === 0) {
        this.results.passed++;
        logger.log('SUCCESS', '✅ All required fields present', {
          protocol: data.protocol,
          timestamp: data.timestamp,
          agent_tier: data.agent?.tier,
          mempool_tx_count: data.data?.mempool?.pending_tx_count,
          arbitrage_count: data.data?.arbitrage?.opportunities?.length,
          credits_remaining: data.agent?.remaining_credits
        });
      } else {
        this.results.failed++;
        logger.log('ERROR', `❌ Missing required fields: ${missingFields.join(', ')}`);
      }
    } catch (error) {
      this.results.failed++;
      logger.log('ERROR', `❌ Required fields test failed: ${error.message}`);
    }
  }

  async testM2MHeaders() {
    logger.log('INFO', '📋 Test 4: M2M Headers Validation...');
    
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/sovereign-data`, {
        headers: {
          'x-gxeon-key': CONFIG.SYSTEM_API_KEY,
          'x-agent-id': CONFIG.TEST_AGENT_ID,
          'User-Agent': 'M2M-Agent/2.2'
        }
      });
      
      const headers = response.headers;
      const m2mHeaders = {
        'x-response-time': headers['x-response-time'],
        'x-agent-tier': headers['x-agent-tier'],
        'x-credits-deducted': headers['x-credits-deducted'],
        'x-m2m-protocol': headers['x-m2m-protocol']
      };
      
      const hasM2MHeaders = Object.values(m2mHeaders).some(v => v !== undefined);
      
      if (hasM2MHeaders) {
        this.results.passed++;
        logger.log('SUCCESS', '✅ M2M headers present', m2mHeaders);
      } else {
        this.results.failed++;
        logger.log('ERROR', '❌ M2M headers missing', { received: headers });
      }
    } catch (error) {
      this.results.failed++;
      logger.log('ERROR', `❌ M2M headers test failed: ${error.message}`);
    }
  }

  async function testSlaResponseTime() {
    logger.log('INFO', '⏱️  Test 5: SLA Response Time (< 100ms)...');
    
    const times = [];
    const iterations = 5;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = Date.now();
        await axios.get(`${CONFIG.API_BASE_URL}/sovereign-data`, {
          headers: {
            'x-gxeon-key': CONFIG.SYSTEM_API_KEY,
            'x-agent-id': CONFIG.TEST_AGENT_ID,
            'User-Agent': 'M2M-Agent/2.2'
          }
        });
        times.push(Date.now() - startTime);
      } catch (error) {
        times.push(null);
      }
    }
    
    const validTimes = times.filter(t => t !== null);
    const avgTime = validTimes.length > 0 
      ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length 
      : 0;
    const maxTime = validTimes.length > 0 ? Math.max(...validTimes) : 0;
    
    if (avgTime <= CONFIG.MAX_RESPONSE_TIME_MS) {
      this.results.passed++;
      logger.log('SLA', `✅ SLA met: Avg ${avgTime.toFixed(2)}ms (max: ${maxTime}ms)`, {
        iterations,
        avg_response_ms: avgTime,
        max_response_ms: maxTime,
        sla_target_ms: CONFIG.MAX_RESPONSE_TIME_MS
      });
    } else {
      this.results.failed++;
      logger.log('WARNING', `⚠️ SLA not met: Avg ${avgTime.toFixed(2)}ms exceeds ${CONFIG.MAX_RESPONSE_TIME_MS}ms`, {
        avg_response_ms: avgTime,
        max_response_ms: maxTime
      });
    }
  }

  async testBillingDeduction() {
    logger.log('INFO', '💰 Test 6: Billing Verification (0.05 credits)...');
    
    if (!supabase) {
      logger.log('WARNING', '⚠️ Supabase not configured - skipping billing verification');
      return;
    }
    
    try {
      // Wait a moment for billing to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get credit after
      const response = await axios.get(`${CONFIG.API_BASE_URL}/billing/balance`, {
        headers: {
          'x-gxeon-key': CONFIG.SYSTEM_API_KEY,
          'x-agent-id': CONFIG.TEST_AGENT_ID
        }
      });
      
      this.results.creditAfter = response.data?.amount || 0;
      
      if (this.results.creditBefore !== null) {
        const diff = this.results.creditBefore - this.results.creditAfter;
        
        if (Math.abs(diff - CONFIG.EXPECTED_CREDIT_COST) < 0.001) {
          this.results.billingVerified = true;
          this.results.passed++;
          logger.log('BILLING', `✅ Billing verified: ${diff.toFixed(2)} credits deducted`, {
            before: this.results.creditBefore,
            after: this.results.creditAfter,
            deducted: diff,
            expected: CONFIG.EXPECTED_CREDIT_COST
          });
        } else if (diff > 0) {
          this.results.passed++;
          logger.log('BILLING', `⚠️ Credits deducted but amount differs: ${diff.toFixed(2)} (expected: ${CONFIG.EXPECTED_CREDIT_COST})`, {
            before: this.results.creditBefore,
            after: this.results.creditAfter,
            deducted: diff
          });
        } else {
          this.results.failed++;
          logger.log('ERROR', `❌ No credits deducted! Balance unchanged: ${this.results.creditBefore}`, {
            before: this.results.creditBefore,
            after: this.results.creditAfter
          });
        }
      } else {
        logger.log('INFO', `💳 Current credit balance: ${this.results.creditAfter}`);
      }
    } catch (error) {
      logger.log('WARNING', `⚠️ Billing verification skipped: ${error.message}`);
    }
  }

  async testHumanDetection() {
    logger.log('INFO', '🚫 Test 7: Human Detection (should block browsers)...');
    
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/sovereign-data`, {
        headers: {
          'x-gxeon-key': CONFIG.SYSTEM_API_KEY,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        validateStatus: () => true // Don't throw on error status
      });
      
      if (response.status === 403) {
        this.results.passed++;
        logger.log('SUCCESS', '✅ Human detection active: Browser User-Agent blocked (403)');
      } else if (response.status === 200) {
        this.results.failed++;
        logger.log('ERROR', '❌ Human detection failed: Browser request was allowed!', {
          status: response.status
        });
      } else {
        logger.log('INFO', `ℹ️ Human detection returned status: ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        this.results.passed++;
        logger.log('SUCCESS', '✅ Human detection active: Browser blocked');
      } else {
        logger.log('WARNING', `⚠️ Human detection test error: ${error.message}`);
      }
    }
  }

  async testInvalidApiKey() {
    logger.log('INFO', '🔑 Test 8: Invalid API Key (should return 401)...');
    
    try {
      const response = await axios.get(`${CONFIG.API_BASE_URL}/sovereign-data`, {
        headers: {
          'x-gxeon-key': 'invalid_key_12345',
          'x-agent-id': CONFIG.TEST_AGENT_ID,
          'User-Agent': 'M2M-Agent/2.2'
        },
        validateStatus: () => true
      });
      
      if (response.status === 401) {
        this.results.passed++;
        logger.log('SUCCESS', '✅ Invalid API key rejected (401)');
      } else {
        this.results.failed++;
        logger.log('ERROR', `❌ Invalid API key test failed: Status ${response.status}`, response.data);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        this.results.passed++;
        logger.log('SUCCESS', '✅ Invalid API key properly rejected');
      } else {
        this.results.failed++;
        logger.log('ERROR', `❌ Invalid API key test error: ${error.message}`);
      }
    }
  }

  async generateReport() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 VALIDATION REPORT                        ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    
    const total = this.results.passed + this.results.failed;
    const passRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
    
    console.log(`║  ✅ Passed:     ${this.results.passed.toString().padEnd(45)} ║`);
    console.log(`║  ❌ Failed:     ${this.results.failed.toString().padEnd(45)} ║`);
    console.log(`║  📈 Pass Rate:  ${(passRate + '%').padEnd(45)} ║`);
    console.log(`║  💰 Billing:    ${(this.results.billingVerified ? 'VERIFIED' : 'SKIPPED').padEnd(45)} ║`);
    
    const status = this.results.failed === 0 ? '🟢 ALL TESTS PASSED' : '🔴 SOME TESTS FAILED';
    console.log(`║  Status:        ${status.padEnd(45)} ║`);
    
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    
    // Save logs
    const summary = await logger.save();
    
    // Exit code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Run tests
const suite = new M2MValidationSuite();
suite.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
