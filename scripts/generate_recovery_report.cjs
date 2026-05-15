'use strict';

async function main() {
  const { writeRecoveryReport } = await import('../server/core/enterprise/enterpriseStatus.js');
  const result = writeRecoveryReport();
  console.log(JSON.stringify({ status: 'recovery_report_generated', path: result.path, report: result.report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
