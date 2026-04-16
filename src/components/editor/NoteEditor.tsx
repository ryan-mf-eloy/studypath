import { useMemo, useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import { Copy, Check, ArrowElbowDownLeft, ArrowsOutLineHorizontal } from '@phosphor-icons/react';
import {
  useCreateBlockNote,
  SuggestionMenuController,
  GridSuggestionMenuController,
  SideMenuController,
  SideMenu,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
  type DefaultReactGridSuggestionItem,
  type SideMenuProps,
} from '@blocknote/react';
import CustomDragHandleMenu from './CustomDragHandleMenu';
import EmojiMartPicker from './EmojiMartPicker';
import { BlockNoteView } from '@blocknote/mantine';
import { MantineProvider } from '@mantine/core';
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  type Block,
  type BlockNoteEditor,
} from '@blocknote/core';
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core/extensions';
import { VideoCamera, Globe } from '@phosphor-icons/react';
import { studyPathLightTheme, studyPathDarkTheme } from './editorTheme';
import { useThemeStore } from '../../store/useThemeStore';
import { useAutoSave } from './useAutoSave';
import { codeBlockWithHighlight } from './codeBlockConfig';
import { embedBlock } from './embedBlock';
import { linkPreviewBlock } from './linkPreviewBlock';

/* ── Custom side menu — stable ref, defined outside any component ──── */
function CustomSideMenu(props: SideMenuProps) {
  return <SideMenu {...props} dragHandleMenu={CustomDragHandleMenu} />;
}

/* ── Schema with custom blocks ─────────────────────────────────────── */
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: codeBlockWithHighlight,
    embed: embedBlock(),
    linkPreview: linkPreviewBlock(),
  },
});

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyEditor = BlockNoteEditor<any, any, any>;

/* ── Custom slash menu items ───────────────────────────────────────── */
function getCustomSlashMenuItems(editor: AnyEditor): DefaultReactSuggestionItem[] {
  return [
    {
      title: 'Embed',
      subtext: 'YouTube, Vimeo ou vídeo direto',
      icon: <VideoCamera size={18} />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'embed',
        } as any);
      },
      aliases: ['video', 'youtube', 'vimeo', 'embed', 'iframe', 'media'],
      group: 'Media',
    },
    {
      title: 'Link preview',
      subtext: 'Card de link com Open Graph',
      icon: <Globe size={18} />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'linkPreview',
        } as any);
      },
      aliases: ['link', 'bookmark', 'og', 'preview', 'url', 'media'],
      group: 'Media',
    },
  ];
}

/* ── URL detection helpers ─────────────────────────────────────────── */
import { normalizeUrl } from '../../lib/utils';
import { isEmbeddableUrl } from '../../lib/embedProviders';

/**
 * Classify a pasted string as embed or linkPreview. Auto-prefixes `https://`
 * on bare domains. Provider detection is fully decoupled via the registry
 * in `src/lib/embedProviders.ts`.
 */
function classifyUrl(raw: string): { kind: 'embed' | 'linkPreview'; url: string } | null {
  const url = normalizeUrl(raw);
  if (!url) return null;
  return { kind: isEmbeddableUrl(url) ? 'embed' : 'linkPreview', url };
}

export interface NoteEditorHandle {
  undo: () => void;
  redo: () => void;
}

interface NoteEditorProps {
  noteId: string;
  initialContent: Block[];
  onSave: (noteId: string, body: string) => void;
  ref?: React.Ref<NoteEditorHandle>;
}

