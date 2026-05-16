#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON SERVER - MARKETPLACE SUPREME EDITION
 * 
 * Entry point with full marketplace integration
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { createMarketplaceSupreme } from './marketplace-integration.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════════════

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-GXEON-Key'],
}));

// Compression (optional - disabled for compatibility)
// app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════
// ROOT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// Root
app.get('/', (req, res) => {
  res.json({
    name: 'GXEON Signal Marketplace Supreme',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      api: '/v1/marketplace',
      dashboard: '/dashboard',
      health: '/health'
    },
    documentation: 'https://docs.gxeon.ai',
    timestamp: new Date().toISOString()
  });
});

// Root health check
app.get('/ping', (req, res) => {
  res.json({ pong: true, timestamp: new Date().toISOString() });
});

// ═══════════════════════════════════════════════════════════════════════════
// MARKETPLACE INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

let marketplace = null;

async function startServer() {
  try {
    console.log('🌑 Inicializando GXEON Marketplace Supreme...\n');
    
    // Initialize marketplace integration
    marketplace = await createMarketplaceSupreme(app);
    
    // Start server
    const server = await marketplace.start(PORT);
    
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('🌑 GXEON MARKETPLACE SUPREME: ONLINE');
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔌 API Base: http://localhost:${PORT}/v1/marketplace`);
    console.log('═══════════════════════════════════════════════════════════════════════\n');
    
    return server;
    
  } catch (err) {
    console.error('❌ Falha na inicialização:', err);
    process.exit(1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHUTDOWN HANDLING
// ═══════════════════════════════════════════════════════════════════════════

async function gracefulShutdown(signal) {
  console.log(`\n${signal} recebido. Iniciando desligamento gracioso...`);
  
  if (marketplace) {
    await marketplace.shutdown();
  }
  
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ═══════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════

startServer();

export default app;
