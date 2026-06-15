import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeR100TruthRefresh } from "@/lib/r100TruthEvents";
import { fallbackR100TruthSummary, getR100TruthSummary, type R100TruthSummary } from "@/services/r100TruthService";

export function useR100TruthSummary() {
  const [summary, setSummary] = useState<R100TruthSummary>(fallbackR100TruthSummary());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback((signal?: AbortSignal) => {
    if (!mounted.current) return Promise.resolve(fallbackR100TruthSummary());
    setLoading(true);
    return getR100TruthSummary(signal)
      .then((s) => {
        if (!mounted.current) return s;
        setSummary(s);
        setError(null);
        setLastUpdatedAt(s.updatedAt ?? new Date().toISOString());
        return s;
      })
      .catch((e) => {
        if ((e as any)?.name !== "AbortError" && mounted.current) {
          const fallback = fallbackR100TruthSummary();
          setError(String(e));
          setSummary(fallback);
          setLastUpdatedAt(fallback.updatedAt ?? new Date().toISOString());
        }
        return fallbackR100TruthSummary();
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
  }, []);

  const refreshWithNewController = useCallback(() => {
    controller.current?.abort();
    controller.current = new AbortController();
    return refresh(controller.current.signal);
  }, [refresh]);

  useEffect(() => {
    mounted.current = true;
    refreshWithNewController();
    const unsubscribe = subscribeR100TruthRefresh(() => refreshWithNewController());
    const interval = window.setInterval(() => refreshWithNewController(), 30000);
    return () => {
      mounted.current = false;
      unsubscribe();
      window.clearInterval(interval);
      controller.current?.abort();
    };
  }, [refreshWithNewController]);

  return { summary, loading, error, refresh: refreshWithNewController, lastUpdatedAt, safeFallbackUsed: summary.safeFallbackUsed };
}
