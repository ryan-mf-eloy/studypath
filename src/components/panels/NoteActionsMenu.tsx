import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DotsThreeVertical,
  CaretDown,
  CaretRight,
  SlidersHorizontal,
  Download,
  Upload,
  Trash,
  FileText,
  FileMd,
  FileDoc,
  FilePdf,
  Sparkle,
  Cards,
  ListBullets,
  Question,
} from '@phosphor-icons/react';
import {
  useNotePrefsStore,
  type NoteFont,
  type NoteWidth,
  type NoteFontSize,
  type NoteLineHeight,
  type TitleFont,
} from '../../store/useNotePrefsStore';
import { useAIStore } from '../../store/useAIStore';

/* ─── Option definitions ─────────────────────────────────── */

interface OptionDef<T extends string> {
  value: T;
  label: string;
  preview?: string;
}

/* Option tables are built inside the component so labels get translated. */

/* ─── Primitives ─────────────────────────────────────────── */

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '1.1px',
        textTransform: 'uppercase',
        color: 'var(--text-30)',
        marginBottom: 8,
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
    <div className="flex" style={{ gap: 6, width: '100%' }}>
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
              padding: showPreview ? '9px 5px 8px' : '8px 5px',
              border: `1px solid ${isActive ? 'var(--text)' : 'var(--text-15)'}`,
              background: isActive ? 'var(--text-08)' : 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text)' : 'var(--text-50)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: showPreview ? 4 : 0,
              transition:
                'border-color var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast)',
            }}
          >
            {showPreview && opt.preview && (
              <span
                aria-hidden
                style={{
                  fontFamily: optFont,
                  fontSize: 15,
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

function SectionHeader({
  label,
  icon,
  expanded,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="flex items-center"
      style={{
        width: '100%',
        padding: '11px 14px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        gap: 10,
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        color: expanded ? 'var(--text)' : 'var(--text-50)',
        transition: 'color var(--transition-fast), background-color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = expanded ? 'var(--text)' : 'var(--text-50)';
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-30)' }}>
        {icon}
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {expanded ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
    </button>
  );
}

function MenuRow({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center"
      style={{
        width: '100%',
        padding: '9px 14px',
        gap: 12,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: destructive ? 'var(--text-50)' : 'var(--text)',
        textAlign: 'left',
        transition: 'background-color var(--transition-fast), color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = destructive
          ? 'var(--focus-main-bg)'
          : 'var(--text-04)';
        (e.currentTarget as HTMLButtonElement).style.color = destructive
          ? 'var(--accent-coral)'
          : 'var(--text)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.color = destructive ? 'var(--text-50)' : 'var(--text)';
      }}
    >
      <span style={{ color: 'var(--text-30)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

/* ─── Root ───────────────────────────────────────────────── */

interface NoteActionsMenuProps {
  onExportTxt: () => void;
  onExportMarkdown: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onImport: (accept: string, kind: 'txt' | 'md' | 'docx') => void;
  onDelete: () => void;
  /** ID da nota atualmente aberta (pra passar contexto pra IA) */
  currentNoteId?: string;
  /** ID do tópico da nota (pra contexto da IA) */
  currentTopicId?: string;
}

type Section = 'prefs' | 'ai' | 'export' | 'import' | null;

export default function NoteActionsMenu({
  onExportTxt,
  onExportMarkdown,
  onExportDocx,
  onExportPdf,
  onImport,
  onDelete,
  currentNoteId,
  currentTopicId,
}: NoteActionsMenuProps) {
  const { t } = useTranslation();
  const openAIChat = useAIStore(s => s.openChat);
  const FONT_OPTIONS = useMemo<OptionDef<NoteFont>[]>(
    () => [
      { value: 'system', label: t('notes.prefsFontSystem'), preview: 'Aa' },
      { value: 'sans',   label: t('notes.prefsFontInter'),  preview: 'Aa' },
      { value: 'serif',  label: t('notes.prefsFontSerif'),  preview: 'Aa' },
      { value: 'mono',   label: t('notes.prefsFontMono'),   preview: 'Aa' },
    ],
    [t],
  );
  const FONT_SIZE_OPTIONS = useMemo<OptionDef<NoteFontSize>[]>(
    () => [
      { value: 'small',  label: t('notes.prefsSizeSmall') },
      { value: 'normal', label: t('notes.prefsSizeNormal') },
      { value: 'large',  label: t('notes.prefsSizeLarge') },
    ],
    [t],
  );
  const LINE_HEIGHT_OPTIONS = useMemo<OptionDef<NoteLineHeight>[]>(
    () => [
      { value: 'compact', label: t('notes.prefsLineCompact') },
      { value: 'normal',  label: t('notes.prefsLineNormal') },
      { value: 'relaxed', label: t('notes.prefsLineRelaxed') },
    ],
    [t],
  );
  const WIDTH_OPTIONS = useMemo<OptionDef<NoteWidth>[]>(
    () => [
      { value: 'narrow', label: t('notes.prefsWidthNarrow') },
      { value: 'normal', label: t('notes.prefsWidthNormal') },
      { value: 'wide',   label: t('notes.prefsWidthWide') },
    ],
    [t],
  );
  const TITLE_OPTIONS = useMemo<OptionDef<TitleFont>[]>(
    () => [
      { value: 'serif', label: t('notes.prefsFontSerif') },
      { value: 'sans',  label: t('notes.prefsFontSans') },
      { value: 'mono',  label: t('notes.prefsFontMono') },
    ],
    [t],
  );
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
  const [expanded, setExpanded] = useState<Section>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
        setExpanded(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setExpanded(null);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleSection = (s: Section) => setExpanded((cur) => (cur === s ? null : s));

  const run = (fn: () => void) => () => {
    setOpen(false);
    setExpanded(null);
    fn();
  };

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
        aria-label={t('notes.moreActionsAria')}
        aria-expanded={open}
        title={t('common.moreActions')}
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
        <DotsThreeVertical size={20} weight="bold" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t('notes.actionsMenuLabel')}
          className="sp-popover-enter"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 10,
            width: 320,
            maxHeight: '70vh',
            overflowY: 'auto',
            background: 'var(--bg-surface)',
            border: '1px solid var(--text-15)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            zIndex: 210,
            display: 'flex',
            flexDirection: 'column',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* ── Preferências ─────────────────────────────── */}
          <SectionHeader
            label={t('notes.prefsSection')}
            icon={<SlidersHorizontal size={14} />}
            expanded={expanded === 'prefs'}
            onClick={() => toggleSection('prefs')}
          />
          <div
            className="sp-accordion-section"
            data-expanded={expanded === 'prefs'}
            style={{
              padding: '6px 16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              borderBottom: expanded === 'prefs' ? '1px solid var(--text-08)' : 'none',
            }}
          >
              <div>
                <SubLabel>{t('notes.prefsBodyFont')}</SubLabel>
                <OptionGroup
                  options={FONT_OPTIONS}
                  value={font}
                  onChange={setFont}
                  showPreview
                  previewFont={previewFont}
                />
              </div>
              <div>
                <SubLabel>{t('notes.prefsSize')}</SubLabel>
                <OptionGroup
                  options={FONT_SIZE_OPTIONS}
                  value={fontSize}
                  onChange={setFontSize}
                />
              </div>
              <div>
                <SubLabel>{t('notes.prefsLineHeight')}</SubLabel>
                <OptionGroup
                  options={LINE_HEIGHT_OPTIONS}
                  value={lineHeight}
                  onChange={setLineHeight}
                />
              </div>
              <div>
                <SubLabel>{t('notes.prefsWidth')}</SubLabel>
                <OptionGroup
                  options={WIDTH_OPTIONS}
                  value={width}
                  onChange={setWidth}
                />
              </div>
              <div>
                <SubLabel>{t('notes.prefsTitles')}</SubLabel>
                <OptionGroup
                  options={TITLE_OPTIONS}
                  value={titleFont}
                  onChange={setTitleFont}
                  showPreview
                  previewFont={previewFont}
                />
              </div>
          </div>

          <div style={{ borderTop: '1px solid var(--text-08)' }} />

          {/* ── Assistente (IA) ─────────────────────────── */}
          <SectionHeader
            label={t('notes.assistantSection')}
            icon={<Sparkle size={14} />}
            expanded={expanded === 'ai'}
            onClick={() => toggleSection('ai')}
          />
          <div
            className="sp-accordion-section"
            data-expanded={expanded === 'ai'}
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 4,
              borderBottom: expanded === 'ai' ? '1px solid var(--text-08)' : 'none',
            }}
          >
            <MenuRow
              icon={<Cards size={15} />}
              label={t('notes.aiFlashcards')}
              onClick={run(() =>
                openAIChat({
                  topicId: currentTopicId,
                  noteId: currentNoteId,
                  seedPrompt: t('notes.aiFlashcardsPrompt'),
                }),
              )}
            />
            <MenuRow
              icon={<ListBullets size={15} />}
              label={t('notes.aiSummarize')}
              onClick={run(() =>
                openAIChat({
                  topicId: currentTopicId,
                  noteId: currentNoteId,
                  seedPrompt: t('notes.aiSummarizePrompt'),
                }),
              )}
            />
            <MenuRow
              icon={<Question size={15} />}
              label={t('notes.aiQuiz')}
              onClick={run(() =>
                openAIChat({
                  topicId: currentTopicId,
                  noteId: currentNoteId,
                  seedPrompt: t('notes.aiQuizPrompt'),
                }),
              )}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--text-08)' }} />

          {/* ── Exportar ─────────────────────────────────── */}
          <SectionHeader
            label={t('notes.exportSection')}
            icon={<Download size={14} />}
            expanded={expanded === 'export'}
            onClick={() => toggleSection('export')}
          />
          <div
            className="sp-accordion-section"
            data-expanded={expanded === 'export'}
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 4,
              borderBottom: expanded === 'export' ? '1px solid var(--text-08)' : 'none',
            }}
          >
            <MenuRow icon={<FileText size={15} />} label={t('notes.formatTxt')} onClick={run(onExportTxt)} />
            <MenuRow icon={<FileMd size={15} />}   label={t('notes.formatMarkdown')} onClick={run(onExportMarkdown)} />
            <MenuRow icon={<FileDoc size={15} />}  label={t('notes.formatWord')} onClick={run(onExportDocx)} />
            <MenuRow icon={<FilePdf size={15} />}  label={t('notes.formatPdf')} onClick={run(onExportPdf)} />
          </div>

          <div style={{ borderTop: '1px solid var(--text-08)' }} />

          {/* ── Importar ─────────────────────────────────── */}
          <SectionHeader
            label={t('notes.importSection')}
            icon={<Upload size={14} />}
            expanded={expanded === 'import'}
            onClick={() => toggleSection('import')}
          />
          <div
            className="sp-accordion-section"
            data-expanded={expanded === 'import'}
            style={{
              display: 'flex',
              flexDirection: 'column',
              paddingBottom: 4,
              borderBottom: expanded === 'import' ? '1px solid var(--text-08)' : 'none',
            }}
          >
            <MenuRow icon={<FileText size={15} />} label={t('notes.formatTxt')}      onClick={run(() => onImport('.txt', 'txt'))} />
            <MenuRow icon={<FileMd size={15} />}   label={t('notes.formatMarkdown')} onClick={run(() => onImport('.md,.markdown', 'md'))} />
            <MenuRow icon={<FileDoc size={15} />}  label={t('notes.formatWord')}     onClick={run(() => onImport('.docx', 'docx'))} />
          </div>

          {/* ── Delete (destructive, always visible at bottom) ───── */}
          <div style={{ borderTop: '1px solid var(--text-08)', padding: '4px 0' }}>
            <MenuRow
              icon={<Trash size={15} />}
              label={t('notes.deleteNoteItem')}
              onClick={run(onDelete)}
              destructive
            />
          </div>
        </div>
      )}
    </div>
  );
}
