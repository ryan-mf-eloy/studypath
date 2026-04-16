import { Sparkle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAIStore } from '../../store/useAIStore';
import { useUIStore } from '../../store/useUIStore';
import { useNotesStore } from '../../store/useNotesStore';

export default function AIChatLauncher() {
  const { t } = useTranslation();
  const openChat = useAIStore(s => s.openChat);
  const chatOpen = useAIStore(s => s.chatOpen);
  const activeNoteTopicId = useUIStore(s => s.activeNoteTopicId);
  const targetNoteId = useUIStore(s => s.targetNoteId);
  const notes = useNotesStore(s => s.notes);

  const handleClick = () => {
    // If a note is currently open, seed the context with it; otherwise pass
    // just the active topic (if any) so the AI has something to work from.
    const activeNote = targetNoteId
      ? notes.find(n => n.id === targetNoteId)
      : activeNoteTopicId
        ? notes.find(n => n.topicId === activeNoteTopicId)
        : undefined;

    openChat({
      topicId: activeNoteTopicId ?? undefined,
      noteId: activeNote?.id,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t('topbar.aiChat')}
      title={t('topbar.aiChat')}
      className="flex items-center justify-center"
      style={{
        width: 32,
        height: 32,
        padding: 0,
        color: chatOpen ? 'var(--accent-coral)' : 'var(--text-50)',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        transition: 'color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        if (!chatOpen) (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-coral)';
      }}
      onMouseLeave={(e) => {
        if (!chatOpen) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
      }}
    >
      <Sparkle size={17} weight="regular" />
    </button>
  );
}
