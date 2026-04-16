import { useEffect, useState } from 'react';

/**
 * Fetch + cache server-computed metrics.
 *
 * Super simple: an in-memory Map keyed by URL, with a 30s TTL. No request
 * deduping (single-user app), no stale-while-revalidate. If you need a fresh
 * value inside the TTL window, pass `bust` with a changing token.
 */

interface CacheEntry<T> {
  ts: number;
  data: T;
}

const cache = new Map<string, CacheEntry<unknown>>();
const TTL_MS = 30_000;

export function useServerMetrics<T>(
  path: string,
  options?: { enabled?: boolean; bust?: unknown },
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const enabled = options?.enabled !== false;
  const bustKey = options?.bust ?? 0;

  const cacheKey = path;
  const [data, setData] = useState<T | null>(() => {
    const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (entry && Date.now() - entry.ts < TTL_MS) return entry.data;
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.ts < TTL_MS) {
      setData(cached.data);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(path)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return (await res.json()) as T;
      })
      .then((result) => {
        if (cancelled) return;
        cache.set(cacheKey, { ts: Date.now(), data: result });
        setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, bustKey]);

  const refetch = () => {
    cache.delete(cacheKey);
    setData(null);
    setError(null);
  };

  return { data, loading, error, refetch };
}

/** Invalidate all metric cache entries (call after local writes). */
export function invalidateServerMetrics(): void {
  cache.clear();
}
