import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Check, Minus, X } from '@phosphor-icons/react';
import { useReviewStore, type ReviewEntry } from '../../store/useReviewStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useUIStore } from '../../store/useUIStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { findTopicContext, timeAgo } from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import type { ReviewResult } from '../../lib/srs';

const MAX_VISIBLE = 3;

export default function ReviewSection() {
  const { t } = useTranslation();
  const reviews = useReviewStore(s => s.reviews);
  const recordReview = useReviewStore(s => s.recordReview);
  const checkedAt = useProgressStore(s => s.checkedAt);
  const setActiveMonth = useUIStore(s => s.setActiveMonth);
  const setActiveView = useUIStore(s => s.setActiveView);
  const setActiveFocusType = useUIStore(s => s.setActiveFocusType);
  const setActivePage = useUIStore(s => s.setActivePage);
  const roadmap = useRoadmap();

  const [showAll, setShowAll] = useState(false);

  // Compute due reviews reactively (reviews is the dependency, not a method)
  const dueReviews = useMemo(() => {
    const now = Date.now();
    return Object.values(reviews)
      .filter(r => new Date(r.nextReviewAt).getTime() <= now)
      .sort(
        (a, b) =>
          new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime(),
      );
  }, [reviews]);

  if (dueReviews.length === 0) return null;

  const visibleReviews = showAll ? dueReviews : dueReviews.slice(0, MAX_VISIBLE);
  const remaining = dueReviews.length - visibleReviews.length;

  const handleOpenTopic = (review: ReviewEntry) => {
    const ctx = findTopicContext(roadmap, review.topicId);
    if (!ctx) return;
    setActiveMonth(ctx.month.id);
    setActiveView('day');
    setActiveFocusType(ctx.focus.type);
    setActivePage('study');
  };

  return (
    <section data-review-section>
      <div
        className="flex items-baseline"
        style={{ gap: 10, marginBottom: 14 }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <Brain size={14} weight="regular" style={{ color: 'var(--accent-coral)' }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--text-30)',
            }}
          >
            {t('overview.review.title')}
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-50)' }}>
          {t('overview.review.topicsToRemember', { count: dueReviews.length })}
        </span>
      </div>

      <div className="flex flex-col" style={{ gap: 10 }}>
        {visibleReviews.map(review => (
          <ReviewCard
            key={review.topicId}
            review={review}
            firstLearnedAt={checkedAt[review.topicId]}
            onOpen={() => handleOpenTopic(review)}
            onResult={(result) => recordReview(review.topicId, result)}
          />
        ))}

        {remaining > 0 && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            style={{
              padding: '10px 14px',
              border: '1px dashed var(--text-15)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--text-50)',
              textAlign: 'center',
              transition: 'border-color var(--transition-fast), color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-30)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
            }}
          >
            {t('overview.review.viewAll', { count: remaining })}
          </button>
        )}
      </div>
    </section>
  );
}

/* ─── ReviewCard ─────────────────────────────────────────── */

interface ReviewCardProps {
  review: ReviewEntry;
  firstLearnedAt?: string;
  onOpen: () => void;
  onResult: (result: ReviewResult) => void;
}

function ReviewCard({ review, firstLearnedAt, onOpen, onResult }: ReviewCardProps) {
  const { t } = useTranslation();
  const roadmap = useRoadmap();
  const ctx = findTopicContext(roadmap, review.topicId);
  if (!ctx) return null;

  const subject = resolveFocusMeta(ctx.focus);
  const SubjectIcon = subject.Icon;

  return (
    <div
      style={{
        border: '1px solid var(--text-15)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'border-color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--text-30)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--text-15)';
      }}
    >
      {/* Topic row — clickable */}
      <button
        type="button"
        onClick={onOpen}
        className="flex items-start"
        style={{
          gap: 14,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0,
          width: '100%',
        }}
      >
        <SubjectIcon
          size={20}
          weight="regular"
          style={{ color: subject.color, flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 16,
              color: 'var(--text)',
              lineHeight: 1.3,
              marginBottom: 4,
            }}
          >
            {ctx.topic.label}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-30)',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <span>{ctx.focus.name}</span>
            {firstLearnedAt && (
              <>
                <span style={{ color: 'var(--text-15)' }}>·</span>
                <span>{t('overview.review.studiedTime', { time: timeAgo(firstLearnedAt) })}</span>
              </>
            )}
          </div>
        </div>
      </button>

      {/* Action buttons — evaluate memory */}
      <div className="flex items-center" style={{ gap: 6 }}>
        <ReviewActionButton
          onClick={() => onResult('forgot')}
          icon={<X size={12} weight="bold" />}
          label={t('overview.review.forgotten')}
          variant="danger"
        />
        <ReviewActionButton
          onClick={() => onResult('partial')}
          icon={<Minus size={12} weight="bold" />}
          label={t('overview.review.partial')}
          variant="neutral"
        />
        <ReviewActionButton
          onClick={() => onResult('good')}
          icon={<Check size={12} weight="bold" />}
          label={t('overview.review.remember')}
          variant="success"
        />
      </div>
    </div>
  );
}

interface ReviewActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant: 'danger' | 'neutral' | 'success';
}

function ReviewActionButton({ onClick, icon, label, variant }: ReviewActionButtonProps) {
  const colors = {
    danger: { border: 'var(--text-15)', color: 'var(--text-50)', hoverBorder: 'var(--accent-coral)', hoverColor: 'var(--accent-coral)' },
    neutral: { border: 'var(--text-15)', color: 'var(--text-50)', hoverBorder: 'var(--text)', hoverColor: 'var(--text)' },
    success: { border: 'var(--text-15)', color: 'var(--text-50)', hoverBorder: 'var(--accent-green)', hoverColor: 'var(--accent-green)' },
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center"
      style={{
        flex: 1,
        padding: '9px 12px',
        gap: 6,
        border: `1px solid ${colors.border}`,
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 500,
        color: colors.color,
        transition:
          'border-color var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = colors.hoverBorder;
        (e.currentTarget as HTMLButtonElement).style.color = colors.hoverColor;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = colors.border;
        (e.currentTarget as HTMLButtonElement).style.color = colors.color;
      }}
    >
      {icon}
      {label}
    </button>
  );
}
