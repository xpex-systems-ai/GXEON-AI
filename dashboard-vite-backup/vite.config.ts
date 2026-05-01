import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    base: '/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      port: 3001,
      host: '0.0.0.0',
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      },
      proxy: {
        '/api': {
          // 🌑 GXEON SOVEREIGN — Production API: https://gxeon-ai.xmentex2.replit.app
          target: env.VITE_API_URL || env.VITE_API_BASE_URL || 'https://gxeon-ai.xmentex2.replit.app',
          changeOrigin: true,
        },
        '/rpc': {
          target: 'https://rpc.gelato.network',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/rpc/, ''),
          headers: {
            'Origin': 'https://localhost:3001'
          }
        }
      }
    }
  }
})
