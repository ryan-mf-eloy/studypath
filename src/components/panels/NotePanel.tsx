import { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  NotePencil,
  Plus,
  ArrowLeft,
  ArrowsOutSimple,
  ArrowsInSimple,
  ArrowCounterClockwise,
  ArrowClockwise,
  Code,
  Image as ImageIcon,
  Table,
  LinkSimple,
  VideoCamera,
  TextT,
  Quotes,
  ListBullets,
  type Icon,
} from '@phosphor-icons/react';
import { useUIStore } from '../../store/useUIStore';
import { useNotesStore } from '../../store/useNotesStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { findTopicContext, focusLabel, timeAgo } from '../../lib/utils';
import {
  deserializeNoteBody,
  extractNotePreview,
  getNoteBlockStats,
  type NoteBlockStats,
} from '../../lib/noteBodyMigration';
import type { Note } from '../../types';
import { NoteEditorSkeleton } from '../editor/NoteEditorSkeleton';
import NoteIconButton from './NoteIconButton';
import NoteActionsMenu from './NoteActionsMenu';
import NoteTemplatePicker from './NoteTemplatePicker';
import type { NoteTemplate } from '../../data/noteTemplates';
import { getNoteTags } from '../../lib/noteLinking';
import {
  exportAsTxt,
  exportAsMarkdown,
  exportAsDocx,
  exportAsPdf,
  importTxt,
  importMarkdown,
  importDocx,
} from '../../lib/noteImportExport';
import {
  useNotePrefsStore,
  fontFamilyFor,
  WIDTH_PX,
  FONT_SIZE_PX,
  LINE_HEIGHT_VALUE,
} from '../../store/useNotePrefsStore';
import { confirm } from '../../store/useConfirmStore';

const NoteEditor = lazy(() => import('../editor/NoteEditor'));

