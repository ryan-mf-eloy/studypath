import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
  MagnifyingGlass,
  NotePencil,
  Trophy,
  CalendarBlank,
} from '@phosphor-icons/react';
import { useUIStore } from '../../store/useUIStore';
import { useNotesStore } from '../../store/useNotesStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { useProgressStore } from '../../store/useProgressStore';
import {
  buildSearchIndex,
  buildSuggestions,
  filterResults,
  type SearchResult,
} from '../../lib/commandPaletteSearch';
import { navigateToResult } from '../../lib/navigateToResult';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import { resolveMilestoneColor } from '../../lib/utils';
import { ICONS, resolveIcon } from '../../lib/iconRegistry';
import type { Focus, RoadmapData, Milestone } from '../../types';

/* ─── Ícone por tipo de resultado ─────────────────────────────────── */

/** Encontra o focus que contém o tópico dado no roadmap atual. */
function focusOfTopic(roadmap: RoadmapData, topicId: string): Focus | null {
  for (const phase of roadmap.phases) {
    for (const month of phase.months) {
      for (const focus of month.focuses) {
        if (focus.topics.some((t) => t.id === topicId)) return focus;
      }
    }
  }
  return null;
}

/** Encontra um focus pelo id no roadmap atual. */
function focusById(roadmap: RoadmapData, id: string): Focus | null {
  return (
    roadmap.phases
      .flatMap((p) => p.months)
      .flatMap((m) => m.focuses)
      .find((f) => f.id === id) ?? null
  );
}

