import { useState, useEffect, useCallback, useMemo } from 'react';
import { cachedFetch, debounce } from '../utils/performance';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  immediate?: boolean;
  cache?: boolean;
  debounceMs?: number;
  retries?: number;
}

export function useOptimizedApi<T>(
  url: string,
  options: UseApiOptions = {}
) {
  const {
    immediate = true,
    cache = true,
    debounceMs = 0,
    retries = 3
  } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    let attempt = 0;
    while (attempt < retries) {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        };

        const data = cache 
          ? await cachedFetch(url, { headers })
          : await fetch(url, { headers }).then(res => res.json());

        setState({ data, loading: false, error: null });
        return;
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }, [url, cache, retries]);

  const debouncedFetch = useMemo(
    () => debounceMs > 0 ? debounce(fetchData, debounceMs) : fetchData,
    [fetchData, debounceMs]
  );

  useEffect(() => {
    if (immediate && url) {
      debouncedFetch();
    }
  }, [url, immediate, debouncedFetch]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch
  };
}

export function useOptimizedMutation<T, P = any>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  const mutate = useCallback(async (payload?: P) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...(payload && { body: JSON.stringify(payload) })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, [url, method]);

  return {
    ...state,
    mutate
  };
}
