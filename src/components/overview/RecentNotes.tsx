import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretRight } from '@phosphor-icons/react';
import { useUIStore } from '../../store/useUIStore';
import { useNotesStore } from '../../store/useNotesStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { findTopicContext, timeAgo } from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';

const MAX_NOTES = 3;

export default function RecentNotes() {
  const { t } = useTranslation();
  const notes = useNotesStore(s => s.notes);
  const openNotePanelWithNote = useUIStore(s => s.openNotePanelWithNote);
  const setActivePage = useUIStore(s => s.setActivePage);
  const roadmap = useRoadmap();

  const recent = useMemo(
    () =>
      [...notes]
        .filter(n => !!n.topicId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, MAX_NOTES),
    [notes],
  );

  if (recent.length === 0) return null;

  return (
    <section>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '1.1px',
          textTransform: 'uppercase',
          color: 'var(--text-30)',
          marginBottom: 10,
          display: 'block',
        }}
      >
        {t('overview.recentNotes.title')}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {recent.map(note => {
          const ctx = findTopicContext(roadmap, note.topicId!);
          const subject = ctx ? resolveFocusMeta(ctx.focus) : null;
          const SubjectIcon = subject?.Icon;

          return (
            <button
              key={note.id}
              type="button"
              onClick={() => {
                openNotePanelWithNote(note.topicId!, note.id);
                setActivePage('study');
              }}
              aria-label={t('overview.recentNotes.openNoteAria', { title: note.title })}
              className="flex items-center"
              style={{
                width: '100%',
                gap: 14,
                padding: '14px 8px',
                borderBottom: '1px solid var(--text-08)',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="flex items-center"
                  style={{
                    gap: 8,
                    fontSize: 15,
                    color: 'var(--text)',
                    fontWeight: 500,
                    overflow: 'hidden',
                  }}
                >
                  {note.icon && (
                    <span
                      aria-hidden
                      style={{
                        fontSize: 16,
                        lineHeight: 1,
                        flexShrink: 0,
                        userSelect: 'none',
                      }}
                    >
                      {note.icon}
                    </span>
                  )}
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {note.title || t('notes.untitled')}
                  </span>
                </div>
                {ctx && (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-30)',
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {SubjectIcon && subject && (
                      <SubjectIcon
                        size={11}
                        weight="regular"
                        style={{ color: subject.color, flexShrink: 0 }}
                      />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ctx.focus.name}
                    </span>
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-30)',
                  flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {timeAgo(note.updatedAt)}
              </span>
              <CaretRight
                size={14}
                style={{ color: 'var(--text-15)', flexShrink: 0 }}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
