import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { X, Minus, Plus, CaretLeft, Check } from '@phosphor-icons/react';
import {
  generatePeriods,
  nextPeriodStart,
  type PeriodCadence,
  type PeriodEntry,
} from '../../lib/utils';
import { useRoadmap } from '../../store/useRoadmapStore';
import { DatePicker } from '../ui/DatePicker';
import type { Phase } from '../../types';

interface AddPeriodDialogProps {
  phase: Phase;
  onAdd: (entry: { id: string; label: string }) => Promise<void> | void;
  onClose: () => void;
}

interface CadenceMeta {
  value: PeriodCadence;
  labelKey: string;
  descriptionKey: string;
  emoji: string;
}

const CADENCES: CadenceMeta[] = [
  { value: 'week',      labelKey: 'addPeriod.cadences.week',      descriptionKey: 'addPeriod.cadences.weekDescription',      emoji: '📅' },
  { value: 'fortnight', labelKey: 'addPeriod.cadences.fortnight', descriptionKey: 'addPeriod.cadences.fortnightDescription', emoji: '🌓' },
  { value: 'month',     labelKey: 'addPeriod.cadences.month',     descriptionKey: 'addPeriod.cadences.monthDescription',     emoji: '🗓' },
  { value: 'quarter',   labelKey: 'addPeriod.cadences.quarter',   descriptionKey: 'addPeriod.cadences.quarterDescription',   emoji: '🏔' },
];

/**
 * Wizard de 2 passos pra criar períodos no plano. Passo 1: escolher cadência.
 * Passo 2: ajustar data de início + quantidade e ver preview dos períodos
 * que serão criados. Interface limpa, sem exibição de IDs internos.
 */
