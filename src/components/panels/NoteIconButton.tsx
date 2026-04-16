import { useEffect, useRef, useState } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { Smiley } from '@phosphor-icons/react';
import { useThemeStore } from '../../store/useThemeStore';

interface EmojiData {
  id: string;
  name: string;
  native: string;
  unified: string;
  keywords: string[];
  shortcodes: string;
}

interface NoteIconButtonProps {
  icon?: string;
  size: number;
  onChange: (icon: string | undefined) => void;
}

export default function NoteIconButton({ icon, size, onChange }: NoteIconButtonProps) {
  const theme = useThemeStore(s => s.theme);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSelect = (emoji: EmojiData) => {
    onChange(emoji.native);
    setOpen(false);
  };

  const handleRemove = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      style={{
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={icon ? 'Alterar ícone da nota' : 'Adicionar ícone à nota'}
        title={icon ? 'Alterar ícone' : 'Adicionar ícone'}
        className="flex items-center justify-center"
        style={{
          width: size,
          height: size,
          lineHeight: 1,
          fontSize: Math.round(size * 0.92),
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          color: icon ? 'var(--text)' : 'var(--text-30)',
          opacity: 1,
          transition: 'color var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          if (!icon) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
        }}
        onMouseLeave={(e) => {
          if (!icon) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)';
        }}
      >
        {icon ? (
          <span
            aria-hidden
            style={{
              fontSize: 'inherit',
              lineHeight: 1,
              userSelect: 'none',
              display: 'inline-block',
              opacity: 1,
              filter: 'none',
            }}
          >
            {icon}
          </span>
        ) : (
          <Smiley size={Math.round(size * 0.55)} weight="regular" />
        )}
      </button>

      {open && (
        <div
          className="studypath-emoji-picker-wrapper sp-popover-enter"
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 12,
            zIndex: 250,
            border: '1px solid var(--text-15)',
            background: 'var(--bg-surface)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            transformOrigin: 'top left',
          }}
        >
          <Picker
            data={data}
            onEmojiSelect={handleSelect}
            theme={theme}
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
          {icon && (
            <button
              type="button"
              onClick={handleRemove}
              style={{
                padding: '10px 14px',
                borderTop: '1px solid var(--text-08)',
                background: 'transparent',
                border: 'none',
                borderTopWidth: 1,
                borderTopStyle: 'solid',
                borderTopColor: 'var(--text-08)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--text-50)',
                textAlign: 'left',
                transition: 'color var(--transition-fast), background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-coral)';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              Remover ícone
            </button>
          )}
        </div>
      )}
    </div>
  );
}
