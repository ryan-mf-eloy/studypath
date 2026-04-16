import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretDown,
  CaretRight,
  Plus,
  Trash,
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
import { useRoadmap } from '../../store/useRoadmapStore';
import { refreshRoadmap } from '../../lib/serverSync';
import { nanoid } from '../../lib/utils';
import type { Phase, Month, Focus } from '../../types';
import * as api from '../../lib/api';
import { confirm } from '../../store/useConfirmStore';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import FocusDetailPanel from './FocusDetailPanel';
import AddPeriodDialog from './AddPeriodDialog';

/* ─── Drag handle ─────────────────────────────────────────────── */

interface DragHandleProps {
  listeners?: Record<string, (e: React.SyntheticEvent) => void>;
  attributes?: Record<string, unknown>;
}

function DragHandle({ listeners, attributes }: DragHandleProps) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-label={t('settings.structure.dragToReorder')}
      title={t('settings.structure.dragToReorder')}
      {...(attributes as object)}
      {...(listeners as object)}
      onClick={(e) => e.stopPropagation()}
      className="flex items-center justify-center sp-drag-handle"
      style={{
        width: 20,
        height: 22,
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
      <DotsSixVertical size={14} weight="bold" />
    </button>
  );
}

/* ─── Reorder helper — persist new positions ────────────────────── */

async function persistReorder<T extends { id: string }>(
  items: T[],
  update: (id: string, position: number) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    await update(items[i].id, i);
  }
}

/* ─── Inline text edit shared helper ──────────────────────────── */

interface InlineEditProps {
  value: string;
  onSave: (next: string) => Promise<void> | void;
  placeholder?: string;
  fontSize?: number;
  fontWeight?: number;
  fontFamily?: string;
}

function InlineEdit({
  value,
  onSave,
  placeholder,
  fontSize = 14,
  fontWeight = 500,
  fontFamily = 'var(--font-sans)',
}: InlineEditProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '4px 8px',
          border: '1px solid var(--text-30)',
          background: 'var(--bg-surface)',
          color: 'var(--text)',
          fontFamily,
          fontSize,
          fontWeight,
          outline: 'none',
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '4px 8px',
        background: 'transparent',
        border: '1px solid transparent',
        color: 'var(--text)',
        fontFamily,
        fontSize,
        fontWeight,
        textAlign: 'left',
        cursor: 'text',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      title={t('settings.structure.editClickHint')}
    >
      {value || <span style={{ color: 'var(--text-30)' }}>{placeholder ?? ''}</span>}
    </button>
  );
}

/* ─── Row-level icon action ───────────────────────────────────── */

function IconAction({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      aria-label={label}
      title={label}
      className="flex items-center justify-center"
      style={{
        width: 24,
        height: 24,
        padding: 0,
        background: 'transparent',
        border: 'none',
        color: danger ? 'var(--accent-coral)' : 'var(--text-50)',
        cursor: 'pointer',
        flexShrink: 0,
        opacity: 0.7,
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.7')}
    >
      {icon}
    </button>
  );
}

/* ─── Focus card (compact version inside the tree) ──────────────── */

interface FocusCardRowProps {
  focus: Focus;
  onOpen: (focus: Focus) => void;
}

function FocusCardRow({ focus, onOpen }: FocusCardRowProps) {
  const { t } = useTranslation();
  const meta = resolveFocusMeta(focus);
  const Icon = meta.Icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: focus.id });

  const remove = async () => {
    const ok = await confirm({
      title: t('settings.structure.deleteSubject'),
      message: t('settings.structure.deleteSubjectConfirm', { name: focus.name, topics: focus.topics.length }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await api.deleteFocus(focus.id);
    await refreshRoadmap();
  };

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(focus)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(focus);
        }
      }}
      className="flex items-center"
      style={{
        gap: 8,
        padding: '10px 14px 10px 4px',
        marginLeft: 26,
        marginBottom: 4,
        marginRight: 8,
        background: isDragging ? 'var(--text-04)' : 'transparent',
        border: '1px solid var(--text-08)',
        cursor: 'pointer',
        textAlign: 'left',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        boxShadow: isDragging ? '0 8px 24px var(--shadow-md)' : 'none',
        zIndex: isDragging ? 10 : undefined,
      }}
      onMouseEnter={(e) => {
        if (isDragging) return;
        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--text-04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--text-15)';
      }}
      onMouseLeave={(e) => {
        if (isDragging) return;
        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--text-08)';
      }}
    >
      <DragHandle listeners={listeners as never} attributes={attributes as never} />

      <span
        className="flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          color: meta.color,
          flexShrink: 0,
        }}
      >
        <Icon size={20} weight="regular" />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {focus.name}
        </div>
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-30)',
            marginTop: 2,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            fontWeight: 500,
          }}
        >
          {t('settings.structure.topicCount', {
            type:
              focus.type === 'main'
                ? t('focusType.main')
                : focus.type === 'secondary'
                ? t('focusType.secondary')
                : focus.type === 'continuous'
                ? t('focusType.continuous')
                : focus.type,
            count: focus.topics.length,
          })}
        </div>
      </div>

      <IconAction icon={<Trash size={12} />} label={t('common.delete')} onClick={remove} danger />
    </div>
  );
}

