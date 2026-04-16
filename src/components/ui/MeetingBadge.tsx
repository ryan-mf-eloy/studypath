import { useTranslation } from 'react-i18next';
import type { MeetingProvider } from '../../types';
import { meetingProviderLabel } from '../../lib/routineCalendar';
import MeetingProviderLogo from './MeetingProviderLogo';

interface Props {
  url: string;
  provider: MeetingProvider | null;
  /** Compact (10px) for inline slot headers. Default 14px for drawer rows. */
  compact?: boolean;
}

/**
 * Small clickable badge that opens the meeting URL in a new window/tab.
 * Renders the brand-colored MeetingProviderLogo and stops propagation so
 * clicking it doesn't trigger the parent slot's click handler.
 */
export default function MeetingBadge({ url, provider, compact = false }: Props) {
  const { t } = useTranslation();

  if (!provider) return null;

  const size = compact ? 12 : 15;
  const label = meetingProviderLabel(provider);

  return (
    <button
      type="button"
      aria-label={t('routine.openMeetingProvider', { provider: label })}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        window.open(url, '_blank', 'noopener,noreferrer');
      }}
      onMouseDown={(e) => {
        // Keep the slot action menu from treating this as a slot click.
        e.stopPropagation();
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        lineHeight: 0,
        opacity: 0.92,
        transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = '1';
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.opacity = '0.92';
        (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
      }}
    >
      <MeetingProviderLogo provider={provider} size={size} ariaLabel={label} />
    </button>
  );
}
