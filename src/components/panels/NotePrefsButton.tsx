import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from '@phosphor-icons/react';
import {
  useNotePrefsStore,
  type NoteFont,
  type NoteWidth,
  type NoteFontSize,
  type NoteLineHeight,
  type TitleFont,
} from '../../store/useNotePrefsStore';

/* ─── Option definitions ─────────────────────────────────────── */

interface OptionDef<T extends string> {
  value: T;
  label: string;
  preview?: string;
}

const FONT_OPTIONS: OptionDef<NoteFont>[] = [
  { value: 'system', label: 'Sistema', preview: 'Aa' },
  { value: 'sans',   label: 'Inter',   preview: 'Aa' },
  { value: 'serif',  label: 'Serif',   preview: 'Aa' },
  { value: 'mono',   label: 'Mono',    preview: 'Aa' },
];

const FONT_SIZE_OPTIONS: OptionDef<NoteFontSize>[] = [
  { value: 'small',  label: 'Pequeno' },
  { value: 'normal', label: 'Padrão' },
  { value: 'large',  label: 'Grande' },
];

const LINE_HEIGHT_OPTIONS: OptionDef<NoteLineHeight>[] = [
  { value: 'compact', label: 'Compacta' },
  { value: 'normal',  label: 'Padrão' },
  { value: 'relaxed', label: 'Relaxada' },
];

const WIDTH_OPTIONS: OptionDef<NoteWidth>[] = [
  { value: 'narrow', label: 'Estreita' },
  { value: 'normal', label: 'Padrão' },
  { value: 'wide',   label: 'Larga' },
];

const TITLE_OPTIONS: OptionDef<TitleFont>[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans',  label: 'Sans' },
  { value: 'mono',  label: 'Mono' },
];

/* ─── Primitives ─────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        color: 'var(--text-30)',
        marginBottom: 10,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </div>
  );
}

interface OptionGroupProps<T extends string> {
  options: OptionDef<T>[];
  value: T;
  onChange: (v: T) => void;
  showPreview?: boolean;
  previewFont?: (v: T) => string;
}

function OptionGroup<T extends string>({
  options,
  value,
  onChange,
  showPreview = false,
  previewFont,
}: OptionGroupProps<T>) {
  return (
    <div
      className="flex"
      style={{
        gap: 6,
        width: '100%',
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const optFont = previewFont ? previewFont(opt.value) : undefined;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            style={{
              flex: 1,
              minWidth: 0,
              padding: showPreview ? '10px 6px 9px' : '9px 6px',
              border: `1px solid ${isActive ? 'var(--text)' : 'var(--text-15)'}`,
              background: isActive ? 'var(--text-08)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 11.5,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text)' : 'var(--text-50)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: showPreview ? 5 : 0,
              letterSpacing: '0.1px',
              transition:
                'border-color var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-30)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
              }
            }}
          >
            {showPreview && opt.preview && (
              <span
                aria-hidden
                style={{
                  fontFamily: optFont,
                  fontSize: 17,
                  lineHeight: 1,
                  color: 'var(--text)',
                  fontWeight: 400,
                }}
              >
                {opt.preview}
              </span>
            )}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Root component ─────────────────────────────────────────── */

export default function NotePrefsButton() {
  const font = useNotePrefsStore(s => s.font);
  const fontSize = useNotePrefsStore(s => s.fontSize);
  const lineHeight = useNotePrefsStore(s => s.lineHeight);
  const width = useNotePrefsStore(s => s.width);
  const titleFont = useNotePrefsStore(s => s.titleFont);
  const setFont = useNotePrefsStore(s => s.setFont);
  const setFontSize = useNotePrefsStore(s => s.setFontSize);
  const setLineHeight = useNotePrefsStore(s => s.setLineHeight);
  const setWidth = useNotePrefsStore(s => s.setWidth);
  const setTitleFont = useNotePrefsStore(s => s.setTitleFont);

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

  const previewFont = (v: NoteFont | TitleFont): string => {
    if (v === 'system')
      return `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;
    if (v === 'serif') return 'var(--font-serif)';
    if (v === 'mono')
      return `'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace`;
    return 'var(--font-sans)';
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Preferências da nota"
        aria-expanded={open}
        title="Preferências da nota"
        className="flex items-center justify-center"
        style={{
          padding: 4,
          color: open ? 'var(--text)' : 'var(--text-50)',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
        }}
        onMouseEnter={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
        }}
        onMouseLeave={(e) => {
          if (!open) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
        }}
      >
        <SlidersHorizontal size={18} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Preferências da nota"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 12,
            width: 340,
            background: 'var(--bg-surface)',
            border: '1px solid var(--text-15)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            padding: '22px 22px 24px',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              color: 'var(--text)',
              lineHeight: 1.2,
              paddingBottom: 4,
              borderBottom: '1px solid var(--text-08)',
              marginBottom: -4,
            }}
          >
            Preferências
          </div>

          <div>
            <SectionLabel>Fonte do corpo</SectionLabel>
            <OptionGroup
              options={FONT_OPTIONS}
              value={font}
              onChange={setFont}
              showPreview
              previewFont={previewFont}
            />
          </div>

          <div>
            <SectionLabel>Tamanho</SectionLabel>
            <OptionGroup
              options={FONT_SIZE_OPTIONS}
              value={fontSize}
              onChange={setFontSize}
            />
          </div>

          <div>
            <SectionLabel>Altura da linha</SectionLabel>
            <OptionGroup
              options={LINE_HEIGHT_OPTIONS}
              value={lineHeight}
              onChange={setLineHeight}
            />
          </div>

          <div>
            <SectionLabel>Largura</SectionLabel>
            <OptionGroup
              options={WIDTH_OPTIONS}
              value={width}
              onChange={setWidth}
            />
          </div>

          <div>
            <SectionLabel>Títulos</SectionLabel>
            <OptionGroup
              options={TITLE_OPTIONS}
              value={titleFont}
              onChange={setTitleFont}
              showPreview
              previewFont={previewFont}
            />
          </div>
        </div>
      )}
    </div>
  );
}
