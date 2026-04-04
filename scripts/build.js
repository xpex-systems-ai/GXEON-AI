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
  console.log('📦 Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  console.log('\n📦 Installing dashboard dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '../dashboard') });
  
  console.log('\n🔨 Building dashboard...');
  execSync('npx vite build', { 
    stdio: 'inherit', 
    cwd: path.join(__dirname, '../dashboard'),
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // Verify dist was created
  const distPath = path.join(__dirname, '../dashboard/dist');
  if (!fs.existsSync(distPath)) {
    throw new Error('Dashboard dist folder not created!');
  }
  
  const files = fs.readdirSync(distPath);
  console.log(`\n✅ Dashboard built successfully! Files: ${files.length}`);
  console.log('   Files:', files.join(', '));
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n🚀 [GXEON] Build complete!\n');
