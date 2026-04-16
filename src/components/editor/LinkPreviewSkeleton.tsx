import { LinkSimple } from '@phosphor-icons/react';
import { Skeleton } from '../ui/Skeleton';

export function LinkPreviewSkeleton({ hostname }: { hostname: string }) {
  return (
    <div
      contentEditable={false}
      aria-label={`Carregando preview de ${hostname}`}
      role="status"
      style={{
        width: '100%',
        display: 'flex',
        gap: 14,
        padding: '14px 16px',
        border: '1px solid var(--text-08)',
        background: 'var(--bg-surface)',
      }}
    >
      <div
        className="sp-skeleton"
        style={{
          width: 64,
          height: 64,
          flexShrink: 0,
        }}
      />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          justifyContent: 'center',
        }}
      >
        <Skeleton width="70%" height={14} />
        <Skeleton width="90%" height={10} />
        <div className="flex items-center" style={{ gap: 6, marginTop: 4 }}>
          <LinkSimple size={12} style={{ color: 'var(--text-30)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-30)' }}>{hostname}</span>
        </div>
      </div>
    </div>
  );
}
