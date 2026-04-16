import { useEffect, useRef } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { useBlockNoteEditor } from '@blocknote/react';
import type { DefaultReactGridSuggestionItem } from '@blocknote/react';

interface EmojiData {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
}

interface CustomEmojiPickerProps {
  items: DefaultReactGridSuggestionItem[];
  loadingState: 'loading-initial' | 'loading' | 'loaded';
  selectedIndex: number | undefined;
  onItemClick?: (item: DefaultReactGridSuggestionItem) => void;
  columns: number;
}

/**
 * Emoji picker powered by emoji-mart (full search + categories).
 * Replaces BlockNote's default grid picker when the user types `:`.
 *
 * When user selects an emoji, we call `onItemClick` with a synthetic item
 * whose own `onItemClick` inserts the emoji into the editor and relies on
 * BlockNote's controller to strip the `:query` trigger text.
 */
export default function EmojiMartPicker({ onItemClick }: CustomEmojiPickerProps) {
  const editor = useBlockNoteEditor();
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus the picker's search input on mount so typing keeps working
  useEffect(() => {
    const t = setTimeout(() => {
      const input = containerRef.current?.querySelector('input') as HTMLInputElement | null;
      input?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = (emoji: EmojiData) => {
    // Synthetic item whose onItemClick inserts the emoji character.
    // BlockNote's controller will clear the `:query` trigger text, then
    // call this callback which inserts the chosen emoji.
    const syntheticItem: DefaultReactGridSuggestionItem = {
      id: emoji.id,
      onItemClick: () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tiptap = (editor as any)?._tiptapEditor;
        if (tiptap) {
          tiptap.commands.insertContent(emoji.native);
        }
      },
    };
    onItemClick?.(syntheticItem);
  };

  return (
    <div
      ref={containerRef}
      className="studypath-emoji-picker-wrapper"
      style={{
        // Wrap emoji-mart in a container so our theme border applies cleanly
        border: '1px solid var(--text-15)',
        background: 'var(--bg-surface)',
        boxShadow: '0 4px 16px var(--shadow-sm)',
        borderRadius: 0,
      }}
    >
      <Picker
        data={data}
        onEmojiSelect={handleSelect}
        theme="light"
        locale="pt"
        previewPosition="none"
        skinTonePosition="search"
        perLine={9}
        maxFrequentRows={1}
        emojiSize={20}
        emojiButtonSize={32}
        navPosition="top"
        set="native"
      />
    </div>
  );
}