export default function NotePanel() {
  const { t } = useTranslation();
  const activeNoteTopicId = useUIStore(s => s.activeNoteTopicId);
  const closeNotePanel = useUIStore(s => s.closeNotePanel);
  const targetNoteId = useUIStore(s => s.targetNoteId);
  const clearTargetNote = useUIStore(s => s.clearTargetNote);

  const notes = useNotesStore(s => s.notes);
  const getNotesByTopic = useNotesStore(s => s.getNotesByTopic);
  const addNote = useNotesStore(s => s.addNote);
  const updateNote = useNotesStore(s => s.updateNote);
  const deleteNote = useNotesStore(s => s.deleteNote);
  const roadmap = useRoadmap();

  const isOpen = activeNoteTopicId !== null;
  const ctx = activeNoteTopicId ? findTopicContext(roadmap, activeNoteTopicId) : null;
  const topicNotes = activeNoteTopicId ? getNotesByTopic(activeNoteTopicId) : [];

  // Force re-derive when notes change
  void notes;

  // Active note being edited (null = list view)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const editorRef = useRef<import('../editor/NoteEditor').NoteEditorHandle>(null);

  // Note preferences — persisted
  const noteFont = useNotePrefsStore(s => s.font);
  const noteWidth = useNotePrefsStore(s => s.width);
  const noteFontSize = useNotePrefsStore(s => s.fontSize);
  const noteLineHeight = useNotePrefsStore(s => s.lineHeight);
  const noteTitleFont = useNotePrefsStore(s => s.titleFont);
  const bodyFontVar = fontFamilyFor(noteFont);
  const titleFontVar = fontFamilyFor(noteTitleFont);
  const widthPx = WIDTH_PX[noteWidth];
  const bodySizeVar = FONT_SIZE_PX[noteFontSize];
  const lineHeightVar = LINE_HEIGHT_VALUE[noteLineHeight];
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editingNote = editingNoteId
    ? topicNotes.find(n => n.id === editingNoteId) ?? null
    : null;

  // Reset state when panel closes or topic changes.
  // If there's a pending targetNoteId (handoff from CommandPalette), don't
  // clear editingNoteId yet — the target-note effect below will set it.
  useEffect(() => {
    if (!targetNoteId) {
      setEditingNoteId(null);
      setEditingTitle('');
    }
    setIsFullscreen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteTopicId]);

  // Command palette handoff: open the target note directly in editor mode
  // once it appears in topicNotes.
  useEffect(() => {
    if (!targetNoteId || !activeNoteTopicId) return;
    const match = topicNotes.find(n => n.id === targetNoteId);
    if (match) {
      setEditingNoteId(targetNoteId);
      setEditingTitle(match.title);
      clearTargetNote();
    }
  }, [targetNoteId, activeNoteTopicId, topicNotes, clearTargetNote]);

  // Escape key exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  // Exit fullscreen when leaving editor view
  useEffect(() => {
    if (!editingNoteId) setIsFullscreen(false);
  }, [editingNoteId]);

  // Focus title when entering edit mode
  useEffect(() => {
    if (editingNoteId && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [editingNoteId]);

  function handleNewNote() {
    if (!activeNoteTopicId || !ctx) return;
    setTemplatePickerOpen(true);
  }

  function handleTemplateSelected(template: NoteTemplate) {
    setTemplatePickerOpen(false);
    if (!activeNoteTopicId || !ctx) return;
    const blocks = template.buildBlocks();
    const note = addNote({
      title: template.id === 'blank' ? t('notes.untitledNote') : t(template.nameKey),
      body: JSON.stringify(blocks),
      bodyVersion: 1,
      topicId: activeNoteTopicId,
      focusId: ctx.focus.id,
      subjectTag: ctx.focus.name,
    });
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
  }

  function handleOpenNote(note: Note) {
    setEditingNoteId(note.id);
    setEditingTitle(note.title);
  }

  function handleBack() {
    // Flush title save
    if (titleSaveTimer.current) {
      clearTimeout(titleSaveTimer.current);
      titleSaveTimer.current = null;
    }
    if (editingNoteId && editingTitle.trim()) {
      updateNote(editingNoteId, { title: editingTitle.trim() });
    }
    setEditingNoteId(null);
    setEditingTitle('');
  }

  function handleTitleChange(value: string) {
    setEditingTitle(value);
    if (titleSaveTimer.current) clearTimeout(titleSaveTimer.current);
    titleSaveTimer.current = setTimeout(() => {
      if (editingNoteId && value.trim()) {
        updateNote(editingNoteId, { title: value.trim() });
      }
    }, 800);
  }

  const handleBodySave = useCallback((noteId: string, body: string) => {
    updateNote(noteId, { body, bodyVersion: 1 });
  }, [updateNote]);

  async function handleDelete() {
    if (!editingNoteId) return;
    const title = editingTitle.trim() || t('notes.untitled');
    const ok = await confirm({
      title: t('notes.deleteNoteTitle'),
      message: t('notes.deletePermanent', { title }),
      confirmLabel: t('notes.deleteNoteConfirmButton'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    deleteNote(editingNoteId);
    setEditingNoteId(null);
    setEditingTitle('');
  }

  /* ─── Import / export ─────────────────────────────────── */

  function handleExportTxt() {
    if (!editingNote) return;
    exportAsTxt(editingTitle.trim() || t('notes.untitled'), editingNote.body, editingNote.bodyVersion);
  }

  function handleExportMarkdown() {
    if (!editingNote) return;
    exportAsMarkdown(
      editingTitle.trim() || t('notes.untitled'),
      editingNote.body,
      editingNote.bodyVersion,
    );
  }

  async function handleExportDocx() {
    if (!editingNote) return;
    await exportAsDocx(
      editingTitle.trim() || t('notes.untitled'),
      editingNote.body,
      editingNote.bodyVersion,
    );
  }

  function handleExportPdf() {
    if (!editingNote) return;
    exportAsPdf(
      editingTitle.trim() || t('notes.untitled'),
      editingNote.body,
      editingNote.bodyVersion,
    );
  }

  async function handleImport(accept: string, kind: 'txt' | 'md' | 'docx') {
    if (!activeNoteTopicId || !ctx) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const parsed =
          kind === 'txt' ? await importTxt(file)
          : kind === 'md' ? await importMarkdown(file)
          :                 await importDocx(file);

        const note = addNote({
          title: parsed.title || t('notes.importedNote'),
          body: parsed.body,
          bodyVersion: 1,
          topicId: activeNoteTopicId,
          focusId: ctx.focus.id,
          subjectTag: ctx.focus.name,
        });
        setEditingNoteId(note.id);
        setEditingTitle(note.title);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Erro ao importar nota:', err);
        alert(t('notes.importError'));
      }
    };
    input.click();
  }

  function handleClose() {
    // Flush title before closing
    if (editingNoteId && editingTitle.trim()) {
      updateNote(editingNoteId, { title: editingTitle.trim() });
    }
    closeNotePanel();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: isFullscreen
            ? 'var(--bg-backdrop)'
            : 'var(--text-08)',
          zIndex: 90,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity var(--transition-smooth), background-color 250ms ease',
        }}
        onClick={isFullscreen ? undefined : handleClose}
      />

      {/* Panel */}
      <div
        data-fullscreen={isFullscreen ? 'true' : 'false'}
        data-note-width={noteWidth}
        className="note-panel"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          maxWidth: '100vw',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: isFullscreen ? '1px solid transparent' : '1px solid var(--text-15)',
          zIndex: 100,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: [
            'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            'width 460ms cubic-bezier(0.22, 1, 0.36, 1)',
            'border-color 460ms cubic-bezier(0.22, 1, 0.36, 1)',
          ].join(', '),
          display: 'flex',
          flexDirection: 'column',
          willChange: 'width',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--text-08)',
            flexShrink: 0,
          }}
        >
          {editingNoteId ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center"
              style={{
                flexShrink: 0,
                padding: 4,
                color: 'var(--text-50)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
              }}
              aria-label={t('common.backToList')}
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <NotePencil size={20} style={{ color: 'var(--text-50)', flexShrink: 0 }} />
          )}

          <div className="flex-1" style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--text)',
                margin: 0,
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ctx?.topic.label ?? t('search.groups.notes')}
            </h3>
            {ctx && (
              <span style={{ fontSize: 12, color: 'var(--text-50)', lineHeight: 1.3 }}>
                {ctx.month.label} &middot; {focusLabel(ctx.focus.type)}
              </span>
            )}
          </div>

          {/* Undo / Redo buttons (only in edit mode) */}
          {editingNoteId && (
            <div className="flex items-center" style={{ gap: 2, marginRight: 4 }}>
              <button
                type="button"
                onClick={() => editorRef.current?.undo()}
                className="flex items-center justify-center"
                style={{
                  width: 28, height: 28, flexShrink: 0,
                  color: 'var(--text-30)', cursor: 'pointer',
                  background: 'none', border: 'none',
                  transition: 'color var(--transition-fast)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)'; }}
                aria-label={t('editor.undo')}
                title={`${t('editor.undo')} (⌘Z)`}
              >
                <ArrowCounterClockwise size={16} />
              </button>
              <button
                type="button"
                onClick={() => editorRef.current?.redo()}
                className="flex items-center justify-center"
                style={{
                  width: 28, height: 28, flexShrink: 0,
                  color: 'var(--text-30)', cursor: 'pointer',
                  background: 'none', border: 'none',
                  transition: 'color var(--transition-fast)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)'; }}
                aria-label={t('editor.redo')}
                title={`${t('editor.redo')} (⌘⇧Z)`}
              >
                <ArrowClockwise size={16} />
              </button>
            </div>
          )}

          {/* Fullscreen toggle (only in edit mode) */}
          {editingNoteId && (
            <button
              type="button"
              onClick={() => setIsFullscreen(v => !v)}
              className="flex items-center justify-center"
              style={{
                flexShrink: 0,
                padding: 4,
                color: isFullscreen ? 'var(--text)' : 'var(--text-50)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
              }}
              aria-label={isFullscreen ? t('notes.exitFullscreen') : t('notes.openFullscreen')}
              title={isFullscreen ? t('notes.exitFullscreenHint') : t('notes.openFullscreen')}
            >
              {isFullscreen ? <ArrowsInSimple size={18} /> : <ArrowsOutSimple size={18} />}
            </button>
          )}

          {/* Consolidated actions menu (prefs, import, export, delete) */}
          {editingNoteId && (
            <NoteActionsMenu
              onExportTxt={handleExportTxt}
              onExportMarkdown={handleExportMarkdown}
              onExportDocx={handleExportDocx}
              onExportPdf={handleExportPdf}
              onImport={handleImport}
              onDelete={handleDelete}
              currentNoteId={editingNoteId}
              currentTopicId={activeNoteTopicId ?? undefined}
            />
          )}

          <button
            type="button"
            onClick={handleClose}
            className="flex items-center justify-center"
            style={{
              flexShrink: 0,
              padding: 4,
              color: 'var(--text-50)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
            }}
            aria-label={t('common.closePanel')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — single scroll container regardless of fullscreen state.
            Popovers from BlockNote still need to escape, but setting this to
            auto would clip them. We use `visible` in editor mode and rely on
            the inner content column having its own max-height via flex. */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflowY: editingNoteId ? 'visible' : 'auto',
          }}
        >
          {editingNoteId && editingNote ? (
            /* ── Editor view ─────────────────────────────────── */
            <div
              className="flex flex-col flex-1"
              style={{
                minHeight: 0,
                overflowY: 'auto',
                // Subtle padding to give popovers room to render — they'll
                // still escape via the outer body's overflow: visible.
              }}
            >
              <div
                style={{
                  // Max-width morphs between panel-width and user-chosen width
                  // in fullscreen. Margin-auto always applies so the column
                  // centers naturally as its max-width grows.
                  maxWidth: isFullscreen ? Math.max(widthPx, 860) : widthPx,
                  width: '100%',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'max-width 460ms cubic-bezier(0.22, 1, 0.36, 1)',
                  // CSS custom properties consumed by blocknote-theme.css to
                  // swap body font, title font, size, and line-height per note.
                  ['--note-body-font' as string]: bodyFontVar,
                  ['--note-title-font' as string]: titleFontVar,
                  ['--note-body-size' as string]: bodySizeVar,
                  ['--note-line-height' as string]: lineHeightVar,
                }}
              >
                {/* Title row — icon + editable title */}
                <div
                  className="flex items-center"
                  style={{
                    gap: 16,
                    paddingLeft: 54,
                    paddingRight: 54,
                    paddingTop: isFullscreen ? 80 : 28,
                    paddingBottom: isFullscreen ? 12 : 8,
                    transition:
                      'padding-top 460ms cubic-bezier(0.22, 1, 0.36, 1), padding-bottom 460ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  <NoteIconButton
                    icon={editingNote.icon}
                    size={isFullscreen ? 56 : 42}
                    onChange={(icon) => updateNote(editingNote.id, { icon })}
                  />
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={e => handleTitleChange(e.target.value)}
                    placeholder={t('notes.untitled')}
                    style={{
                      fontFamily: 'var(--note-title-font, var(--font-serif))',
                      fontSize: isFullscreen ? 56 : 42,
                      fontWeight: 400,
                      color: 'var(--text)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      outline: 'none',
                      flex: 1,
                      minWidth: 0,
                      lineHeight: 1.2,
                      transition: 'font-size 460ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                </div>

                {/* BlockNote editor */}
                <div
                  className="flex-1"
                  style={{ minHeight: 0 }}
                >
                  <Suspense fallback={<NoteEditorSkeleton fullscreen={isFullscreen} />}>
                    <NoteEditor
                      ref={editorRef}
                      key={editingNoteId}
                      noteId={editingNoteId}
                      initialContent={deserializeNoteBody(editingNote.body, editingNote.bodyVersion)}
                      onSave={handleBodySave}
                    />
                  </Suspense>
                </div>
              </div>
            </div>
          ) : (
            /* ── List view ───────────────────────────────────── */
            <div
              style={{
                padding: '24px 28px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* Section label + count */}
              {topicNotes.length > 0 && (
                <div
                  className="flex items-baseline justify-between"
                  style={{
                    marginBottom: 4,
                    paddingBottom: 12,
                    borderBottom: '1px solid var(--text-08)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                      color: 'var(--text-50)',
                    }}
                  >
                    {t('notes.topicNotesOf')}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-30)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {t('notes.noteCount', { count: topicNotes.length })}
                  </span>
                </div>
              )}

              {/* Empty state */}
              {topicNotes.length === 0 && (
                <div
                  className="flex flex-col items-center"
                  style={{ paddingTop: 64, gap: 16 }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed var(--text-15)',
                    }}
                  >
                    <NotePencil size={24} style={{ color: 'var(--text-30)' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 18,
                        color: 'var(--text)',
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {t('notes.emptyState')}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'var(--text-50)',
                        margin: '6px 0 0',
                        lineHeight: 1.5,
                        maxWidth: 240,
                      }}
                    >
                      {t('notes.emptyStateTopicHint')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleNewNote}
                    className="flex items-center gap-2"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                      color: 'var(--accent-coral)',
                      background: 'none',
                      border: '1px solid var(--accent-coral)',
                      cursor: 'pointer',
                      padding: '8px 16px',
                      marginTop: 4,
                    }}
                  >
                    <Plus size={14} weight="bold" />
                    {t('notes.newNote')}
                  </button>
                </div>
              )}

              {/* Note cards */}
              {topicNotes.map(note => (
                <NoteListCard
                  key={note.id}
                  note={note}
                  onOpen={() => handleOpenNote(note)}
                />
              ))}

              {/* Add note button */}
              {topicNotes.length > 0 && (
                <button
                  type="button"
                  onClick={handleNewNote}
                  className="flex items-center justify-center gap-2"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    color: 'var(--text-50)',
                    background: 'none',
                    border: '1px dashed var(--text-15)',
                    cursor: 'pointer',
                    padding: '14px 16px',
                    marginTop: 6,
                    transition: 'color var(--transition-fast), border-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--accent-coral)';
                    e.currentTarget.style.borderColor = 'var(--accent-coral)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-50)';
                    e.currentTarget.style.borderColor = 'var(--text-15)';
                  }}
                >
                  <Plus size={14} weight="bold" />
                  {t('notes.newNote')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <NoteTemplatePicker
        open={templatePickerOpen}
        onSelect={handleTemplateSelected}
        onClose={() => setTemplatePickerOpen(false)}
      />
    </>
  );
}

/* ── NoteListCard ─────────────────────────────────────────────────── */

interface NoteListCardProps {
  note: Note;
  onOpen: () => void;
}

type BadgeKey = 'headings' | 'lists' | 'codeBlocks' | 'images' | 'embeds' | 'linkPreviews' | 'tables' | 'quotes';

const BADGE_DEFS: {
  key: BadgeKey;
  Icon: Icon;
}[] = [
  { key: 'headings', Icon: TextT },
  { key: 'lists', Icon: ListBullets },
  { key: 'codeBlocks', Icon: Code },
  { key: 'images', Icon: ImageIcon },
  { key: 'embeds', Icon: VideoCamera },
  { key: 'linkPreviews', Icon: LinkSimple },
  { key: 'tables', Icon: Table },
  { key: 'quotes', Icon: Quotes },
];

function NoteListCard({ note, onOpen }: NoteListCardProps) {
  const { t } = useTranslation();
  const preview = extractNotePreview(note.body, note.bodyVersion, 180);
  const stats: NoteBlockStats = getNoteBlockStats(note.body, note.bodyVersion);
  const tags = getNoteTags(note).slice(0, 4);

  const activeBadges = BADGE_DEFS.filter(({ key }) => stats[key] > 0).slice(0, 4);
  const readingMinutes = Math.max(1, Math.round(stats.wordCount / 220));

  return (
    <button
      type="button"
      onClick={onOpen}
      className="note-list-card"
      style={{
        position: 'relative',
        padding: '18px 20px 16px',
        border: '1px solid var(--text-08)',
        background: 'var(--bg-surface)',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        transition:
          'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--text-15)';
        e.currentTarget.style.boxShadow = '0 4px 14px var(--shadow-sm)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--text-08)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Accent bar (subtle coral stripe on left edge, fades in on hover) */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 2,
          background: 'var(--accent-coral)',
          opacity: 0,
          transition: 'opacity 160ms ease',
          pointerEvents: 'none',
        }}
        className="note-card-accent"
      />

      {/* Title row */}
      <div className="flex items-start justify-between" style={{ gap: 12 }}>
        <div
          className="flex items-start"
          style={{ gap: 10, flex: 1, minWidth: 0 }}
        >
          {note.icon && (
            <span
              aria-hidden
              style={{
                fontSize: 22,
                lineHeight: 1.1,
                flexShrink: 0,
                userSelect: 'none',
              }}
            >
              {note.icon}
            </span>
          )}
          <h4
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              fontWeight: 400,
              color: 'var(--text)',
              margin: 0,
              lineHeight: 1.25,
              flex: 1,
              minWidth: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {note.title || t('notes.untitled')}
          </h4>
        </div>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-30)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            letterSpacing: '0.3px',
            textTransform: 'uppercase',
            fontWeight: 500,
            marginTop: 4,
          }}
        >
          {timeAgo(note.updatedAt)}
        </span>
      </div>

      {/* Preview */}
      {preview && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-50)',
            margin: 0,
            lineHeight: 1.55,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {preview}
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex" style={{ gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: '2px 7px',
                background: 'var(--text-04)',
                border: '1px solid var(--text-08)',
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--text-50)',
                letterSpacing: '0.2px',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Metadata footer: stats + badges */}
      {(stats.wordCount > 0 || activeBadges.length > 0) && (
        <div
          className="flex items-center"
          style={{
            gap: 10,
            marginTop: 4,
            paddingTop: 10,
            borderTop: '1px solid var(--text-08)',
          }}
        >
          {stats.wordCount > 0 && (
            <>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-30)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('notes.wordCount', { count: stats.wordCount })}
              </span>
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  background: 'var(--text-15)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-30)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {readingMinutes} min
              </span>
            </>
          )}

          {/* Content-type badges */}
          {activeBadges.length > 0 && (
            <div className="flex items-center" style={{ gap: 4, marginLeft: 'auto' }}>
              {activeBadges.map(({ key, Icon }) => (
                <span
                  key={key}
                  title={`${stats[key]} ${t(`notes.blocks.${key}`).toLowerCase()}`}
                  className="flex items-center"
                  style={{
                    gap: 3,
                    padding: '3px 6px',
                    background: 'var(--text-04)',
                    border: '1px solid var(--text-08)',
                    color: 'var(--text-50)',
                    fontSize: 10,
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <Icon size={10} />
                  {stats[key]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