export default function AddPeriodDialog({ phase, onAdd, onClose }: AddPeriodDialogProps) {
  const { t } = useTranslation();
  const roadmap = useRoadmap();
  const [cadence, setCadence] = useState<PeriodCadence | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [count, setCount] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTakenIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of roadmap.phases) {
      for (const m of p.months) set.add(m.id);
    }
    return set;
  }, [roadmap.phases]);

  // When a cadence is picked, compute a sensible default start date.
  useEffect(() => {
    if (!cadence) return;
    const suggested = nextPeriodStart(phase.months.map((m) => m.id));
    // For month/quarter, snap to 1st.
    if (cadence === 'month' || cadence === 'quarter') {
      suggested.setDate(1);
    }
    const y = suggested.getFullYear();
    const m = String(suggested.getMonth() + 1).padStart(2, '0');
    const d = String(suggested.getDate()).padStart(2, '0');
    setStartDate(`${y}-${m}-${d}`);
    setCount(1);
    setError(null);
  }, [cadence, phase.months]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const previews: PeriodEntry[] = useMemo(() => {
    if (!cadence || !startDate) return [];
    const [y, m, d] = startDate.split('-').map(Number);
    if (!y || !m || !d) return [];
    return generatePeriods(cadence, new Date(y, m - 1, d), count, allTakenIds);
  }, [cadence, startDate, count, allTakenIds]);

  const someConflict = previews.length < count;

  const commit = async () => {
    if (!cadence || previews.length === 0) return;
    if (someConflict) {
      setError(
        t('addPeriod.conflictError'),
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const entry of previews) {
        await onAdd({ id: entry.id, label: entry.label });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <>
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
      <div
        role="dialog"
        aria-label={t('addPeriod.title')}
        className="sp-glass"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 560,
          maxWidth: '92vw',
          maxHeight: '86vh',
          overflowY: 'auto',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 30px 80px var(--shadow-md)',
          zIndex: 450,
          animation: 'sp-confirm-modal-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center"
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--text-08)',
            gap: 12,
          }}
        >
          {cadence && (
            <button
              type="button"
              onClick={() => setCadence(null)}
              aria-label={t('common.back')}
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-50)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <CaretLeft size={16} />
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: 'var(--text-30)',
                marginBottom: 3,
              }}
            >
              {phase.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                color: 'var(--text)',
                lineHeight: 1.15,
              }}
            >
              {cadence ? t('addPeriod.questionStart') : t('addPeriod.questionCadence')}
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
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          {!cadence ? (
            <>
              <p
                style={{
                  fontSize: 12.5,
                  color: 'var(--text-50)',
                  lineHeight: 1.6,
                  margin: '0 0 18px',
                }}
              >
                {t('addPeriod.description')}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                }}
              >
                {CADENCES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCadence(c.value)}
                    className="flex"
                    style={{
                      flexDirection: 'column',
                      gap: 8,
                      padding: '18px 16px',
                      background: 'transparent',
                      border: '1px solid var(--text-15)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition:
                        'background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-30)';
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <span style={{ fontSize: 26, lineHeight: 1 }}>{c.emoji}</span>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text)',
                      }}
                    >
                      {t(c.labelKey)}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--text-50)',
                        lineHeight: 1.4,
                      }}
                    >
                      {t(c.descriptionKey)}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Start date */}
              <div style={{ marginBottom: 16 }}>
                <label style={LABEL}>{t('addPeriod.startsOn')}</label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  ariaLabel={t('addPeriod.startsOn')}
                />
              </div>

              {/* Quantity stepper */}
              <div style={{ marginBottom: 18 }}>
                <label style={LABEL}>{t('addPeriod.repetitions')}</label>
                <div
                  className="flex items-center"
                  style={{
                    gap: 0,
                    border: '1px solid var(--text-15)',
                    width: 'fit-content',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setCount((c) => Math.max(1, c - 1))}
                    disabled={count <= 1}
                    aria-label={t('addPeriod.decrease')}
                    className="flex items-center justify-center"
                    style={{
                      width: 38,
                      height: 38,
                      background: 'transparent',
                      border: 'none',
                      color: count <= 1 ? 'var(--text-30)' : 'var(--text-50)',
                      cursor: count <= 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <div
                    style={{
                      minWidth: 52,
                      textAlign: 'center',
                      fontSize: 15,
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--text)',
                      borderLeft: '1px solid var(--text-08)',
                      borderRight: '1px solid var(--text-08)',
                      padding: '10px 0',
                    }}
                  >
                    {count}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCount((c) => Math.min(24, c + 1))}
                    disabled={count >= 24}
                    aria-label={t('addPeriod.increase')}
                    className="flex items-center justify-center"
                    style={{
                      width: 38,
                      height: 38,
                      background: 'transparent',
                      border: 'none',
                      color: count >= 24 ? 'var(--text-30)' : 'var(--text-50)',
                      cursor: count >= 24 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div style={{ marginBottom: 18 }}>
                <label style={LABEL}>{t('addPeriod.preview')}</label>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: '1px solid var(--text-08)',
                    padding: 10,
                  }}
                >
                  {previews.length === 0 ? (
                    <div
                      style={{
                        padding: '10px 6px',
                        fontSize: 12,
                        color: 'var(--text-30)',
                        textAlign: 'center',
                      }}
                    >
                      {t('addPeriod.definePreviewHint')}
                    </div>
                  ) : (
                    previews.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center"
                        style={{
                          gap: 10,
                          padding: '6px 8px',
                          background: 'transparent',
                        }}
                      >
                        <span
                          style={{
                            width: 22,
                            fontSize: 10,
                            color: 'var(--text-30)',
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 600,
                          }}
                        >
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            color: 'var(--text)',
                            flex: 1,
                          }}
                        >
                          {p.label}
                        </span>
                      </div>
                    ))
                  )}
                  {someConflict && previews.length > 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 11,
                        color: 'var(--accent-coral)',
                      }}
                    >
                      {t('addPeriod.conflictWarning')}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: '10px 12px',
                    border: '1px solid var(--accent-coral)',
                    background: 'var(--focus-main-bg)',
                    color: 'var(--accent-coral)',
                    fontSize: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <div className="flex items-center" style={{ gap: 10 }}>
                <button
                  type="button"
                  onClick={commit}
                  disabled={saving || previews.length === 0}
                  className="flex items-center"
                  style={{
                    gap: 6,
                    padding: '11px 20px',
                    border: '1px solid var(--text)',
                    background: 'var(--text)',
                    color: 'var(--bg-surface)',
                    cursor: saving || previews.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: saving || previews.length === 0 ? 0.4 : 1,
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Check size={13} weight="bold" />
                  {previews.length > 1
                    ? t('addPeriod.addPlural', { count: previews.length })
                    : t('addPeriod.addSingle')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '11px 16px',
                    border: '1px solid var(--text-15)',
                    background: 'transparent',
                    color: 'var(--text-50)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 13,
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
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
