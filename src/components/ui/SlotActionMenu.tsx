import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
  Prohibit,
  ArrowsClockwise,
  PencilSimple,
  ArrowUUpLeft,
  Trash,
} from '@phosphor-icons/react';
import { usePopoverPosition } from './usePopoverPosition';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { useRoutineStore } from '../../store/useRoutineStore';
import { confirm } from '../../store/useConfirmStore';
import type { ResolvedSlot } from '../../lib/routineCalendar';

export interface SlotMenuAnchor {
  slotId: string;
  date: string;
  overrideId?: string;
  status: ResolvedSlot['status'];
  anchor: HTMLElement;
}

interface Props {
  anchor: SlotMenuAnchor;
  onClose: () => void;
  onEdit: () => void;
}

export default function SlotActionMenu({ anchor, onClose, onEdit }: Props) {
  const { t } = useTranslation();
  const skipSlot = useRoutineStore(s => s.skipSlot);
  const rescheduleSlot = useRoutineStore(s => s.rescheduleSlot);
  const undoOverride = useRoutineStore(s => s.undoOverride);
  const removeSlot = useRoutineStore(s => s.removeSlot);

  const popoverRef = useRef<HTMLDivElement>(null);
  // Stable ref so usePopoverPosition's effect doesn't re-run every render and
  // trigger an infinite setState loop.
  const anchorRef = useRef<HTMLElement | null>(anchor.anchor);
  anchorRef.current = anchor.anchor;

  const [mode, setMode] = useState<'menu' | 'reschedule'>('menu');
  const [newDate, setNewDate] = useState(anchor.date);
  const [newTime, setNewTime] = useState('09:00');

  const pos = usePopoverPosition({
    open: true,
    anchorRef,
    popoverRef,
    gap: 6,
    align: 'start',
  });

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        (anchor.anchor && target && anchor.anchor.contains(target)) ||
        (popoverRef.current && target && popoverRef.current.contains(target))
      ) {
        return;
      }
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [anchor.anchor, onClose]);

  const canUndo = !!anchor.overrideId;

  const handleSkip = async () => {
    const ok = await confirm({
      title: t('routine.skipConfirmTitle'),
      message: t('routine.skipConfirmBody'),
      confirmLabel: t('routine.skip'),
      cancelLabel: t('common.cancel'),
    });
    if (!ok) return;
    skipSlot(anchor.slotId, anchor.date);
    onClose();
  };

  const handleReschedule = () => {
    if (!newDate || !newTime) return;
    rescheduleSlot(anchor.slotId, anchor.date, newDate, newTime);
    onClose();
  };

  const handleUndo = () => {
    if (!anchor.overrideId) return;
    undoOverride(anchor.overrideId);
    onClose();
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t('routine.deleteSlot'),
      message: t('routine.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    removeSlot(anchor.slotId);
    onClose();
  };

  return createPortal(
    <div
      ref={popoverRef}
      role="menu"
      aria-label={t('routine.slotActions')}
      className="sp-popover-enter sp-glass"
      style={{
        position: 'fixed',
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        visibility: pos ? 'visible' : 'hidden',
        width: mode === 'menu' ? 220 : 260,
        border: '1px solid var(--glass-border)',
        boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
        padding: 6,
        zIndex: 500,
      }}
    >
      {mode === 'menu' && (
        <div className="flex flex-col" style={{ gap: 1 }}>
          {canUndo && (
            <Item
              icon={<ArrowUUpLeft size={13} />}
              label={t('routine.undoOverride')}
              onClick={handleUndo}
            />
          )}
          {anchor.status !== 'skipped' && (
            <Item
              icon={<Prohibit size={13} />}
              label={t('routine.skipThisDay')}
              onClick={handleSkip}
            />
          )}
          {anchor.status !== 'skipped' && (
            <Item
              icon={<ArrowsClockwise size={13} />}
              label={t('routine.reschedule')}
              onClick={() => setMode('reschedule')}
            />
          )}
          <Item
            icon={<PencilSimple size={13} />}
            label={t('routine.editBase')}
            onClick={onEdit}
          />
          <div
            style={{
              height: 1,
              background: 'var(--text-08)',
              margin: '4px 0',
            }}
          />
          <Item
            icon={<Trash size={13} />}
            label={t('routine.deleteFromRoutine')}
            onClick={handleDelete}
            destructive
          />
        </div>
      )}
      {mode === 'reschedule' && (
        <div className="flex flex-col" style={{ gap: 10, padding: 6 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              color: 'var(--text-30)',
            }}
          >
            {t('routine.reschedule')}
          </div>
          <div>
            <div style={SUBLABEL}>{t('routine.newDate')}</div>
            <DatePicker value={newDate} onChange={setNewDate} />
          </div>
          <div>
            <div style={SUBLABEL}>{t('routine.newStartTime')}</div>
            <TimePicker value={newTime} onChange={setNewTime} />
          </div>
          <div className="flex" style={{ gap: 6, marginTop: 4, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setMode('menu')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-50)',
                cursor: 'pointer',
                fontSize: 11,
                padding: '4px 8px',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleReschedule}
              style={{
                background: 'var(--text)',
                border: 'none',
                color: 'var(--bg-surface)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 12px',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

interface ItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}
function Item({ icon, label, onClick, destructive }: ItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className="flex items-center"
      style={{
        gap: 10,
        padding: '8px 10px',
        background: 'transparent',
        border: 'none',
        color: destructive ? 'var(--accent-coral)' : 'var(--text)',
        fontSize: 12,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      <span
        style={{
          color: destructive ? 'var(--accent-coral)' : 'var(--text-50)',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

const SUBLABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.4px',
  textTransform: 'uppercase',
  color: 'var(--text-50)',
  marginBottom: 5,
};
