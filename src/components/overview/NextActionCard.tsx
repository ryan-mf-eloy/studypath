import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from '@phosphor-icons/react';
import { useUIStore } from '../../store/useUIStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import {
  findNextTopic,
  nextMonthAfter,
  focusLabel,
} from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '1.1px',
        textTransform: 'uppercase',
        color: 'var(--text-30)',
        marginBottom: 14,
        display: 'block',
      }}
    >
      {children}
    </span>
  );
}

export default function NextActionCard() {
  const { t } = useTranslation();
  const activeMonthId = useUIStore(s => s.activeMonthId);
  const setActiveMonth = useUIStore(s => s.setActiveMonth);
  const setActiveView = useUIStore(s => s.setActiveView);
  const setActiveFocusType = useUIStore(s => s.setActiveFocusType);
  const setActivePage = useUIStore(s => s.setActivePage);
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const roadmap = useRoadmap();

  const next = useMemo(
    () => (activeMonthId ? findNextTopic(roadmap, checkedTopics, activeMonthId) : null),
    [activeMonthId, checkedTopics, roadmap],
  );

  const nextMonth = useMemo(
    () => (activeMonthId ? nextMonthAfter(roadmap, activeMonthId) : null),
    [activeMonthId, roadmap],
  );

  // ── Empty state: mês concluído ─────────────────────────────────
  if (!next) {
    return (
      <section>
        <SectionLabel>{t('overview.nextAction.sectionTitle')}</SectionLabel>
        <div
          style={{
            border: '1px solid var(--text-15)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 17,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            {t('overview.nextAction.monthCompleteShort')}
          </p>
          {nextMonth && (
            <button
              type="button"
              onClick={() => {
                setActiveMonth(nextMonth.id);
                setActiveView('day');
                setActivePage('study');
              }}
              className="flex items-center"
              style={{
                gap: 8,
                padding: '8px 14px',
                border: '1px solid var(--text)',
                background: 'transparent',
                cursor: 'pointer',
                alignSelf: 'flex-start',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--text)',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              {t('overview.dailyPlan.advanceTo', { label: nextMonth.label })}
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </section>
    );
  }

  // ── Next topic card ────────────────────────────────────────────
  const subject = resolveFocusMeta(next.focus);
  const SubjectIcon = subject.Icon;

  const handleOpen = () => {
    setActiveMonth(next.month.id);
    setActiveView('day');
    setActiveFocusType(next.focus.type);
    setActivePage('study');
  };

  return (
    <section>
      <SectionLabel>{t('overview.nextAction.sectionTitle')}</SectionLabel>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('overview.nextAction.openInDayFocusAria', { label: next.topic.label })}
        className="flex flex-col"
        style={{
          width: '100%',
          border: '1px solid var(--text-15)',
          background: 'transparent',
          padding: '28px 30px 24px',
          gap: 24,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color var(--transition-fast)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text)';
          const cta = e.currentTarget.querySelector('.sp-next-cta') as HTMLElement | null;
          if (cta) cta.style.backgroundColor = 'var(--accent-coral-hover)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
          const cta = e.currentTarget.querySelector('.sp-next-cta') as HTMLElement | null;
          if (cta) cta.style.backgroundColor = 'var(--accent-coral)';
        }}
      >
        <div className="flex items-start" style={{ gap: 18, width: '100%' }}>
          <SubjectIcon
            size={32}
            weight="regular"
            style={{ color: subject.color, flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 24,
                lineHeight: 1.25,
                color: 'var(--text)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {next.topic.label}
            </h2>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-50)',
                marginTop: 8,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {next.focus.name} · {focusLabel(next.focus.type)}
            </div>
          </div>
        </div>

        <span
          className="sp-next-cta flex items-center justify-center"
          style={{
            width: '100%',
            padding: '13px 20px',
            gap: 10,
            backgroundColor: 'var(--accent-coral)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.3px',
            transition: 'background-color var(--transition-fast)',
          }}
        >
          {t('overview.nextAction.openInDayFocus')}
          <ArrowRight size={16} weight="bold" />
        </span>
      </button>
    </section>
  );
}
