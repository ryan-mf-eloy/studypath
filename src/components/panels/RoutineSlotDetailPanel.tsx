import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trash, Minus, Plus, VideoCamera, ArrowSquareOut } from '@phosphor-icons/react';
import MeetingProviderLogo from '../ui/MeetingProviderLogo';
import type { RoutineSlot, DayOfWeek, Focus, Topic, Subtopic } from '../../types';
import { TimePicker } from '../ui/TimePicker';
import { Select, type SelectOption } from '../ui/Select';
import ColorPicker from '../ui/ColorPicker';
import { useRoutineStore } from '../../store/useRoutineStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { useSubtopicsStore } from '../../store/useSubtopicsStore';
import { confirm } from '../../store/useConfirmStore';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import {
  addMinutesToTime,
  detectMeetingProvider,
  meetingProviderLabel,
  SLOT_MIN_DURATION,
  SLOT_MAX_DURATION,
  SLOT_DURATION_STEP,
} from '../../lib/routineCalendar';

interface Props {
  slot: RoutineSlot | null;
  onClose: () => void;
}

const DAY_KEYS: Array<keyof typeof DOW_LABEL_MAP> = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];
const DOW_LABEL_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
} as const;

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

export default function RoutineSlotDetailPanel({ slot, onClose }: Props) {
  const { t } = useTranslation();
  const roadmap = useRoadmap();
  const allSubtopics = useSubtopicsStore(s => s.subtopics);
  const updateSlot = useRoutineStore(s => s.updateSlot);
  const removeSlot = useRoutineStore(s => s.removeSlot);

  // Local draft state mirrors the slot; every change auto-saves.
  const [label, setLabel] = useState(slot?.label ?? '');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>(slot?.dayOfWeek ?? 1);
  const [startTime, setStartTime] = useState(slot?.startTime ?? '08:00');
  const [durationMin, setDurationMin] = useState(slot?.durationMin ?? 60);
  const [focusId, setFocusId] = useState(slot?.focusId ?? '');
  const [topicId, setTopicId] = useState(slot?.topicId ?? '');
  const [subtopicId, setSubtopicId] = useState(slot?.subtopicId ?? '');
  const [color, setColor] = useState<string | undefined>(slot?.color);
  const [meetingUrl, setMeetingUrl] = useState(slot?.meetingUrl ?? '');
  const [active, setActive] = useState(slot?.active ?? true);

  // Only re-sync when we switch to a different slot (id changes), not when the
  // same slot is mutated by our own auto-save — otherwise we clobber uncommitted
  // input (e.g., label text typed but not yet blurred).
  useEffect(() => {
    if (!slot) return;
    setLabel(slot.label ?? '');
    setDayOfWeek(slot.dayOfWeek);
    setStartTime(slot.startTime);
    setDurationMin(slot.durationMin);
    setFocusId(slot.focusId ?? '');
    setTopicId(slot.topicId ?? '');
    setSubtopicId(slot.subtopicId ?? '');
    setColor(slot.color);
    setMeetingUrl(slot.meetingUrl ?? '');
    setActive(slot.active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot?.id]);

  // Esc to close
  useEffect(() => {
    if (!slot) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [slot, onClose]);

  // Flat lists for cascading selects
  const allFocuses = useMemo<Focus[]>(() => {
    const out: Focus[] = [];
    for (const p of roadmap.phases) for (const m of p.months) for (const f of m.focuses) out.push(f);
    return out;
  }, [roadmap.phases]);

  const selectedFocus = useMemo(
    () => allFocuses.find(f => f.id === focusId) ?? null,
    [allFocuses, focusId],
  );
  const topicsOfFocus: Topic[] = selectedFocus?.topics ?? [];
  const subtopicsOfTopic: Subtopic[] = topicId ? (allSubtopics[topicId] ?? []) : [];

  // Auto-save helpers
  const saveUpdate = (patch: Parameters<typeof updateSlot>[1]) => {
    if (!slot) return;
    updateSlot(slot.id, patch);
  };

  const commitLabel = () => {
    if (!slot) return;
    const trimmed = label.trim();
    if (trimmed === (slot.label ?? '')) return;
    saveUpdate({ label: trimmed || null });
  };

  const commitDayOfWeek = (d: DayOfWeek) => {
    setDayOfWeek(d);
    saveUpdate({ dayOfWeek: d });
  };

  const commitStartTime = (next: string) => {
    setStartTime(next);
    saveUpdate({ startTime: next });
  };

  const commitDuration = (next: number) => {
    const clamped = Math.max(SLOT_MIN_DURATION, Math.min(SLOT_MAX_DURATION, next));
    setDurationMin(clamped);
    saveUpdate({ durationMin: clamped });
  };

  const commitFocus = (next: string) => {
    setFocusId(next);
    setTopicId('');
    setSubtopicId('');
    saveUpdate({
      focusId: next || null,
      topicId: null,
      subtopicId: null,
    });
  };

  const commitTopic = (next: string) => {
    setTopicId(next);
    setSubtopicId('');
    saveUpdate({ topicId: next || null, subtopicId: null });
  };

  const commitSubtopic = (next: string) => {
    setSubtopicId(next);
    saveUpdate({ subtopicId: next || null });
  };

  const commitColor = (next: string | undefined) => {
    setColor(next);
    saveUpdate({ color: next ?? null });
  };

  const commitMeetingUrl = () => {
    if (!slot) return;
    const trimmed = meetingUrl.trim();
    const current = (slot.meetingUrl ?? '').trim();
    if (trimmed === current) return;
    // Empty clears the link; otherwise require http(s) prefix (we auto-add if missing).
    if (trimmed === '') {
      saveUpdate({ meetingUrl: null });
      return;
    }
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setMeetingUrl(withScheme);
    saveUpdate({ meetingUrl: withScheme });
  };

  const commitActive = (next: boolean) => {
    setActive(next);
    saveUpdate({ active: next });
  };

  const handleDelete = async () => {
    if (!slot) return;
    const ok = await confirm({
      title: t('routine.deleteSlot'),
      message: t('routine.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    removeSlot(slot.id);
    onClose();
  };

  if (!slot) return null;

  const focusOptions: SelectOption<string>[] = [
    { value: '', label: t('routine.noFocusLink') },
    ...allFocuses.map(f => {
      const meta = resolveFocusMeta(f);
      return {
        value: f.id,
        label: f.name,
        color: meta.color,
      };
    }),
  ];

  const topicOptions: SelectOption<string>[] = [
    { value: '', label: t('routine.noTopicLink') },
    ...topicsOfFocus.map(topic => ({ value: topic.id, label: topic.label })),
  ];

  const subtopicOptions: SelectOption<string>[] = [
    { value: '', label: t('routine.noSubtopicLink') },
    ...subtopicsOfTopic.map(st => ({ value: st.id, label: st.label })),
  ];

  const meta = selectedFocus ? resolveFocusMeta(selectedFocus) : null;
  const detectedMeetingProvider = detectMeetingProvider(meetingUrl);
  const endTime = addMinutesToTime(startTime, durationMin);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-backdrop)',
          zIndex: 440,
          animation: 'sp-confirm-backdrop-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label={t('routine.editSlot')}
        className="sp-glass"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 520,
          maxWidth: '100vw',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-16px 0 40px var(--shadow-md)',
          zIndex: 450,
          display: 'flex',
          flexDirection: 'column',
          animation: 'sp-pop-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          transformOrigin: 'right center',
        }}
      >
        {/* Header */}
        <header
          className="flex items-center"
          style={{
            padding: '18px 22px 16px',
            gap: 12,
            borderBottom: '1px solid var(--text-08)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              background: meta ? `${meta.color}1f` : 'var(--text-08)',
            }}
          >
            {meta ? (
              <meta.Icon size={18} style={{ color: meta.color }} />
            ) : (
              <span style={{ fontSize: 18 }}>⏱</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: 'var(--text-30)',
              }}
            >
              {t('routine.slotLabel')}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                color: 'var(--text)',
                lineHeight: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {label.trim() || selectedFocus?.name || t('routine.freeBlockLabel')}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-50)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </header>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '22px 22px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Label */}
          <section>
            <label style={LABEL} htmlFor={`slot-label-${slot.id}`}>
              {t('routine.labelField')}
            </label>
            <input
              id={`slot-label-${slot.id}`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={commitLabel}
              placeholder={t('routine.labelPlaceholder')}
              style={INPUT}
            />
          </section>

          {/* Day of week segmented control */}
          <section>
            <div style={LABEL}>{t('routine.dayOfWeek')}</div>
            <div
              className="flex"
              style={{
                gap: 4,
                background: 'var(--text-04)',
                padding: 3,
              }}
            >
              {DAY_KEYS.map((k) => {
                const d = DOW_LABEL_MAP[k] as DayOfWeek;
                const isActive = d === dayOfWeek;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => commitDayOfWeek(d)}
                    aria-pressed={isActive}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      background: isActive ? 'var(--bg-surface)' : 'transparent',
                      border: 'none',
                      color: isActive ? 'var(--text)' : 'var(--text-50)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 11,
                      fontWeight: isActive ? 600 : 500,
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                      boxShadow: isActive
                        ? '0 1px 4px var(--shadow-sm)'
                        : 'none',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    {t(`routine.weekdaysShort.${k}`)}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Time + duration */}
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
            }}
          >
            <div>
              <div style={LABEL}>{t('routine.startTime')}</div>
              <TimePicker
                value={startTime}
                onChange={commitStartTime}
                ariaLabel={t('routine.startTime')}
              />
            </div>
            <div>
              <div style={LABEL}>{t('routine.duration')}</div>
              <div
                className="flex items-center"
                style={{
                  gap: 6,
                  border: '1px solid var(--text-15)',
                  padding: '4px 6px',
                  background: 'var(--bg-surface)',
                }}
              >
                <button
                  type="button"
                  aria-label={t('routine.decreaseDuration')}
                  onClick={() => commitDuration(durationMin - SLOT_DURATION_STEP)}
                  disabled={durationMin <= SLOT_MIN_DURATION}
                  style={STEPPER_BTN}
                >
                  <Minus size={12} weight="bold" />
                </button>
                <span
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    fontSize: 13,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--text)',
                  }}
                >
                  {formatDuration(durationMin, t)}
                </span>
                <button
                  type="button"
                  aria-label={t('routine.increaseDuration')}
                  onClick={() => commitDuration(durationMin + SLOT_DURATION_STEP)}
                  disabled={durationMin >= SLOT_MAX_DURATION}
                  style={STEPPER_BTN}
                >
                  <Plus size={12} weight="bold" />
                </button>
              </div>
              <div
                className="flex"
                style={{ gap: 4, marginTop: 6, flexWrap: 'wrap' }}
              >
                {DURATION_PRESETS.map(p => {
                  const sel = p === durationMin;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => commitDuration(p)}
                      style={{
                        padding: '3px 8px',
                        fontSize: 10,
                        background: sel ? 'var(--text)' : 'transparent',
                        color: sel ? 'var(--bg-surface)' : 'var(--text-50)',
                        border: '1px solid var(--text-15)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatDuration(p, t)}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-50)',
              marginTop: -10,
            }}
          >
            {t('routine.endsAt', { time: endTime })}
          </div>

          {/* Linking cascade */}
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              paddingTop: 8,
              borderTop: '1px solid var(--text-08)',
            }}
          >
            <div style={LABEL}>{t('routine.linkLabel')}</div>
            <div>
              <div style={SUBLABEL}>{t('routine.focusLink')}</div>
              <Select
                value={focusId}
                options={focusOptions}
                onChange={commitFocus}
                fullWidth
                ariaLabel={t('routine.focusLink')}
              />
            </div>
            <div>
              <div style={SUBLABEL}>{t('routine.topicLink')}</div>
              <Select
                value={topicId}
                options={topicOptions}
                onChange={commitTopic}
                disabled={!focusId}
                fullWidth
                ariaLabel={t('routine.topicLink')}
              />
            </div>
            {subtopicsOfTopic.length > 0 && (
              <div>
                <div style={SUBLABEL}>{t('routine.subtopicLink')}</div>
                <Select
                  value={subtopicId}
                  options={subtopicOptions}
                  onChange={commitSubtopic}
                  disabled={!topicId}
                  fullWidth
                  ariaLabel={t('routine.subtopicLink')}
                />
              </div>
            )}
          </section>

          {/* Meeting link */}
          <section>
            <div style={LABEL}>{t('routine.meetingLink')}</div>
            <div
              className="flex items-center"
              style={{
                gap: 8,
                border: '1px solid var(--text-15)',
                background: 'var(--bg-surface)',
                padding: '4px 10px',
              }}
            >
              {detectedMeetingProvider ? (
                <MeetingProviderLogo
                  provider={detectedMeetingProvider}
                  size={16}
                  ariaLabel={meetingProviderLabel(detectedMeetingProvider)}
                />
              ) : (
                <VideoCamera
                  size={14}
                  weight="regular"
                  style={{ color: 'var(--text-50)', flexShrink: 0 }}
                />
              )}
              <input
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                onBlur={commitMeetingUrl}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                }}
                placeholder={t('routine.meetingLinkPlaceholder')}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  padding: '6px 0',
                  minWidth: 0,
                }}
              />
              {meetingUrl.trim() && (
                <button
                  type="button"
                  aria-label={t('routine.openMeeting')}
                  onClick={() => {
                    const trimmed = meetingUrl.trim();
                    const withScheme = /^https?:\/\//i.test(trimmed)
                      ? trimmed
                      : `https://${trimmed}`;
                    window.open(withScheme, '_blank', 'noopener,noreferrer');
                  }}
                  style={{
                    flexShrink: 0,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-50)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
                  }}
                >
                  <ArrowSquareOut size={13} weight="bold" />
                </button>
              )}
            </div>
            {detectedMeetingProvider && (
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-50)',
                  marginTop: 6,
                }}
              >
                {t('routine.meetingProviderDetected', {
                  provider: meetingProviderLabel(detectedMeetingProvider),
                })}
              </div>
            )}
          </section>

          {/* Color override */}
          <section>
            <div style={LABEL}>{t('routine.colorOverride')}</div>
            <ColorPicker
              value={color}
              onChange={commitColor}
              fallback={meta?.color}
              ariaLabel={t('routine.colorOverride')}
            />
          </section>

          {/* Active toggle */}
          <section
            className="flex items-center"
            style={{
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px solid var(--text-08)',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                {active ? t('routine.active') : t('routine.inactive')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-50)', marginTop: 2 }}>
                {t('routine.activeHint')}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => commitActive(!active)}
              style={{
                width: 38,
                height: 22,
                borderRadius: 11,
                border: 'none',
                background: active ? 'var(--accent-green)' : 'var(--text-15)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color var(--transition-fast)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: active ? 18 : 2,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'var(--bg-surface)',
                  transition: 'left var(--transition-fast)',
                  boxShadow: '0 1px 3px var(--shadow-sm)',
                }}
              />
            </button>
          </section>
        </div>

        {/* Footer — delete */}
        <footer
          className="flex"
          style={{
            padding: '14px 22px',
            borderTop: '1px solid var(--text-08)',
            flexShrink: 0,
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center"
            style={{
              gap: 8,
              padding: '8px 14px',
              background: 'transparent',
              border: '1px solid var(--text-15)',
              color: 'var(--text-50)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-coral)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-coral)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
            }}
          >
            <Trash size={13} />
            {t('routine.deleteSlot')}
          </button>
        </footer>
      </aside>
    </>
  );
}

function formatDuration(min: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (min < 60) return t('routine.durationMinutes', { count: min });
  const hours = Math.floor(min / 60);
  const rest = min % 60;
  if (rest === 0) return t('routine.durationHours', { count: hours });
  return t('routine.durationHoursMinutes', { hours, minutes: rest });
}

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: 'var(--text-30)',
  marginBottom: 8,
};

const SUBLABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 500,
  color: 'var(--text-50)',
  marginBottom: 5,
};

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--text-15)',
  background: 'var(--bg-surface)',
  color: 'var(--text)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
};

const STEPPER_BTN: React.CSSProperties = {
  width: 24,
  height: 24,
  border: 'none',
  background: 'var(--text-04)',
  color: 'var(--text-50)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};
