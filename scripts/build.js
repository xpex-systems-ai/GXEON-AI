#!/usr/bin/env node
/**
 * Build script for Railway deployment
 * Ensures dashboard is built before server starts
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DASHBOARD_DIR = path.join(__dirname, '../dashboard');
const DIST_DIR = path.join(DASHBOARD_DIR, 'dist');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');

console.log('🔧 [GXEON] Starting build process...\n');

// Build dashboard
try {
  console.log('📦 Installing root dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: ROOT_DIR });

  console.log('\n📦 Installing dashboard dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: DASHBOARD_DIR });

  console.log('\n🔨 Building dashboard with Vite...');

  // Run Vite build and capture output so we can surface it on failure
  const viteBuild = spawnSync('npx', ['vite', 'build'], {
    cwd: DASHBOARD_DIR,
    env: { ...process.env, NODE_ENV: 'production' },
    encoding: 'utf8',
  });

  // Always print stdout/stderr so the Railway build log is informative
  if (viteBuild.stdout) process.stdout.write(viteBuild.stdout);
  if (viteBuild.stderr) process.stderr.write(viteBuild.stderr);

  if (viteBuild.status !== 0) {
    const reason = viteBuild.error
      ? viteBuild.error.message
      : `Vite exited with code ${viteBuild.status}`;
    throw new Error(
      `Vite build failed — ${reason}\n` +
      `stdout:\n${viteBuild.stdout || '(empty)'}\n` +
      `stderr:\n${viteBuild.stderr || '(empty)'}`
    );
  }

  // Verify dashboard/dist/index.html was produced
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(
      `dashboard/dist directory was not created after Vite build. ` +
      `Check that vite.config.ts has build.outDir set to 'dist' and that ` +
      `the build completed without errors.`
    );
  }

  if (!fs.existsSync(DIST_INDEX)) {
    const distFiles = fs.readdirSync(DIST_DIR);
    throw new Error(
      `dashboard/dist/index.html is missing after Vite build. ` +
      `Files present in dist: ${distFiles.join(', ') || '(none)'}. ` +
      `Ensure the Vite build is not configured to skip HTML output.`
    );
  }

  const distFiles = fs.readdirSync(DIST_DIR);
  console.log(`\n✅ Dashboard built successfully!`);
  console.log(`   dist/ contains ${distFiles.length} item(s): ${distFiles.join(', ')}`);

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}

console.log('\n🚀 [GXEON] Build complete!\n');