function ResultIcon({
  result,
  roadmap,
  size = 15,
}: {
  result: SearchResult;
  roadmap: RoadmapData;
  size?: number;
}) {
  const props = { size, className: 'sp-cmd-item-icon' };

  switch (result.kind) {
    case 'topic': {
      // Always use the owning focus's current icon + color.
      const focus = focusOfTopic(roadmap, result.topicId);
      if (focus) {
        const meta = resolveFocusMeta(focus);
        const Icon = meta.Icon;
        return <Icon {...props} style={{ color: meta.color }} />;
      }
      return <NotePencil {...props} />;
    }

    case 'note': {
      // User's emoji override wins (notes have their own icon field).
      if (result.icon) {
        return (
          <span
            aria-hidden
            className="sp-cmd-item-icon"
            style={{
              fontSize: size + 2,
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: size + 4,
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            {result.icon}
          </span>
        );
      }
      // Otherwise fall back to the owning focus's icon/color.
      const focus = focusOfTopic(roadmap, result.topicId);
      if (focus) {
        const meta = resolveFocusMeta(focus);
        const Icon = meta.Icon;
        return <Icon {...props} style={{ color: meta.color }} />;
      }
      return <NotePencil {...props} />;
    }

    case 'focus': {
      const focus = focusById(roadmap, result.id);
      if (focus) {
        const meta = resolveFocusMeta(focus);
        const Icon = meta.Icon;
        return <Icon {...props} style={{ color: meta.color }} />;
      }
      return <NotePencil {...props} />;
    }

    case 'milestone': {
      // Use the milestone's current icon + color overrides.
      const milestone = roadmap.milestones.find((m) => m.id === result.id);
      const resolved: Milestone | null = milestone ?? null;
      const color = resolved
        ? resolveMilestoneColor(resolved)
        : 'var(--accent-lilac)';
      const Icon =
        resolved && resolved.icon && ICONS[resolved.icon]
          ? resolveIcon(resolved.icon, Trophy)
          : Trophy;
      return <Icon {...props} style={{ color }} />;
    }

    case 'month':
      return <CalendarBlank {...props} />;
  }
}

/* ─── Item renderer ───────────────────────────────────────────────── */

interface ItemProps {
  result: SearchResult;
  roadmap: RoadmapData;
  selected: boolean;
  onHover: () => void;
  onClick: () => void;
  elRef: (el: HTMLButtonElement | null) => void;
}

function CommandItem({ result, roadmap, selected, onHover, onClick, elRef }: ItemProps) {
  const { t } = useTranslation();
  /* Label + subtext/meta por tipo */
  let label: string;
  let subtext: string | undefined;
  let meta: string | undefined;

  switch (result.kind) {
    case 'topic':
      label = result.label;
      meta = result.monthLabel;
      break;
    case 'note':
      label = result.title;
      subtext = result.preview || undefined;
      meta = t('search.noteLabel');
      break;
    case 'focus':
      label = result.name;
      meta = result.monthLabel;
      break;
    case 'milestone': {
      label = result.name;
      const d = new Date(result.date);
      meta = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      subtext = result.description;
      break;
    }
    case 'month':
      label = result.label;
      meta = result.phaseLabel;
      break;
  }

  return (
    <button
      ref={elRef}
      type="button"
      role="option"
      aria-selected={selected}
      className={`sp-cmd-item ${selected ? 'is-selected' : ''}`}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <ResultIcon result={result} roadmap={roadmap} />
      <div className="sp-cmd-item-body">
        <span className="sp-cmd-item-label">{label}</span>
        {subtext && <span className="sp-cmd-item-subtext">{subtext}</span>}
      </div>
      {meta && <span className="sp-cmd-item-meta">{meta}</span>}
    </button>
  );
}

/* ─── Root component ──────────────────────────────────────────────── */

export default function CommandPalette() {
  const { t } = useTranslation();
  const searchOpen = useUIStore(s => s.searchOpen);
  const searchQuery = useUIStore(s => s.searchQuery);
  const setSearchQuery = useUIStore(s => s.setSearchQuery);
  const closeSearch = useUIStore(s => s.closeSearch);
  const openSearch = useUIStore(s => s.openSearch);
  const searchNotes = useNotesStore(s => s.searchNotes);
  const roadmap = useRoadmap();
  const checkedTopics = useProgressStore(s => s.checkedTopics);

  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  /* Índice de busca — reconstruído quando o roadmap muda */
  const index = useMemo(() => buildSearchIndex(roadmap), [roadmap]);

  const trimmedQuery = searchQuery.trim();

  /* Filtro + agrupamento. Query vazia → sugestões iniciais. */
  const { groups, flatItems } = useMemo(() => {
    if (trimmedQuery === '') {
      return buildSuggestions(roadmap, checkedTopics);
    }
    return filterResults(index, searchQuery, searchNotes);
  }, [index, searchQuery, searchNotes, roadmap, checkedTopics, trimmedQuery]);

  /* Seleção — reseta ao mudar a query */
  const [selectedIndex, setSelectedIndex] = useState(0);
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  /* Animação: mount quando searchOpen, unmount com delay pra deixar a
     transição de saída acontecer. Visível flip é feito num efeito separado
     pra evitar que a cleanup do primeiro cancele o RAF antes de disparar. */
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (searchOpen) {
      setMounted(true);
      return;
    }
    if (mounted) {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 240);
      return () => clearTimeout(t);
    }
  }, [searchOpen, mounted]);

  // Uma vez que estamos montados, flipa `visible` no próximo tick
  // (setTimeout 20ms — mais confiável que RAF em tabs em background).
  useEffect(() => {
    if (!mounted || !searchOpen) return;
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [mounted, searchOpen]);

  /* Cmd+K / Ctrl+K global — toggle */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchOpen) closeSearch();
        else openSearch();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, openSearch, closeSearch]);

  /* Auto-focus input + scroll lock enquanto visível */
  useEffect(() => {
    if (!visible) return;
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  /* Scroll selecionado pra dentro do viewport do listbox */
  useEffect(() => {
    const el = itemRefs.current.get(selectedIndex);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  /* Teclado no input — ↑↓ Enter Esc */
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, Math.max(0, flatItems.length - 1)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter') {
      const picked = flatItems[selectedIndex];
      if (picked) {
        e.preventDefault();
        navigateToResult(picked);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSearch();
    }
  }

  if (!mounted) return null;

  /* Monta mapa de flat index por result para highlight consistente */
  let runningIdx = 0;

  return createPortal(
    <div
      className={`sp-cmd-root ${visible ? 'is-visible' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('search.title')}
    >
      <div className="sp-cmd-backdrop" onClick={closeSearch} />
      <div className="sp-cmd-modal" onClick={e => e.stopPropagation()}>
        {/* Input row */}
        <div className="sp-cmd-input-row">
          <MagnifyingGlass size={18} />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t('search.placeholder')}
            aria-label={t('common.search')}
            autoComplete="off"
            spellCheck={false}
          />
          <span className="sp-cmd-esc-hint">esc</span>
        </div>

        {/* Results */}
        <div className="sp-cmd-results" role="listbox" aria-label={t('search.title')}>
          {trimmedQuery === '' && flatItems.length === 0 && (
            <div className="sp-cmd-empty">
              {t('search.empty')}
              <span className="sp-cmd-empty-hint">
                {t('search.emptyHint', { up: '↑', down: '↓', enter: '↵' })
                  .split(/↑|↓|↵/)
                  .map((piece, idx, arr) => (
                    <span key={idx}>
                      {piece}
                      {idx < arr.length - 1 && (
                        <kbd>{idx === 0 ? '↑' : idx === 1 ? '↓' : '↵'}</kbd>
                      )}
                    </span>
                  ))}
              </span>
            </div>
          )}

          {trimmedQuery !== '' && flatItems.length === 0 && (
            <div className="sp-cmd-empty">{t('search.noResults')}</div>
          )}

          {groups.map(group => {
            const extra = group.totalCount - group.items.length;
            return (
              <section key={group.kind}>
                <div className="sp-cmd-group-label">{group.label}</div>
                {group.items.map(item => {
                  const flatIdx = runningIdx++;
                  return (
                    <CommandItem
                      key={`${group.kind}-${item.id}`}
                      result={item}
                      roadmap={roadmap}
                      selected={flatIdx === selectedIndex}
                      onHover={() => setSelectedIndex(flatIdx)}
                      onClick={() => navigateToResult(item)}
                      elRef={el => {
                        if (el) itemRefs.current.set(flatIdx, el);
                        else itemRefs.current.delete(flatIdx);
                      }}
                    />
                  );
                })}
                {extra > 0 && (
                  <div className="sp-cmd-more-hint">{t('search.moreResults', { count: extra })}</div>
                )}
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="sp-cmd-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> {t('search.hintNavigate')}</span>
          <span><kbd>↵</kbd> {t('search.hintOpen')}</span>
          <span><kbd>esc</kbd> {t('search.hintClose')}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
