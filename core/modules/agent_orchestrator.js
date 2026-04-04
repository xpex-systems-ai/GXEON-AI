// Load env vars with fallback for Railway
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../config/secure/.env') });

const { exec } = require('child_process');

function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

async function runFullCycle() {
  console.log('[GX]: Running full autonomous cycle...');

  await runCommand('node core/modules/run_marketplace.js');
  await runCommand('node core/modules/run_ai.js');
  await runCommand('node core/modules/run_execution.js');
  await runCommand('node core/modules/run_reward.js');
  await runCommand('node core/modules/run_payment.js');

  console.log('[GX]: Cycle completed');
}

async function autoScale(interval = 10000) {
  console.log('[GX]: Auto-scaling started...');

  setInterval(async () => {
    try {
      await runFullCycle();
    } catch (err) {
      console.error('[GX_ERROR]:', err.message);
    }
  }, interval);
}

module.exports = {
  autoScale
};
