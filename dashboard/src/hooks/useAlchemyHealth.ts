import { useState, useEffect, useCallback } from 'react';

/**
 * 🔴 GXEON ALCHEMY RATE LIMIT MONITOR
 * Detecta erro 429 e gerencia pausa de 30 segundos
 */

interface RateLimitState {
  isRateLimited: boolean;
  retryAfter: number;
  lastError: string | null;
  countdown: number;
}

export function useAlchemyHealth() {
  const [state, setState] = useState<RateLimitState>({
    isRateLimited: false,
    retryAfter: 0,
    lastError: null,
    countdown: 0
  });

  const API_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'https://gxeon-ai.xmentex2.replit.app';

  // 🔄 Verifica status do backend periodicamente
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/health/alchemy`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.rateLimited) {
            setState(prev => ({
              ...prev,
              isRateLimited: true,
              retryAfter: data.retryAfter || 30000,
              lastError: data.message || 'Rate limit detectado (429)',
              countdown: Math.ceil((data.retryAfter || 30000) / 1000)
            }));
          } else if (state.isRateLimited && !data.rateLimited) {
            // Rate limit cleared
            setState({
              isRateLimited: false,
              retryAfter: 0,
              lastError: null,
              countdown: 0
            });
          }
        }
      } catch (err) {
        // Silencioso - backend pode estar indisponível
      }
    };

    // Check immediately and every 2 seconds
    checkHealth();
    const interval = setInterval(checkHealth, 2000);

    return () => clearInterval(interval);
  }, [API_URL, state.isRateLimited]);

  // ⏱️ Countdown timer
  useEffect(() => {
    if (!state.isRateLimited || state.countdown <= 0) return;

    const timer = setInterval(() => {
      setState(prev => ({
        ...prev,
        countdown: Math.max(0, prev.countdown - 1)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [state.isRateLimited, state.countdown]);

  // 🔓 Libera manualmente (emergência)
  const clearRateLimit = useCallback(() => {
    setState({
      isRateLimited: false,
      retryAfter: 0,
      lastError: null,
      countdown: 0
    });
  }, []);

  return {
    ...state,
    clearRateLimit
  };
}
