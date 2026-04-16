import { useState, useRef, useEffect } from 'react';
import { NotePencil, CaretDown, Check, Plus, Play } from '@phosphor-icons/react';
import type { Topic, Subtopic } from '../../types';
import { useProgressStore } from '../../store/useProgressStore';
import { useUIStore } from '../../store/useUIStore';
import { useNotesStore } from '../../store/useNotesStore';
import { useSubtopicsStore } from '../../store/useSubtopicsStore';
import { useTimerStore } from '../../store/useTimerStore';
import { findTopicContext, timeAgo } from '../../lib/utils';
import { getRoadmap } from '../../store/useRoadmapStore';
import SubtopicRow from './SubtopicRow';

interface TopicRowProps {
  topic: Topic;
  accentColor: string;
  /** 1-based position of this topic inside its parent focus list */
  index?: number;
}

// Stable reference for the empty-subtopics case. Returning a new [] from
// the zustand selector would create a new reference every render and loop.
const EMPTY_SUBTOPICS: Subtopic[] = [];

export default function TopicRow({ topic, accentColor, index }: TopicRowProps) {
  const toggleTopic = useProgressStore(s => s.toggleTopic);
  const checked = useProgressStore(s => s.checkedTopics.includes(topic.id));
  const checkedAtIso = useProgressStore(s => s.checkedAt[topic.id]);
  const openNotePanel = useUIStore(s => s.openNotePanel);
  const noteCount = useNotesStore(
    s => s.notes.filter(n => n.topicId === topic.id).length,
  );
  const subtopics = useSubtopicsStore(s => s.subtopics[topic.id] ?? EMPTY_SUBTOPICS);
  const addSubtopic = useSubtopicsStore(s => s.addSubtopic);
  const startTimer = useTimerStore(s => s.start);
  const timerActiveOnThisTopic = useTimerStore(
    s => s.active && s.topicId === topic.id,
  );

  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const hasSubtopics = subtopics.length > 0;

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const startAdd = () => {
    setExpanded(true);
    setAdding(true);
    setDraft('');
  };

  const commitAdd = () => {
    const label = draft.trim();
    if (label) {
      addSubtopic(topic.id, label);
      setDraft('');
      // Keep the input open so users can add multiple in a row
      inputRef.current?.focus();
    } else {
      setAdding(false);
    }
  };

  const cancelAdd = () => {
    setDraft('');
    setAdding(false);
  };

  const handleStartSession = () => {
    const ctx = findTopicContext(getRoadmap(), topic.id);
    startTimer({
      topicId: topic.id,
      topicLabel: topic.label,
      focusId: ctx?.focus.id,
      minutes: 25,
    });
  };

  return (
    <div className="flex flex-col">
      {/* Main row */}
      <div
        className="group flex items-center cursor-pointer"
        data-topic-row
        style={{
          padding: '14px 14px',
          gap: 14,
          transition: 'background var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--text-04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {/* Index */}
        {index !== undefined && (
          <span
            aria-hidden
            style={{
              fontSize: 11,
              color: 'var(--text-30)',
              fontVariantNumeric: 'tabular-nums',
              fontFamily: 'var(--font-sans)',
              width: 22,
              textAlign: 'right',
              flexShrink: 0,
              letterSpacing: '0.3px',
            }}
          >
            {String(index).padStart(2, '0')}
          </span>
        )}

        {/* Checkbox */}
        <button
          type="button"
          className={`flex-shrink-0 flex items-center justify-center ${checked ? 'sp-check-bounce' : ''}`}
          key={`cb-${topic.id}-${checked}`}
          style={{
            width: 18,
            height: 18,
            border: checked ? 'none' : '1.5px solid var(--text-15)',
            borderRadius: 0,
            backgroundColor: checked ? accentColor : 'transparent',
            transition:
              'background-color var(--transition-fast), border-color var(--transition-fast)',
          }}
          onClick={() => toggleTopic(topic.id)}
          aria-label={checked ? 'Desmarcar tópico' : 'Marcar tópico'}
        >
          {checked && (
            <Check size={12} weight="bold" color="#FFFFFF" />
          )}
        </button>

        {/* Label + optional subtitle with meta */}
        <div
          className="flex flex-col"
          style={{ flex: 1, minWidth: 0, gap: 3 }}
          onClick={() => toggleTopic(topic.id)}
        >
          <span
            className="select-none"
            style={{
              fontSize: 15,
              color: checked ? 'var(--text-30)' : 'var(--text)',
              textDecoration: checked ? 'line-through' : 'none',
              textDecorationColor: checked ? 'var(--text-30)' : undefined,
              transition: 'color var(--transition-fast)',
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {topic.label}
          </span>

          {(noteCount > 0 || hasSubtopics || (checked && checkedAtIso)) && (
            <div
              className="flex items-center"
              style={{
                gap: 10,
                fontSize: 11,
                color: 'var(--text-30)',
                lineHeight: 1.2,
              }}
            >
              {checked && checkedAtIso && (
                <span className="flex items-center" style={{ gap: 4 }}>
                  <Check size={10} weight="bold" style={{ color: accentColor }} />
                  {timeAgo(checkedAtIso)}
                </span>
              )}
              {checked && checkedAtIso && (noteCount > 0 || hasSubtopics) && (
                <span style={{ color: 'var(--text-15)' }}>·</span>
              )}
              {noteCount > 0 && (
                <span className="flex items-center" style={{ gap: 4 }}>
                  <NotePencil size={11} />
                  {noteCount} {noteCount === 1 ? 'nota' : 'notas'}
                </span>
              )}
              {noteCount > 0 && hasSubtopics && (
                <span style={{ color: 'var(--text-15)' }}>·</span>
              )}
              {hasSubtopics && (
                <span>
                  {subtopics.length} {subtopics.length === 1 ? 'subtópico' : 'subtópicos'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Start session button — visible on hover (or always if timer is on this topic) */}
        <button
          type="button"
          className={`flex-shrink-0 ${timerActiveOnThisTopic ? '' : 'opacity-0 group-hover:opacity-100'}`}
          style={{
            transition: 'opacity var(--transition-fast), color var(--transition-fast)',
            color: timerActiveOnThisTopic ? 'var(--accent-coral)' : 'var(--text-30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleStartSession();
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-coral)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              timerActiveOnThisTopic ? 'var(--accent-coral)' : 'var(--text-30)';
          }}
          aria-label="Iniciar sessão de estudo (25min)"
          title="Iniciar sessão de 25 minutos"
        >
          <Play size={14} weight="fill" />
        </button>

        {/* Add subtopic button — visible on hover */}
        <button
          type="button"
          className="flex-shrink-0 opacity-0 group-hover:opacity-100"
          style={{
            transition: 'opacity var(--transition-fast), color var(--transition-fast)',
            color: 'var(--text-30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            startAdd();
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)';
          }}
          aria-label="Adicionar subtópico"
          title="Adicionar subtópico"
        >
          <Plus size={16} />
        </button>

        {/* Note icon — always visible if notes exist; hover-reveal otherwise */}
        <button
          type="button"
          className={`flex-shrink-0 ${noteCount > 0 ? '' : 'opacity-0 group-hover:opacity-100'}`}
          style={{
            transition: 'opacity var(--transition-fast), color var(--transition-fast)',
            color: noteCount > 0 ? 'var(--text-50)' : 'var(--text-30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            openNotePanel(topic.id);
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              noteCount > 0 ? 'var(--text-50)' : 'var(--text-30)';
          }}
          aria-label={noteCount > 0 ? `Abrir ${noteCount} nota(s)` : 'Criar nota'}
        >
          <NotePencil size={16} />
        </button>

        {/* Expand toggle — visible when has subtopics */}
        {hasSubtopics && (
          <button
            type="button"
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              color: 'var(--text-30)',
              transition: 'transform var(--transition-fast), color var(--transition-fast)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              padding: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(prev => !prev);
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)';
            }}
            aria-label={expanded ? 'Recolher subtópicos' : 'Expandir subtópicos'}
          >
            <CaretDown size={14} />
          </button>
        )}
      </div>

      {/* Subtopics list + add input — shown when expanded OR adding */}
      {(expanded || adding) && (
        <div className="flex flex-col">
          {subtopics.map(sub => (
            <SubtopicRow key={sub.id} subtopic={sub} />
          ))}

          {adding && (
            <div
              className="flex items-center"
              style={{
                paddingLeft: 64,
                paddingRight: 14,
                paddingTop: 8,
                paddingBottom: 10,
                gap: 10,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 14,
                  height: 14,
                  border: '1.5px dashed var(--text-15)',
                  flexShrink: 0,
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={draft}
                placeholder="Novo subtópico…"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitAdd();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelAdd();
                  }
                }}
                onBlur={() => {
                  // Only close if draft is empty; otherwise commit
                  if (draft.trim()) commitAdd();
                  else setAdding(false);
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text)',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: 0,
                  lineHeight: 1.4,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
