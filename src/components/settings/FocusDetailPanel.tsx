import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Plus,
  Trash,
  CaretRight,
  CaretDown,
  DotsSixVertical,
} from '@phosphor-icons/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Focus, FocusType, Topic } from '../../types';
import { BUILT_IN_FOCUS_TYPES } from '../../types';
import { CategorySelect } from '../ui/CategorySelect';
import AppearanceButton from '../ui/AppearanceButton';
import SubtopicList from './SubtopicList';
import * as api from '../../lib/api';
import { refreshRoadmap } from '../../lib/serverSync';
import { nanoid, focusColor, focusLabel } from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import { useRoadmap } from '../../store/useRoadmapStore';
import { confirm } from '../../store/useConfirmStore';

interface FocusDetailPanelProps {
  focus: Focus;
  onClose: () => void;
}

const BUILT_IN_CATEGORIES = BUILT_IN_FOCUS_TYPES.map((t) => ({
  value: t,
  label: focusLabel(t),
  color: focusColor(t),
}));

/**
 * Slide-over à direita pra editar um foco inteiro — nome, tipo, identidade
 * visual (ícone + cor), mastery note e a lista completa de tópicos com
 * subtópicos aninhados. Auto-save on blur pra cada campo.
 */
export default function FocusDetailPanel({ focus, onClose }: FocusDetailPanelProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(focus.name);
  const [masteryNote, setMasteryNote] = useState(focus.masteryNote ?? '');
  const [savingName, setSavingName] = useState(false);
  const [savingMastery, setSavingMastery] = useState(false);
  const [topicDraftsDirty, setTopicDraftsDirty] = useState<Record<string, string>>({});
  const [newTopicDraft, setNewTopicDraft] = useState('');
  const [addingTopic, setAddingTopic] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);
  const roadmap = useRoadmap();

  // Categorias custom = tipos distintos usados em algum focus do roadmap que
  // não são built-ins. Coletadas dinamicamente pra não precisar de storage.
  const customCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of roadmap.phases) {
      for (const m of p.months) {
        for (const f of m.focuses) {
          if (f.type && !BUILT_IN_FOCUS_TYPES.includes(f.type)) {
            set.add(f.type);
          }
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [roadmap.phases]);

  // Sync from roadmap when the focus prop changes (after refreshRoadmap)
  useEffect(() => {
    setName(focus.name);
    setMasteryNote(focus.masteryNote ?? '');
  }, [focus.id, focus.name, focus.masteryNote]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const meta = resolveFocusMeta(focus);

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === focus.name) return;
    setSavingName(true);
    try {
      await api.updateFocus(focus.id, { name: trimmed });
      await refreshRoadmap();
    } finally {
      setSavingName(false);
    }
  };

  const saveMastery = async () => {
    const trimmed = masteryNote.trim();
    if (trimmed === (focus.masteryNote ?? '').trim()) return;
    setSavingMastery(true);
    try {
      await api.updateFocus(focus.id, { masteryNote: trimmed });
      await refreshRoadmap();
    } finally {
      setSavingMastery(false);
    }
  };

  const changeType = async (type: FocusType) => {
    await api.updateFocus(focus.id, { type });
    await refreshRoadmap();
  };

  const deleteCategory = async (category: string) => {
    const affected: string[] = [];
    for (const p of roadmap.phases) {
      for (const m of p.months) {
        for (const f of m.focuses) {
          if (f.type === category) affected.push(f.id);
        }
      }
    }
    const ok = await confirm({
      title: t('settings.structure.deleteCategoryTitle', { name: category }),
      message:
        affected.length === 0
          ? t('settings.structure.deleteCategoryUnused')
          : t('settings.structure.deleteCategoryInUse', { count: affected.length }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    for (const id of affected) {
      await api.updateFocus(id, { type: 'main' });
    }
    await refreshRoadmap();
  };

  const changeIcon = async (icon: string | undefined) => {
    await api.updateFocus(focus.id, { icon: icon ?? null });
    await refreshRoadmap();
  };

  const changeColor = async (color: string | undefined) => {
    await api.updateFocus(focus.id, { color: color ?? null });
    await refreshRoadmap();
  };

  const saveTopicLabel = async (topic: Topic, next: string) => {
    const trimmed = next.trim();
    if (!trimmed || trimmed === topic.label) return;
    await api.updateTopic(topic.id, { label: trimmed });
    await refreshRoadmap();
  };

  const removeTopic = async (topic: Topic) => {
    const ok = await confirm({
      title: t('settings.structure.deleteTopic'),
      message: t('settings.structure.deleteTopicConfirm', { label: topic.label }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await api.deleteTopic(topic.id);
    await refreshRoadmap();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onTopicDragEnd = async (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = focus.topics.findIndex((t) => t.id === active.id);
    const newIdx = focus.topics.findIndex((t) => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(focus.topics, oldIdx, newIdx);
    for (let i = 0; i < reordered.length; i++) {
      await api.updateTopic(reordered[i].id, { position: i });
    }
    await refreshRoadmap();
  };

  const addTopic = async () => {
    const trimmed = newTopicDraft.trim();
    if (!trimmed) {
      setAddingTopic(false);
      setNewTopicDraft('');
      return;
    }
    await api.createTopic({
      id: nanoid('topic'),
      focusId: focus.id,
      label: trimmed,
    });
    await refreshRoadmap();
    setNewTopicDraft('');
    setAddingTopic(false);
  };

  const toggleExpanded = (topicId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-backdrop)',
          zIndex: 440,
          animation: 'sp-confirm-backdrop-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label={t('common.edit') + ' ' + focus.name}
        className="sp-glass"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 520,
          maxWidth: '100vw',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-16px 0 40px var(--shadow-md)',
          zIndex: 450,
          display: 'flex',
          flexDirection: 'column',
          animation: 'sp-pop-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          transformOrigin: 'right center',
        }}
      >
        {/* Header */}
        <header
          className="flex items-center"
          style={{
            padding: '18px 22px 16px',
            gap: 12,
            borderBottom: '1px solid var(--text-08)',
            flexShrink: 0,
          }}
        >
          <AppearanceButton
            icon={focus.icon}
            color={focus.color}
            fallbackIcon={meta.Icon}
            fallbackColor={meta.color}
            size={28}
            onChangeIcon={changeIcon}
            onChangeColor={changeColor}
            ariaLabel={t('settings.structure.editAppearance')}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: 'var(--text-30)',
              }}
            >
              {t('settings.structure.subject')}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                color: 'var(--text)',
                lineHeight: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {focus.name}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-50)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </header>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '22px 22px 36px',
          }}
        >
          {/* Name */}
          <section style={{ marginBottom: 20 }}>
            <label style={LABEL} htmlFor={`name-${focus.id}`}>
              {t('settings.structure.name')}
            </label>
            <input
              id={`name-${focus.id}`}
              ref={firstInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
              }}
              disabled={savingName}
              style={INPUT}
            />
          </section>

          {/* Category */}
          <section style={{ marginBottom: 18 }}>
            <div style={LABEL}>{t('focusDetail.categoryLabel')}</div>
            <CategorySelect
              value={focus.type}
              builtIn={BUILT_IN_CATEGORIES}
              custom={customCategories}
              onChange={changeType}
              onDelete={deleteCategory}
              ariaLabel={t('focusDetail.categoryLabel')}
            />
          </section>

          {/* Mastery note */}
          <section style={{ marginBottom: 22 }}>
            <label style={LABEL} htmlFor={`mastery-${focus.id}`}>
              {t('settings.structure.masteryNote')}
            </label>
            <textarea
              id={`mastery-${focus.id}`}
              value={masteryNote}
              onChange={(e) => setMasteryNote(e.target.value)}
              onBlur={saveMastery}
              disabled={savingMastery}
              rows={3}
              placeholder={t('settings.structure.masteryNotePlaceholder')}
              style={{
                ...INPUT,
                minHeight: 74,
                resize: 'vertical',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </section>

          {/* Topics */}
          <section>
            <div
              className="flex items-center"
              style={{ justifyContent: 'space-between', marginBottom: 10 }}
            >
              <div style={{ ...LABEL, margin: 0 }}>
                {t('settings.structure.topics', { count: focus.topics.length })}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--text-08)',
              }}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onTopicDragEnd}
              >
                <SortableContext
                  items={focus.topics.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {focus.topics.map((topic, idx) => (
                    <TopicRow
                      key={topic.id}
                      topic={topic}
                      index={idx}
                      total={focus.topics.length}
                      expanded={!!expandedTopics[topic.id]}
                      accentColor={focus.color ?? meta.color}
                      draft={topicDraftsDirty[topic.id]}
                      onDraftChange={(v) =>
                        setTopicDraftsDirty((prev) => ({ ...prev, [topic.id]: v }))
                      }
                      onSave={(next) => saveTopicLabel(topic, next)}
                      onRemove={() => removeTopic(topic)}
                      onToggleExpand={() => toggleExpanded(topic.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {focus.topics.length === 0 && !addingTopic && (
                <div
                  style={{
                    padding: '18px 12px',
                    textAlign: 'center',
                    fontSize: 12,
                    color: 'var(--text-30)',
                  }}
                >
                  {t('settings.structure.noTopicsYet')}
                </div>
              )}

              {addingTopic && (
                <div
                  className="flex items-center"
                  style={{
                    gap: 8,
                    padding: '8px 12px',
                    borderTop: focus.topics.length > 0 ? '1px solid var(--text-08)' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-30)',
                      fontVariantNumeric: 'tabular-nums',
                      width: 22,
                      flexShrink: 0,
                    }}
                  >
                    {String(focus.topics.length + 1).padStart(2, '0')}.
                  </span>
                  <input
                    autoFocus
                    value={newTopicDraft}
                    onChange={(e) => setNewTopicDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addTopic();
                      if (e.key === 'Escape') {
                        setNewTopicDraft('');
                        setAddingTopic(false);
                      }
                    }}
                    onBlur={() => {
                      if (!newTopicDraft.trim()) {
                        setNewTopicDraft('');
                        setAddingTopic(false);
                      }
                    }}
                    placeholder={t('settings.structure.newTopicPlaceholder')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      border: '1px solid var(--text-15)',
                      background: 'transparent',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </div>

            {!addingTopic && (
              <button
                type="button"
                onClick={() => setAddingTopic(true)}
                className="flex items-center"
                style={{
                  gap: 6,
                  marginTop: 8,
                  padding: '8px 12px',
                  background: 'transparent',
                  border: '1px dashed var(--text-15)',
                  color: 'var(--text-50)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  width: '100%',
                }}
              >
                <Plus size={12} />
                {t('settings.structure.addTopic')}
              </button>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}

/* ─── Topic row inside the panel ────────────────────────────── */

interface TopicRowProps {
  topic: Topic;
  index: number;
  total: number;
  expanded: boolean;
  accentColor: string;
  draft: string | undefined;
  onDraftChange: (next: string) => void;
  onSave: (next: string) => Promise<void> | void;
  onRemove: () => void;
  onToggleExpand: () => void;
}

function TopicRow({
  topic,
  index,
  total,
  expanded,
  accentColor,
  draft,
  onDraftChange,
  onSave,
  onRemove,
  onToggleExpand,
}: TopicRowProps) {
  const [editing, setEditing] = useState(false);
  const value = draft ?? topic.label;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: topic.id });

  const commit = async () => {
    setEditing(false);
    if (value.trim() && value.trim() !== topic.label) {
      await onSave(value);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        background: isDragging ? 'var(--text-04)' : 'transparent',
        boxShadow: isDragging ? '0 6px 18px var(--shadow-md)' : 'none',
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <div
        className="flex items-center"
        style={{
          gap: 6,
          padding: '8px 12px 8px 4px',
          borderBottom: index < total - 1 ? '1px solid var(--text-08)' : 'none',
        }}
      >
        <button
          type="button"
          aria-label="Arrastar para reordenar"
          title="Arrastar para reordenar"
          {...(attributes as object)}
          {...(listeners as object)}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center"
          style={{
            width: 18,
            height: 20,
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-30)',
            cursor: 'grab',
            touchAction: 'none',
            flexShrink: 0,
            opacity: 0.5,
            transition: 'opacity var(--transition-fast), color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.5';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-30)';
          }}
        >
          <DotsSixVertical size={12} weight="bold" />
        </button>
        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={expanded ? 'Recolher subtópicos' : 'Expandir subtópicos'}
          style={{
            padding: 2,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-30)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {expanded ? <CaretDown size={11} /> : <CaretRight size={11} />}
        </button>
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-30)',
            fontVariantNumeric: 'tabular-nums',
            width: 22,
            flexShrink: 0,
          }}
        >
          {String(index + 1).padStart(2, '0')}.
        </span>

        {editing ? (
          <input
            autoFocus
            value={value}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                onDraftChange(topic.label);
                setEditing(false);
              }
            }}
            onBlur={commit}
            style={{
              flex: 1,
              padding: '4px 8px',
              border: '1px solid var(--text-30)',
              background: 'transparent',
              color: 'var(--text)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              outline: 'none',
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            style={{
              flex: 1,
              padding: '4px 8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              textAlign: 'left',
              cursor: 'text',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {topic.label}
          </button>
        )}

        <IconAction icon={<Trash size={11} />} label="Excluir" onClick={onRemove} danger />
      </div>

      {expanded && <SubtopicList topicId={topic.id} accentColor={accentColor} />}
    </div>
  );
}

function IconAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex items-center justify-center"
      style={{
        width: 22,
        height: 22,
        padding: 0,
        background: 'transparent',
        border: 'none',
        color: danger ? 'var(--accent-coral)' : 'var(--text-30)',
        cursor: 'pointer',
        opacity: 0.7,
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.7')}
    >
      {icon}
    </button>
  );
}

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: 'var(--text-30)',
  marginBottom: 8,
};

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--text-15)',
  background: 'transparent',
  color: 'var(--text)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
};
