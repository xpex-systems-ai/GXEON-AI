import { useState, useEffect, useCallback } from 'react';

interface UseAutoRefreshOptions<T> {
  fetchFn: () => Promise<T>;
  interval?: number;
  initialData?: T;
}

interface UseAutoRefreshReturn<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useAutoRefresh<T>({
  fetchFn,
  interval = 5000,
  initialData,
}: UseAutoRefreshOptions<T>): UseAutoRefreshReturn<T> {
  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetchFn();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetchData();
    
    const intervalId = setInterval(fetchData, interval);
    
    return () => clearInterval(intervalId);
  }, [fetchData, interval]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}
