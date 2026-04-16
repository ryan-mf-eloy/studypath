import { useEffect, useState } from 'react';
import { hydrateFromServer } from '../lib/serverSync';

export type HydrationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; empty: boolean }
  | { status: 'error'; error: string };

/** Runs once on mount: hydrates Zustand stores from the backend. */
export function useServerSync(): HydrationState {
  const [state, setState] = useState<HydrationState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    hydrateFromServer().then(result => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: 'ready', empty: result.state?.empty ?? false });
      } else {
        setState({ status: 'error', error: result.error ?? 'erro desconhecido' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
