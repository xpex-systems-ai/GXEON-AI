const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 GXEON NETLIFY TAKEOVER - Deployment Script');
console.log('=============================================\n');

try {
  // Step 1: Build dashboard
  console.log('📦 Step 1: Building dashboard...');
  execSync('cd dashboard && npm run build', { stdio: 'inherit' });
  console.log('✅ Dashboard build completed\n');

  // Step 2: Git push (skip if nothing to commit)
  console.log('📤 Step 2: Pushing to git...');
  try {
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "GXEON Netlify Takeover: Keeper module with Live Log Terminal"', { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log('✅ Git push completed\n');
  } catch (gitError) {
    console.log('ℹ️  No changes to commit, skipping git push\n');
  }

  // Step 3: Netlify production deployment
  console.log('🌐 Step 3: Deploying to Netlify production...');
  execSync('cd dashboard && npx -y netlify deploy --prod --dir=dist', { stdio: 'inherit' });
  console.log('✅ Netlify deployment completed\n');

  console.log('=============================================');
  console.log('🎉 GXEON NETLIFY TAKEOVER COMPLETE');
  console.log('=============================================');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
