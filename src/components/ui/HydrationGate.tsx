import { useServerSync } from '../../hooks/useServerSync';

/**
 * Blocks the render tree until the backend has hydrated the stores.
 * Shows a minimalist splash while loading; a coral error card if it fails.
 */
export default function HydrationGate({ children }: { children: React.ReactNode }) {
  const state = useServerSync();

  if (state.status === 'ready') return <>{children}</>;

  if (state.status === 'error') {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={{
          height: '100vh',
          gap: 16,
          background: 'var(--bg)',
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            color: 'var(--text)',
          }}
        >
          Não consegui conectar ao servidor
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-50)',
            maxWidth: 420,
            lineHeight: 1.55,
          }}
        >
          Verifique se <code>npm run dev</code> está rodando com o servidor em{' '}
          <code>127.0.0.1:3001</code>. Detalhes:
          <br />
          <span style={{ color: 'var(--accent-coral)' }}>{state.error}</span>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 18px',
            border: '1px solid var(--text)',
            background: 'var(--text)',
            color: 'var(--bg-surface)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{
        height: '100vh',
        background: 'var(--bg)',
        color: 'var(--text-30)',
        fontSize: 12,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
      }}
    >
      conectando…
    </div>
  );
}