function NoteEditorInner({ noteId, initialContent, onSave, ref }: NoteEditorProps) {
  const theme = useThemeStore(s => s.theme);
  const editorTheme = theme === 'dark' ? studyPathDarkTheme : studyPathLightTheme;

  const safeContent = useMemo(
    () => (initialContent.length > 0 ? (initialContent as any) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [noteId],
  );

  const editor = useCreateBlockNote({
    schema,
    initialContent: safeContent,
    uploadFile: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/files', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.url;
    },
  });

  useAutoSave({ editor: editor as unknown as AnyEditor, noteId, onSave });

  // Expose undo/redo to parent via ref
  useImperativeHandle(ref, () => ({
    undo: () => { try { (editor as any).undo(); } catch {} },
    redo: () => { try { (editor as any).redo(); } catch {} },
  }), [editor]);

  // Auto-detect URLs on paste → convert to embed/linkPreview blocks
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePaste = (event: Event) => {
      const clipboardEvent = event as ClipboardEvent;
      const text = clipboardEvent.clipboardData?.getData('text/plain')?.trim();
      if (!text) return;
      const result = classifyUrl(text);
      if (!result) return;

      const ed = editor as unknown as AnyEditor;
      const pos = ed.getTextCursorPosition();
      const currentBlock = pos.block;
      if (['codeBlock', 'table'].includes(currentBlock.type)) return;
      const isEmptyBlock =
        currentBlock.type === 'paragraph' &&
        (!currentBlock.content ||
          (Array.isArray(currentBlock.content) && currentBlock.content.length === 0));
      if (!isEmptyBlock) return;

      clipboardEvent.preventDefault();
      clipboardEvent.stopPropagation();

      ed.insertBlocks(
        [
          { type: result.kind, props: { url: result.url } } as any,
          { type: 'paragraph' } as any,
        ],
        currentBlock,
        'after',
      );
      ed.removeBlocks([currentBlock]);
    };

    container.addEventListener('paste', handlePaste, true);
    return () => container.removeEventListener('paste', handlePaste, true);
  }, [editor]);

  // Track code block positions so we can render action buttons (copy + wrap)
  // as React overlays outside of ProseMirror's managed DOM. ProseMirror
  // strips any child nodes injected into the code block container, so the
  // overlay approach is the only reliable way to add controls.
  const [codeBlockTargets, setCodeBlockTargets] = useState<
    Array<{ key: string; top: number; right: number }>
  >([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Per-code-block wrap state (keyed by block index)
  const [wrappedKeys, setWrappedKeys] = useState<Set<string>>(new Set());

  const measureCodeBlocks = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const blocks = container.querySelectorAll<HTMLElement>(
      '[data-content-type="codeBlock"]',
    );
    const next = [...blocks].map((cb, i) => {
      const r = cb.getBoundingClientRect();
      return {
        key: `cb-${i}`,
        top: r.top - containerRect.top + scrollTop + 8,
        right: containerRect.right - r.right + 118, // leaves room for lang selector
      };
    });
    setCodeBlockTargets(next);
  }, []);

  // Apply wrap state to individual code blocks.
  // ProseMirror strips both attributes and inline styles from its managed
  // elements, so we inject a dynamic <style> tag whose selectors target
  // each wrapped code block by its sibling index among `.bn-block-outer`
  // elements at the top of the editor tree.
  const styleTagRef = useRef<HTMLStyleElement | null>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Make sure our style element exists inside the wrapper (outside
    // ProseMirror's managed subtree under .bn-container).
    if (!styleTagRef.current) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-code-wrap-rules', '');
      container.appendChild(styleEl);
      styleTagRef.current = styleEl;
    }
    const styleEl = styleTagRef.current;

    const blocks = container.querySelectorAll<HTMLElement>(
      '[data-content-type="codeBlock"]',
    );
    const selectors: string[] = [];
    blocks.forEach((cb, i) => {
      const key = `cb-${i}`;
      if (!wrappedKeys.has(key)) return;
      // Walk up to the nearest `.bn-block-outer` and count its sibling
      // position among its siblings (nth-of-type on .bn-block-outer).
      let outer: HTMLElement | null = cb;
      while (outer && !outer.classList?.contains('bn-block-outer')) {
        outer = outer.parentElement;
      }
      if (!outer || !outer.parentElement) return;
      const siblings = outer.parentElement.children;
      let idx = 0;
      for (let j = 0; j < siblings.length; j++) {
        if (siblings[j] === outer) {
          idx = j + 1; // nth-child is 1-based
          break;
        }
      }
      selectors.push(
        `.bn-container .bn-editor > div > .bn-block-outer:nth-child(${idx}) [data-content-type="codeBlock"] pre`,
      );
    });

    styleEl.textContent = selectors.length
      ? `${selectors.join(',\n')} {
           white-space: pre-wrap !important;
           word-break: break-word !important;
           overflow-x: hidden !important;
         }`
      : '';

    return () => {
      // Keep the style element alive across re-runs; only cleanup on unmount.
    };
  }, [wrappedKeys, codeBlockTargets]);

  // Remove the style tag on unmount
  useEffect(() => {
    return () => {
      styleTagRef.current?.remove();
      styleTagRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let scheduled: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (scheduled !== null) return;
      scheduled = setTimeout(() => {
        scheduled = null;
        measureCodeBlocks();
      }, 60);
    };

    // Initial measurements — several attempts while the editor is mounting.
    const timers: ReturnType<typeof setTimeout>[] = [];
    [0, 100, 300, 600].forEach((d) => timers.push(setTimeout(measureCodeBlocks, d)));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed: any = editor;
    const unsubscribe = ed?.onChange?.(schedule);

    // Find the scroll container (NotePanel sets overflowY: auto on its body)
    let scrollEl: HTMLElement | null = container;
    while (scrollEl && scrollEl !== document.body) {
      const cs = getComputedStyle(scrollEl);
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') break;
      scrollEl = scrollEl.parentElement;
    }
    scrollEl?.addEventListener('scroll', schedule, { passive: true });

    const resizeObserver = new ResizeObserver(() => schedule());
    resizeObserver.observe(container);

    return () => {
      if (scheduled !== null) clearTimeout(scheduled);
      timers.forEach((t) => clearTimeout(t));
      scrollEl?.removeEventListener('scroll', schedule);
      resizeObserver.disconnect();
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [editor, measureCodeBlocks]);

  const handleCopy = useCallback(
    async (targetIndex: number, key: string) => {
      const container = containerRef.current;
      if (!container) return;
      const blocks = container.querySelectorAll<HTMLElement>(
        '[data-content-type="codeBlock"]',
      );
      const cb = blocks[targetIndex];
      const text = cb?.querySelector('code')?.textContent ?? '';
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 1500);
      } catch {
        /* clipboard blocked — swallow */
      }
    },
    [],
  );

  const handleWrapToggle = useCallback((key: string) => {
    setWrappedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  /* ── Drag multi-select (Notion-style) ─────────────────────────────
     Click+drag in the editor's gutter (outside block content) draws a
     selection rectangle. Any block whose bounding box intersects the
     rect gets highlighted via the `sp-block-selected` class on its
     `.bn-block-outer`. Delete/Backspace removes all selected blocks. */
  const [dragRect, setDragRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const selectedBlockIdsRef = useRef<Set<string>>(new Set());

  const clearBlockSelection = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container
        .querySelectorAll('.bn-block-outer.sp-block-selected')
        .forEach((el) => el.classList.remove('sp-block-selected'));
    }
    selectedBlockIdsRef.current.clear();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const DRAG_THRESHOLD = 4; // px — move at least this much before the rect appears

    let pendingDrag = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let rafId: number | null = null;
    let lastClientX = 0;
    let lastClientY = 0;

    const applySelection = () => {
      rafId = null;
      const rect = container.getBoundingClientRect();
      const x = Math.min(startX, lastClientX);
      const y = Math.min(startY, lastClientY);
      const w = Math.abs(lastClientX - startX);
      const h = Math.abs(lastClientY - startY);

      setDragRect({
        x: x - rect.left,
        y: y - rect.top,
        w,
        h,
      });

      // Intersect in viewport space — both mouse coords and BCRs live there.
      const dragL = x;
      const dragR = x + w;
      const dragT = y;
      const dragB = y + h;
      const blocks = container.querySelectorAll<HTMLElement>('.bn-block-outer');
      const newSel = new Set<string>();
      blocks.forEach((b) => {
        const r = b.getBoundingClientRect();
        if (r.right < dragL || r.left > dragR || r.bottom < dragT || r.top > dragB) {
          if (b.classList.contains('sp-block-selected')) b.classList.remove('sp-block-selected');
          return;
        }
        const id = b.getAttribute('data-id');
        if (!id) return;
        newSel.add(id);
        if (!b.classList.contains('sp-block-selected')) b.classList.add('sp-block-selected');
      });
      selectedBlockIdsRef.current = newSel;
    };

    /** Commits the DOM-based selection to BlockNote's editor state.
     *  Uses editor.setSelection(startId, endId) so the selection becomes
     *  a real native BlockNote selection — unlocking Delete/Backspace,
     *  Copy/Paste, and the drag-handle multi-move. */
    const commitSelectionToEditor = () => {
      const selectedEls = Array.from(
        container.querySelectorAll<HTMLElement>('.bn-block-outer.sp-block-selected'),
      );
      if (selectedEls.length === 0) return;

      // Sort by vertical position so first/last reflect document order
      selectedEls.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      const firstId = selectedEls[0].getAttribute('data-id');
      const lastId = selectedEls[selectedEls.length - 1].getAttribute('data-id');
      if (!firstId || !lastId) return;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ed: any = editor;
        if (typeof ed.setSelection === 'function') {
          if (firstId === lastId) {
            ed.setTextCursorPosition?.(firstId, 'start');
          } else {
            ed.setSelection(firstId, lastId);
          }
          // Focus the editor so keyboard shortcuts apply to the selection
          if (typeof ed.focus === 'function') ed.focus();
          else (container.querySelector('[contenteditable="true"]') as HTMLElement | null)?.focus();
        }
      } catch {
        /* Fallback: custom keyboard handler below still works via removeBlocks */
      }
    };

    const scheduleUpdate = (cx: number, cy: number) => {
      lastClientX = cx;
      lastClientY = cy;
      if (rafId !== null) return;
      rafId = requestAnimationFrame(applySelection);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      // Never intercept clicks on interactive UI or resize handles
      if (target?.closest?.('.code-actions-overlay, .code-action-btn')) return;
      if (target?.closest?.('.bn-side-menu, .bn-toolbar, .mantine-Popover-dropdown, .bn-drag-handle')) return;
      if (target?.closest?.('.bn-resize-handle, [data-file-block] .bn-visual-media-wrapper')) return;
      if (target?.closest?.('input, textarea, button, select, a, img, video, audio, iframe')) return;

      // Record start but DON'T preventDefault — single clicks still need
      // to place the text cursor. We only take over once the drag exceeds
      // the threshold (in handleMouseMove).
      pendingDrag = true;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!pendingDrag && !isDragging) return;
      if (!isDragging) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return;
        isDragging = true;
        // Drag confirmed — clear any prior block selection and suppress the
        // browser's native text selection (.getSelection) so the visual is clean.
        clearBlockSelection();
        try {
          window.getSelection()?.removeAllRanges();
        } catch {
          /* noop */
        }
      }
      // Block ProseMirror/native text-selection extension from here on.
      e.preventDefault();
      e.stopPropagation();
      scheduleUpdate(e.clientX, e.clientY);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!pendingDrag && !isDragging) return;
      pendingDrag = false;
      if (isDragging) {
        isDragging = false;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setDragRect(null);
        e.preventDefault();
        e.stopPropagation();
        // Commit to BlockNote state so Delete/Backspace/Copy/Drag-to-move work
        commitSelectionToEditor();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const sel = selectedBlockIdsRef.current;
      if (sel.size === 0) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        clearBlockSelection();
      }
      // Delete/Backspace/Copy/Cut/Drag are all handled natively by BlockNote
      // because commitSelectionToEditor() set a real selection on the editor.
    };

    const handleClickAway = (e: MouseEvent) => {
      if (selectedBlockIdsRef.current.size === 0) return;
      const target = e.target as Element | null;
      if (target?.closest?.('.bn-block-outer.sp-block-selected')) return;
      clearBlockSelection();
    };

    // Use capture phase so we intercept the event before ProseMirror's
    // own handlers swallow it on the .ProseMirror element.
    container.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickAway, true);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickAway, true);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [editor, clearBlockSelection]);

  // ── Drag-handle open → highlight the block ───────────────────────
  // Polls for aria-expanded="true" on the drag handle button. When found,
  // injects a <style> tag targeting the block by [data-id] — this is the
  // ONLY reliable approach because ProseMirror recreates DOM elements on
  // every editor state change, stripping any classes added via JS.
  // A <style> with an attribute selector is immune to DOM recreation.
  useEffect(() => {
    const STYLE_ID = 'sp-drag-highlight-style';
    let currentBlockId: string | null = null;

    // Media block types that show a special toolbar when NodeSelected
    const MEDIA_TYPES = new Set(['image', 'video', 'audio', 'file', 'embed']);

    const poll = setInterval(() => {
      const sm = document.querySelector('.bn-side-menu');
      const expanded = sm?.querySelector('button[aria-expanded="true"]');

      if (expanded) {
        // Menu is open — find the block and inject highlight style
        const smRect = sm!.getBoundingClientRect();
        const blocks = document.querySelectorAll('[data-node-type="blockOuter"]');
        let best: Element | null = null;
        let bestDist = Infinity;
        for (const b of blocks) {
          const d = Math.abs(b.getBoundingClientRect().top - smRect.top);
          if (d < bestDist) { bestDist = d; best = b; }
        }
        const id = best && bestDist < 100 ? best.getAttribute('data-id') : null;
        if (id && id !== currentBlockId) {
          currentBlockId = id;
          document.getElementById(STYLE_ID)?.remove();
          const style = document.createElement('style');
          style.id = STYLE_ID;
          style.textContent = `[data-node-type="blockOuter"][data-id="${id}"]{background-color:rgba(55,131,235,0.08)!important;outline:2px solid rgba(55,131,235,0.35)!important;outline-offset:-1px;border-radius:4px;transition:background-color .15s ease,outline-color .15s ease}`;
          document.head.appendChild(style);

          // For media blocks, click the actual media element (img, video,
          // iframe, audio, or the file wrapper) to trigger ProseMirror's
          // NodeSelection which shows the File/Media toolbar.
          const blockType = sm?.getAttribute('data-block-type') ?? '';
          if (MEDIA_TYPES.has(blockType) && best) {
            try {
              const media =
                best.querySelector('img') ??
                best.querySelector('video') ??
                best.querySelector('iframe') ??
                best.querySelector('audio') ??
                best.querySelector('.bn-file-name-with-icon') ??
                best.querySelector('.bn-visual-media');
              if (media) {
                (media as HTMLElement).click();
              }
            } catch {}
          }
        }
      } else if (currentBlockId) {
        // Menu closed — remove highlight
        currentBlockId = null;
        document.getElementById(STYLE_ID)?.remove();
      }
    }, 150);

    return () => {
      clearInterval(poll);
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return (
    <MantineProvider>
      <div
        ref={containerRef}
        style={{ height: '100%', position: 'relative' }}
      >
        {/* Drag multi-select rectangle */}
        {dragRect && (
          <div
            className="sp-drag-rect"
            style={{
              position: 'absolute',
              left: dragRect.x,
              top: dragRect.y,
              width: dragRect.w,
              height: dragRect.h,
              pointerEvents: 'none',
              zIndex: 10,
            }}
          />
        )}

        {/* Code block action overlays — Wrap + Copy buttons per block */}
        {codeBlockTargets.map((t, i) => {
          const isCopied = copiedKey === t.key;
          const isWrapped = wrappedKeys.has(t.key);
          return (
            <div
              key={t.key}
              className="code-actions-overlay"
              style={{
                position: 'absolute',
                top: t.top,
                right: t.right,
                zIndex: 5,
                display: 'flex',
                gap: 4,
              }}
            >
              <button
                type="button"
                className={`code-action-btn ${isWrapped ? 'is-active' : ''}`}
                aria-label={isWrapped ? 'Desativar quebra de linha' : 'Ativar quebra de linha'}
                title={isWrapped ? 'Scroll horizontal' : 'Quebrar linha'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleWrapToggle(t.key);
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {isWrapped ? (
                  <ArrowsOutLineHorizontal size={13} />
                ) : (
                  <ArrowElbowDownLeft size={13} weight="bold" />
                )}
              </button>
              <button
                type="button"
                className={`code-action-btn ${isCopied ? 'is-copied' : ''}`}
                aria-label="Copiar código"
                title={isCopied ? 'Copiado!' : 'Copiar código'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopy(i, t.key);
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                {isCopied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
              </button>
            </div>
          );
        })}
        <BlockNoteView
          editor={editor}
          theme={editorTheme}
          slashMenu={false}
          emojiPicker={false}
          sideMenu={false}
        >
          <SideMenuController sideMenu={CustomSideMenu} />
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) => {
              const defaults = getDefaultReactSlashMenuItems(editor);
              const custom = getCustomSlashMenuItems(editor as unknown as AnyEditor);
              const merged = [...defaults];
              const lastMediaIndex = merged.reduce(
                (acc, item, idx) => (item.group === 'Media' ? idx : acc),
                -1,
              );
              const insertAt = lastMediaIndex >= 0 ? lastMediaIndex + 1 : merged.length;
              merged.splice(insertAt, 0, ...custom);
              return filterSuggestionItems(merged, query);
            }}
          />
          {/* Custom emoji picker: emoji-mart with search + categories */}
          <GridSuggestionMenuController
            triggerCharacter=":"
            columns={9}
            minQueryLength={0}
            getItems={async () => {
              // Single placeholder item — the picker UI handles actual selection
              const placeholder: DefaultReactGridSuggestionItem = {
                id: 'emoji-placeholder',
                onItemClick: () => {
                  /* overridden by EmojiMartPicker's synthetic items */
                },
              };
              return [placeholder];
            }}
            gridSuggestionMenuComponent={EmojiMartPicker}
            onItemClick={(item) => {
              item.onItemClick();
            }}
          />
        </BlockNoteView>
      </div>
    </MantineProvider>
  );
}

export default NoteEditorInner;
