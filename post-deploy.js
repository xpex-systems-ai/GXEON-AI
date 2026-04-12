#!/usr/bin/env node

/**
 * Post-Deploy Script for Vercel URL Capture
 * Captures and displays the Vercel deployment URL with Gold highlighting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const GOLD = '\x1b[33;1m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32;1m';
const CYAN = '\x1b[36;1m';

function getVercelUrl() {
  try {
    // Try to get the latest deployment URL from Vercel CLI
    const url = execSync('vercel ls --prod --yes', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    
    // Parse the URL from the output
    const urlMatch = url.match(/https:\/\/[a-zA-Z0-9-]+\.vercel\.app/);
    
    if (urlMatch && urlMatch[0]) {
      return urlMatch[0];
    }
    
    // Fallback: check .vercel/project.json for project info
    const projectJsonPath = path.join(process.cwd(), '.vercel', 'project.json');
    if (fs.existsSync(projectJsonPath)) {
      const projectConfig = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
      const projectName = projectConfig.projectName || 'gxeon-ai';
      return `https://${projectName}.vercel.app`;
    }
    
    return null;
  } catch (error) {
    console.error(`${GOLD}⚠️  Error fetching Vercel URL:${RESET}`, error.message);
    return null;
  }
}

function main() {
  console.log(`\n${CYAN}═══════════════════════════════════════════════════════════════${RESET}`);
  console.log(`${GOLD}🚀 GXEON AI - Vercel Deployment Status${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════════════════════════════${RESET}\n`);
  
  const vercelUrl = getVercelUrl();
  
  if (vercelUrl) {
    console.log(`${GREEN}✓ Deployment Successful!${RESET}\n`);
    console.log(`${GOLD}🌐 Production URL: ${vercelUrl}${RESET}\n`);
    console.log(`${CYAN}═══════════════════════════════════════════════════════════════${RESET}\n`);
    
    // Save URL to file for reference
    const deployInfoPath = path.join(process.cwd(), '.vercel', 'deploy-info.json');
    const deployInfo = {
      url: vercelUrl,
      timestamp: new Date().toISOString(),
      environment: 'production'
    };
    
    fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
    console.log(`${GOLD}📝 Deployment info saved to: ${deployInfoPath}${RESET}\n`);
  } else {
    console.log(`${GOLD}⚠️  Could not determine Vercel URL${RESET}\n`);
    console.log(`${CYAN}Please check your Vercel dashboard for the deployment status.${RESET}\n`);
  }
}

// Run the script
main();
