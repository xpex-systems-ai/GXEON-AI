#!/usr/bin/env node
/**
 * Build script for Railway deployment
 * Ensures dashboard is built before server starts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 [GXEON] Starting build process...\n');

// Build dashboard
try {
  const rootDir = path.join(__dirname, '..');
  const dashboardDir = path.join(__dirname, '../dashboard');
  const distPath = path.join(dashboardDir, 'dist');
  
  // Clean previous dist if exists
  if (fs.existsSync(distPath)) {
    console.log('🧹 Cleaning previous build...');
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  
  console.log('📦 Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: rootDir });
  
  console.log('\n📦 Installing dashboard dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: dashboardDir });
  
  console.log('\n🔨 Building dashboard with Vite...');
  try {
    execSync('npx vite build', { 
      stdio: 'inherit', 
      cwd: dashboardDir,
      env: { ...process.env, NODE_ENV: 'production', CI: 'true' }
    });
  } catch (viteError) {
    console.error('\n⚠️  Vite build failed, trying with npm run build...');
    execSync('npm run build', { 
      stdio: 'inherit', 
      cwd: dashboardDir,
      env: { ...process.env, NODE_ENV: 'production', CI: 'true' }
    });
  }
  
  // Verify dist was created
  if (!fs.existsSync(distPath)) {
    console.error('\n❌ ERROR: Dashboard dist folder was not created!');
    console.error('   Checked path:', distPath);
    process.exit(1);
  }
  
  const files = fs.readdirSync(distPath);
  if (files.length === 0) {
    console.error('\n❌ ERROR: Dashboard dist folder is empty!');
    process.exit(1);
  }
  
  console.log(`\n✅ Dashboard built successfully! Files: ${files.length}`);
  console.log('   Files:', files.join(', '));
  
  // Also list assets folder
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    const assets = fs.readdirSync(assetsPath);
    console.log(`   Assets: ${assets.length} files`);
  }
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

console.log('\n🚀 [GXEON] Build complete!\n');
