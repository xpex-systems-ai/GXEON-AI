const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 GXEON AUTONOMOUS IGNITION - Deployment Script');
console.log('=============================================\n');

try {
  // Step 1: Build dashboard
  console.log('📦 Step 1: Building dashboard...');
  execSync('cd dashboard && npm run build', { stdio: 'inherit' });
  console.log('✅ Dashboard build completed\n');

  // Step 2: Git push
  console.log('📤 Step 2: Pushing to git...');
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "GXEON Autonomous Ignition: Keeper module activated with 1inch/0x rebate callbacks and Live Log Terminal"', { stdio: 'inherit' });
  execSync('git push --set-upstream origin main', { stdio: 'inherit' });
  console.log('✅ Git push completed\n');

  // Step 3: Vercel production deployment
  console.log('🌐 Step 3: Deploying to Vercel production...');
  execSync('npx vercel --prod --force', { stdio: 'inherit' });
  console.log('✅ Vercel deployment completed\n');

  console.log('=============================================');
  console.log('🎉 GXEON AUTONOMOUS IGNITION COMPLETE');
  console.log('=============================================');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
