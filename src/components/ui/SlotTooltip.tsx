import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { usePopoverPosition } from './usePopoverPosition';
import MeetingProviderLogo from './MeetingProviderLogo';
import type { Focus } from '../../types';
import type { ResolvedSlot } from '../../lib/routineCalendar';
import {
  detectMeetingProvider,
  meetingProviderLabel,
  formatTime,
  slotColorAlpha,
} from '../../lib/routineCalendar';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import { parseLocalDate } from '../../lib/utils';

interface Props {
  slot: ResolvedSlot;
  focus: Focus | null;
  anchor: HTMLElement;
  /** Fired when the mouse enters the tooltip — used to cancel a pending hide. */
  onMouseEnter?: () => void;
  /** Fired when the mouse leaves the tooltip — used to schedule a hide. */
  onMouseLeave?: () => void;
}

/**
 * Large, minimalist hover tooltip that previews a routine slot. The
 * tooltip is interactive — hovering over it keeps it open and the meeting
 * link can be clicked without the tooltip disappearing.
 */
export default function SlotTooltip({
  slot,
  focus,
  anchor,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const { t, i18n } = useTranslation();
  const popoverRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(anchor);
  anchorRef.current = anchor;

  const pos = usePopoverPosition({
    open: true,
    anchorRef,
    popoverRef,
    gap: 10,
    align: 'start',
  });

  const meta = focus ? resolveFocusMeta(focus) : null;
  const Icon = meta?.Icon ?? null;
  const locale = i18n.language || 'pt-BR';
  const color = slot.color ?? meta?.color ?? 'var(--accent-coral)';
  const label = slot.label?.trim() || focus?.name || t('routine.freeBlockLabel');
  const category =
    slot.status === 'skipped'
      ? t('routine.skipped')
      : slot.status === 'rescheduled-in'
        ? t('routine.rescheduled')
        : (meta?.label ?? t('routine.slotLabel'));

  const dateObj = parseLocalDate(slot.date);
  const weekday = dateObj.toLocaleDateString(locale, { weekday: 'long' });
  const dayLabel = dateObj.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
  });

  const provider = slot.meetingUrl ? detectMeetingProvider(slot.meetingUrl) : null;

  return createPortal(
    <div
      ref={popoverRef}
      role="tooltip"
      aria-live="polite"
      className="sp-popover-enter sp-glass"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
        width: 320,
        padding: '18px 20px',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 20px 48px var(--shadow-md), 0 4px 12px var(--shadow-sm)',
        zIndex: 480,
      }}
    >
      {/* Header: icon chip + category + label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9,
            background: slotColorAlpha(color, 0.15),
            border: `1px solid ${slotColorAlpha(color, 0.35)}`,
          }}
        >
          {Icon ? <Icon size={18} style={{ color }} /> : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--text-30)',
            }}
          >
            {category}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              color: 'var(--text)',
              lineHeight: 1.2,
              marginTop: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {label}
          </div>
        </div>
      </div>

      {/* Schedule row */}
      <div
        style={{
          paddingTop: 14,
          borderTop: '1px solid var(--text-08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: 'var(--text-30)',
          }}
        >
          {t('routine.whenLabel')}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text)',
            textTransform: 'capitalize',
          }}
        >
          {weekday} · {dayLabel}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
          }}
        >
          {formatTime(slot.startTime, locale)} — {formatTime(slot.endTime, locale)}
          <span
            style={{
              marginLeft: 8,
              color: 'var(--text-50)',
              fontWeight: 400,
              fontSize: 11,
            }}
          >
            {formatDuration(slot.durationMin)}
          </span>
        </div>
      </div>

      {/* Rescheduled-in metadata */}
      {slot.status === 'rescheduled-in' && slot.originalDate && (
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: 'var(--text-50)',
          }}
        >
          {t('routine.rescheduledFrom', {
            date: formatShortDate(slot.originalDate, locale),
          })}
        </div>
      )}

      {/* Meeting link */}
      {slot.meetingUrl && provider && (
        <a
          href={slot.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('routine.openMeetingProvider', {
            provider: meetingProviderLabel(provider),
          })}
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--text-08)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            color: 'inherit',
            cursor: 'pointer',
            transition: 'opacity var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.opacity = '0.85';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.opacity = '1';
          }}
        >
          <MeetingProviderLogo provider={provider} size={24} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text)',
              }}
            >
              {meetingProviderLabel(provider)}
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-50)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {shortenUrl(slot.meetingUrl)}
            </div>
          </div>
          <ArrowSquareOut
            size={13}
            weight="bold"
            style={{ color: 'var(--text-50)', flexShrink: 0 }}
          />
        </a>
      )}
    </div>,
    document.body,
  );
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  if (rest === 0) return `${h}h`;
  return `${h}h ${rest}min`;
}

function formatShortDate(ymd: string, locale: string): string {
  const d = parseLocalDate(ymd);
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname;
    const full = `${u.hostname}${path}`;
    return full.length > 42 ? `${full.slice(0, 39)}…` : full;
  } catch {
    return url.length > 42 ? `${url.slice(0, 39)}…` : url;
  }
}
