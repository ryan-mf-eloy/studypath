import { Check, X } from '@phosphor-icons/react';
import type { Subtopic } from '../../types';
import { useProgressStore } from '../../store/useProgressStore';
import { useSubtopicsStore } from '../../store/useSubtopicsStore';

interface SubtopicRowProps {
  subtopic: Subtopic;
}

export default function SubtopicRow({ subtopic }: SubtopicRowProps) {
  const toggleTopic = useProgressStore(s => s.toggleTopic);
  const checked = useProgressStore(s => s.checkedTopics.includes(subtopic.id));
  const removeSubtopic = useSubtopicsStore(s => s.removeSubtopic);

  return (
    <div
      className="group flex items-center cursor-pointer"
      style={{
        paddingLeft: 64,
        paddingRight: 14,
        paddingTop: 8,
        paddingBottom: 8,
        gap: 10,
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--text-04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        className="flex-shrink-0 flex items-center justify-center"
        style={{
          width: 14,
          height: 14,
          border: checked ? 'none' : '1.5px solid var(--text-15)',
          borderRadius: 0,
          backgroundColor: checked ? 'var(--text-50)' : 'transparent',
          transition: 'background var(--transition-fast), border var(--transition-fast)',
        }}
        onClick={() => toggleTopic(subtopic.id)}
        aria-label={checked ? 'Desmarcar subtópico' : 'Marcar subtópico'}
      >
        {checked && (
          <Check size={9} weight="bold" color="#FFFFFF" />
        )}
      </button>

      {/* Label */}
      <span
        className="flex-1 select-none"
        style={{
          fontSize: 13,
          color: checked ? 'var(--text-30)' : 'var(--text-50)',
          textDecoration: checked ? 'line-through' : 'none',
          textDecorationColor: checked ? 'var(--text-30)' : undefined,
          transition: 'color var(--transition-fast)',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        onClick={() => toggleTopic(subtopic.id)}
      >
        {subtopic.label}
      </span>

      {/* Remove button — hover only */}
      <button
        type="button"
        className="flex-shrink-0 opacity-0 group-hover:opacity-100"
        style={{
          transition: 'opacity var(--transition-fast), color var(--transition-fast)',
          color: 'var(--text-30)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 2,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.stopPropagation();
          removeSubtopic(subtopic.topicId, subtopic.id);
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-coral)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)';
        }}
        aria-label="Remover subtópico"
      >
        <X size={12} weight="bold" />
      </button>
    </div>
  );
}