/* ─── Month node ────────────────────────────────────────────────── */

interface MonthNodeProps {
  month: Month;
  onOpenFocus: (focus: Focus) => void;
}

function MonthNode({ month, onOpenFocus }: MonthNodeProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: month.id });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const rename = async (label: string) => {
    await api.updateMonth(month.id, { label });
    await refreshRoadmap();
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('settings.structure.deletePeriod'),
      message: t('settings.structure.deletePeriodConfirm', { label: month.label, focuses: month.focuses.length }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await api.deleteMonth(month.id);
    await refreshRoadmap();
  };

  const addFocus = async () => {
    await api.createFocus({
      id: nanoid('focus'),
      monthId: month.id,
      type: 'main',
      name: t('settings.structure.newSubject'),
      masteryNote: '',
    });
    await refreshRoadmap();
  };

  const onFocusDragEnd = async (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = month.focuses.findIndex((f) => f.id === active.id);
    const newIdx = month.focuses.findIndex((f) => f.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(month.focuses, oldIdx, newIdx);
    await persistReorder(reordered, (id, position) => api.updateFocus(id, { position }));
    await refreshRoadmap();
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        marginBottom: 6,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <div
        className="flex items-center"
        style={{
          gap: 6,
          padding: '6px 10px 6px 4px',
          marginLeft: 8,
          cursor: 'pointer',
          background: isDragging ? 'var(--text-04)' : 'transparent',
          transition: 'background-color var(--transition-fast)',
        }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => {
          if (isDragging) return;
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--text-04)';
        }}
        onMouseLeave={(e) => {
          if (isDragging) return;
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
        }}
      >
        <DragHandle listeners={listeners as never} attributes={attributes as never} />
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-50)',
            flexShrink: 0,
          }}
        >
          {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </span>
        <InlineEdit value={month.label} onSave={rename} fontSize={13} fontWeight={500} />
        <IconAction icon={<Trash size={12} />} label={t('common.delete')} onClick={remove} danger />
      </div>

      {expanded && (
        <div style={{ paddingTop: 4, paddingBottom: 6 }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onFocusDragEnd}
          >
            <SortableContext
              items={month.focuses.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {month.focuses.map((f) => (
                <FocusCardRow key={f.id} focus={f} onOpen={onOpenFocus} />
              ))}
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={addFocus}
            className="flex items-center"
            style={{
              marginLeft: 34,
              marginRight: 8,
              gap: 6,
              padding: '8px 12px',
              background: 'transparent',
              border: '1px dashed var(--text-15)',
              color: 'var(--text-50)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              width: 'calc(100% - 42px)',
            }}
          >
            <Plus size={12} />
            {t('settings.structure.addSubject')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Phase node ────────────────────────────────────────────────── */

interface PhaseNodeProps {
  phase: Phase;
  onOpenFocus: (focus: Focus) => void;
  onAddMonth: (phase: Phase) => void;
}

function PhaseNode({ phase, onOpenFocus, onAddMonth }: PhaseNodeProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: phase.id });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const rename = async (label: string) => {
    await api.updatePhase(phase.id, { label });
    await refreshRoadmap();
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('settings.structure.deletePhase'),
      message: t('settings.structure.deletePhaseConfirm', { label: phase.label, periods: phase.months.length }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await api.deletePhase(phase.id);
    await refreshRoadmap();
  };

  const onMonthDragEnd = async (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = phase.months.findIndex((m) => m.id === active.id);
    const newIdx = phase.months.findIndex((m) => m.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(phase.months, oldIdx, newIdx);
    await persistReorder(reordered, (id, position) => api.updateMonth(id, { position }));
    await refreshRoadmap();
  };

  return (
    <section
      ref={setNodeRef}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--text-08)',
        marginBottom: 14,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.75 : 1,
        boxShadow: isDragging ? '0 14px 36px var(--shadow-md)' : 'none',
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <div
        className="flex items-center"
        style={{
          gap: 8,
          padding: '14px 16px 14px 6px',
          borderBottom: expanded ? '1px solid var(--text-08)' : 'none',
          cursor: 'pointer',
          transition: 'background-color var(--transition-fast)',
        }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--text-04)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
        }}
      >
        <DragHandle listeners={listeners as never} attributes={attributes as never} />
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            color: 'var(--text-50)',
            flexShrink: 0,
          }}
        >
          {expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
        </span>
        <InlineEdit
          value={phase.label}
          onSave={rename}
          fontSize={16}
          fontWeight={500}
          fontFamily="var(--font-serif)"
        />
        <IconAction icon={<Trash size={13} />} label={t('common.delete')} onClick={remove} danger />
      </div>

      {expanded && (
        <div style={{ padding: '10px 4px 12px' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onMonthDragEnd}
          >
            <SortableContext
              items={phase.months.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              {phase.months.map((m) => (
                <MonthNode key={m.id} month={m} onOpenFocus={onOpenFocus} />
              ))}
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={() => onAddMonth(phase)}
            className="flex items-center"
            style={{
              marginLeft: 18,
              marginTop: 4,
              gap: 6,
              padding: '8px 12px',
              background: 'transparent',
              border: '1px dashed var(--text-15)',
              color: 'var(--text-50)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              width: 'calc(100% - 26px)',
            }}
          >
            <Plus size={12} />
            {t('settings.structure.addPeriod')}
          </button>
        </div>
      )}
    </section>
  );
}

/* ─── Top-level editor ─────────────────────────────────────────── */

export default function StructureEditor() {
  const { t } = useTranslation();
  const roadmap = useRoadmap();
  const [detailFocusId, setDetailFocusId] = useState<string | null>(null);
  const [addMonthPhase, setAddMonthPhase] = useState<Phase | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Resolve the focus object by id so the panel always sees the fresh version.
  const detailFocus = detailFocusId
    ? roadmap.phases
        .flatMap((p) => p.months)
        .flatMap((m) => m.focuses)
        .find((f) => f.id === detailFocusId) ?? null
    : null;

  const addPhase = async () => {
    const label = t('settings.structure.newPhase');
    await api.createPhase({ id: nanoid('phase'), label });
    await refreshRoadmap();
  };

  const onPhaseDragEnd = async (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIdx = roadmap.phases.findIndex((p) => p.id === active.id);
    const newIdx = roadmap.phases.findIndex((p) => p.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(roadmap.phases, oldIdx, newIdx);
    await persistReorder(reordered, (id, position) => api.updatePhase(id, { position }));
    await refreshRoadmap();
  };

  return (
    <div>
      <p
        style={{
          fontSize: 12.5,
          color: 'var(--text-50)',
          lineHeight: 1.55,
          margin: '0 0 20px',
        }}
      >
        {t('settings.structure.description')}
      </p>

      {roadmap.phases.length === 0 && (
        <div
          style={{
            padding: 24,
            border: '1px dashed var(--text-15)',
            fontSize: 13,
            color: 'var(--text-50)',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          <span dangerouslySetInnerHTML={{ __html: t('settings.structure.emptyPhases') }} />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onPhaseDragEnd}
      >
        <SortableContext
          items={roadmap.phases.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {roadmap.phases.map((p) => (
            <PhaseNode
              key={p.id}
              phase={p}
              onOpenFocus={(f) => setDetailFocusId(f.id)}
              onAddMonth={(phase) => setAddMonthPhase(phase)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addPhase}
        className="flex items-center"
        style={{
          marginTop: 4,
          gap: 6,
          padding: '10px 16px',
          background: 'transparent',
          border: '1px dashed var(--text-15)',
          color: 'var(--text-50)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          width: '100%',
        }}
      >
        <Plus size={13} />
        {t('settings.structure.addPhase')}
      </button>

      {detailFocus && (
        <FocusDetailPanel
          focus={detailFocus}
          onClose={() => setDetailFocusId(null)}
        />
      )}

      {addMonthPhase && (
        <AddPeriodDialog
          phase={addMonthPhase}
          onAdd={async (entry) => {
            await api.createMonth({
              id: entry.id,
              phaseId: addMonthPhase.id,
              label: entry.label,
            });
            await refreshRoadmap();
          }}
          onClose={() => setAddMonthPhase(null)}
        />
      )}
    </div>
  );
}
