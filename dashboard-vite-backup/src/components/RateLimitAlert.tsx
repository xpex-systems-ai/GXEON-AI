import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, Clock, Shield, ZapOff } from 'lucide-react';

/**
 * 🔴 GXEON RATE LIMIT ALERT
 * Alerta vermelho quando Alchemy retorna 429
 * Pausa requisições por 30 segundos
 */

interface RateLimitAlertProps {
  isActive: boolean;
  countdown: number;
  message: string | null;
  onClear?: () => void;
}

export function RateLimitAlert({ isActive, countdown, message, onClear }: RateLimitAlertProps) {
  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -100 }}
        className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 border-b-4 border-red-800 shadow-2xl"
      >
        {/* 🔴 Alerta Principal */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Esquerda: Ícone + Título */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
              >
                <AlertOctagon className="w-8 h-8 text-white" />
              </motion.div>
              
              <div>
                <h2 className="text-2xl font-bold text-white">🔴 Alchemy Rate Limit Detected (429)</h2>
                <p className="text-red-100 text-sm mt-1">
                  {message || 'Limite de requisições Alchemy atingido. Pausando por 30 segundos para proteger a conexão.'}
                </p>
              </div>
            </div>

            {/* Centro: Countdown */}
            <div className="flex items-center gap-3 bg-red-800/50 px-6 py-3 rounded-xl">
              <Clock className="w-6 h-6 text-red-200 animate-pulse" />
              <div className="text-center">
                <div className="text-3xl font-bold text-white font-mono">
                  {countdown}s
                </div>
                <div className="text-xs text-red-200 uppercase tracking-wider">
                  Retry After
                </div>
              </div>
            </div>

            {/* Direita: Status + Ações */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-lg">
                <ZapOff className="w-5 h-5 text-red-300" />
                <span className="text-red-200 text-sm font-medium">REQUESTS PAUSED</span>
              </div>
              
              {onClear && (
                <button
                  onClick={onClear}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                >
                  <Shield className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-medium">Force Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="mt-4">
            <div className="h-2 bg-red-800/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-300 to-white"
                initial={{ width: '100%' }}
                animate={{ width: `${(countdown / 30) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-red-200">
              <span>Node.js Process: ALIVE ✅</span>
              <span>Alchemy Connection: RATE LIMITED ⛔</span>
            </div>
          </div>
        </div>

        {/* Efeito de Pulso na Borda */}
        <motion.div
          className="absolute inset-0 border-2 border-red-400 rounded-none"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
