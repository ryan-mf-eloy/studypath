import { Skeleton } from '../ui/Skeleton';

interface NoteEditorSkeletonProps {
  fullscreen?: boolean;
}

export function NoteEditorSkeleton({ fullscreen = false }: NoteEditorSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Carregando editor"
      style={{
        paddingLeft: 54,
        paddingRight: 54,
        paddingTop: 24,
        paddingBottom: 48,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width="92%" height={14} />
        <Skeleton width="78%" height={14} />
        <Skeleton width="64%" height={14} />
      </div>

      <Skeleton
        width={fullscreen ? 320 : 240}
        height={22}
        style={{ marginTop: 18, marginBottom: 2 }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton width="88%" height={14} />
        <Skeleton width="70%" height={14} />
      </div>

      <div
        style={{
          marginTop: 14,
          padding: '18px 20px',
          background: 'var(--text-08)',
          border: '1px solid var(--text-08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <Skeleton width="40%" height={10} style={{ opacity: 0.6 }} />
        <Skeleton width="72%" height={10} style={{ opacity: 0.6 }} />
        <Skeleton width="55%" height={10} style={{ opacity: 0.6 }} />
        <Skeleton width="30%" height={10} style={{ opacity: 0.6 }} />
      </div>

      <Skeleton width="82%" height={14} style={{ marginTop: 8 }} />
    </div>
  );
}
