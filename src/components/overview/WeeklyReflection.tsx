import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkle, PencilSimple } from '@phosphor-icons/react';
import { useJournalStore, type PaceFeel, type WeeklyReflection as WR } from '../../store/useJournalStore';
import { timeAgo } from '../../lib/utils';

const PACE_OPTIONS: { value: PaceFeel; emoji: string; labelKey: string }[] = [
  { value: 'chill',  emoji: '😌', labelKey: 'overview.weeklyReflection.pace.chill' },
  { value: 'tight',  emoji: '😤', labelKey: 'overview.weeklyReflection.pace.tight' },
  { value: 'behind', emoji: '😅', labelKey: 'overview.weeklyReflection.pace.behind' },
];

export default function WeeklyReflectionSection() {
  const { t } = useTranslation();
  const reflections = useJournalStore(s => s.reflections);
  const addReflection = useJournalStore(s => s.addReflection);

  const currentWeekKey = useMemo(() => {
    const d = new Date();
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    return `${utc.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
  }, []);

  const alreadyWroteThisWeek = reflections.some(r => r.weekKey === currentWeekKey);
  const recent = useMemo(
    () =>
      [...reflections]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 3),
    [reflections],
  );

  const [writing, setWriting] = useState(false);
  const [hardest, setHardest] = useState('');
  const [pace, setPace] = useState<PaceFeel>('chill');
  const [noteToSelf, setNoteToSelf] = useState('');

  // Section is hidden if: no prior reflections AND already wrote this week
  // (nothing to show). It's shown when there's either recent history or a
  // reflection opportunity.
  if (reflections.length === 0 && alreadyWroteThisWeek) return null;

  const handleSubmit = () => {
    if (!hardest.trim() && !noteToSelf.trim()) {
      setWriting(false);
      return;
    }
    addReflection({
      weekKey: currentWeekKey,
      hardest: hardest.trim(),
      toReview: [],
      pace,
      noteToSelf: noteToSelf.trim(),
    });
    setHardest('');
    setNoteToSelf('');
    setPace('chill');
    setWriting(false);
  };

  return (
    <section>
      <div
        className="flex items-baseline"
        style={{ gap: 10, marginBottom: 14 }}
      >
        <div className="flex items-center" style={{ gap: 8 }}>
          <Sparkle size={13} weight="regular" style={{ color: 'var(--text-50)' }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--text-30)',
            }}
          >
            {t('overview.weeklyReflection.title')}
          </span>
        </div>
        {!alreadyWroteThisWeek && !writing && (
          <button
            type="button"
            onClick={() => setWriting(true)}
            style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              border: '1px solid var(--text-15)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-50)',
              transition: 'border-color var(--transition-fast), color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
            }}
          >
            {t('overview.weeklyReflection.writeThisWeek')}
          </button>
        )}
      </div>

      {writing ? (
        <div
          style={{
            border: '1px solid var(--text-15)',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--text-30)',
                marginBottom: 6,
              }}
            >
              {t('overview.weeklyReflection.hardestQuestion')}
            </label>
            <textarea
              value={hardest}
              onChange={(e) => setHardest(e.target.value)}
              rows={2}
              placeholder={t('overview.weeklyReflection.hardestPlaceholder')}
              style={{
                width: '100%',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--text)',
                background: 'transparent',
                border: '1px solid var(--text-08)',
                padding: '8px 10px',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--text-30)',
                marginBottom: 6,
              }}
            >
              {t('overview.weeklyReflection.paceQuestion')}
            </label>
            <div className="flex" style={{ gap: 6 }}>
              {PACE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPace(opt.value)}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    border: `1px solid ${pace === opt.value ? 'var(--text)' : 'var(--text-15)'}`,
                    background: pace === opt.value ? 'var(--text-08)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontFamily: 'var(--font-sans)',
                    color: pace === opt.value ? 'var(--text)' : 'var(--text-50)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--text-30)',
                marginBottom: 6,
              }}
            >
              {t('overview.weeklyReflection.noteToSelf')}
            </label>
            <textarea
              value={noteToSelf}
              onChange={(e) => setNoteToSelf(e.target.value)}
              rows={2}
              placeholder={t('overview.weeklyReflection.noteToSelfPlaceholder')}
              style={{
                width: '100%',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--text)',
                background: 'transparent',
                border: '1px solid var(--text-08)',
                padding: '8px 10px',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5,
              }}
            />
          </div>

          <div className="flex items-center" style={{ gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setWriting(false)}
              style={{
                padding: '8px 14px',
                border: '1px solid var(--text-15)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: 'var(--font-sans)',
                color: 'var(--text-50)',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              style={{
                padding: '8px 16px',
                border: '1px solid var(--text)',
                background: 'var(--text)',
                color: 'var(--bg-surface)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {t('overview.weeklyReflection.save')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 10 }}>
          {recent.length === 0 ? (
            <div
              style={{
                padding: '20px 22px',
                border: '1px dashed var(--text-15)',
                textAlign: 'center',
                fontSize: 12,
                color: 'var(--text-30)',
                lineHeight: 1.6,
              }}
            >
              {t('overview.weeklyReflection.empty')}
              <br />
              {t('overview.weeklyReflection.emptyHint')}
            </div>
          ) : (
            recent.map((r) => <ReflectionCard key={r.id} reflection={r} />)
          )}
        </div>
      )}
    </section>
  );
}

function ReflectionCard({ reflection }: { reflection: WR }) {
  const { t } = useTranslation();
  const paceOption = PACE_OPTIONS.find(o => o.value === reflection.pace);
  return (
    <div
      style={{
        border: '1px solid var(--text-08)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        className="flex items-center"
        style={{
          gap: 8,
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.8px',
          textTransform: 'uppercase',
          color: 'var(--text-30)',
        }}
      >
        <span>{reflection.weekKey}</span>
        {paceOption && (
          <>
            <span style={{ color: 'var(--text-15)' }}>·</span>
            <span>{paceOption.emoji} {t(paceOption.labelKey)}</span>
          </>
        )}
        <span style={{ marginLeft: 'auto', color: 'var(--text-30)', textTransform: 'none', letterSpacing: 0 }}>
          {timeAgo(reflection.createdAt)}
        </span>
      </div>
      {reflection.hardest && (
        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
          {reflection.hardest}
        </div>
      )}
      {reflection.noteToSelf && (
        <div
          className="flex items-start"
          style={{
            gap: 6,
            fontSize: 12,
            color: 'var(--text-50)',
            lineHeight: 1.5,
            fontStyle: 'italic',
            paddingTop: 4,
            borderTop: '1px solid var(--text-08)',
            marginTop: 2,
          }}
        >
          <PencilSimple size={11} style={{ marginTop: 3, flexShrink: 0 }} />
          {reflection.noteToSelf}
        </div>
      )}
    </div>
  );
}
