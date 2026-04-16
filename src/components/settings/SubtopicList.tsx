import { useState } from 'react';
import { Plus, Trash, Check, X } from '@phosphor-icons/react';
import { useSubtopicsStore } from '../../store/useSubtopicsStore';
import type { Subtopic } from '../../types';

interface SubtopicListProps {
  topicId: string;
  accentColor?: string;
}

const EMPTY_SUBTOPICS: Subtopic[] = [];

export default function SubtopicList({ topicId, accentColor }: SubtopicListProps) {
  const subtopics = useSubtopicsStore((s) => s.subtopics[topicId] ?? EMPTY_SUBTOPICS);
  const addSubtopic = useSubtopicsStore((s) => s.addSubtopic);
  const removeSubtopic = useSubtopicsStore((s) => s.removeSubtopic);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      addSubtopic(topicId, trimmed);
    }
    setDraft('');
    setAdding(false);
  };

  const cancel = () => {
    setDraft('');
    setAdding(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        paddingLeft: 20,
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      {subtopics.map((s) => (
        <div
          key={s.id}
          className="flex items-center"
          style={{
            gap: 8,
            padding: '4px 6px',
            fontSize: 12,
            color: 'var(--text-50)',
          }}
        >
          <span
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: accentColor ?? 'var(--text-30)',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {s.label}
          </span>
          <button
            type="button"
            aria-label="Remover subtópico"
            onClick={() => removeSubtopic(topicId, s.id)}
            style={{
              padding: 2,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-30)',
              cursor: 'pointer',
              opacity: 0.6,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-coral)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.6';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)';
            }}
          >
            <Trash size={11} />
          </button>
        </div>
      ))}

      {adding ? (
        <div
          className="flex items-center"
          style={{
            gap: 6,
            paddingTop: 2,
          }}
        >
          <span
            style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: accentColor ?? 'var(--text-30)',
              flexShrink: 0,
              marginLeft: 6,
            }}
          />
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
            onBlur={() => {
              if (!draft.trim()) cancel();
            }}
            placeholder="Novo subtópico"
            style={{
              flex: 1,
              padding: '2px 6px',
              border: '1px solid var(--text-15)',
              background: 'var(--bg-surface)',
              color: 'var(--text)',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={commit}
            aria-label="Adicionar"
            style={{
              padding: 2,
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-green)',
              cursor: 'pointer',
            }}
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancelar"
            style={{
              padding: 2,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-30)',
              cursor: 'pointer',
            }}
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center"
          style={{
            gap: 6,
            padding: '2px 6px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-30)',
            cursor: 'pointer',
            fontSize: 11,
            width: 'fit-content',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)';
          }}
        >
          <Plus size={10} />
          Adicionar subtópico
        </button>
      )}
    </div>
  );
}
