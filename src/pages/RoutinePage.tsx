import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from '@phosphor-icons/react';
import TopBar from '../components/layout/TopBar';
import RoutineWeekView from '../components/views/RoutineWeekView';
import RoutineMonthView from '../components/views/RoutineMonthView';
import RoutineSlotDetailPanel from '../components/panels/RoutineSlotDetailPanel';
import { useRoutineStore } from '../store/useRoutineStore';
import type { DayOfWeek, RoutineSlot } from '../types';

type Scale = 'week' | 'month';

export default function RoutinePage() {
  const { t } = useTranslation();
  const slots = useRoutineStore(s => s.slots);
  const addSlot = useRoutineStore(s => s.addSlot);

  const [scale, setScale] = useState<Scale>('week');
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  const editingSlot: RoutineSlot | null =
    slots.find(s => s.id === editingSlotId) ?? null;

  const createAndEdit = (dayOfWeek?: number, startTime?: string) => {
    const resolvedDow = (
      dayOfWeek !== undefined ? dayOfWeek : anchorDate.getDay()
    ) as DayOfWeek;
    const slot = addSlot({
      dayOfWeek: resolvedDow,
      startTime: startTime ?? '08:00',
      durationMin: 60,
      active: true,
    });
    setEditingSlotId(slot.id);
  };

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      <TopBar />

      {/* Header row */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '14px var(--page-pad-x) 18px',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 28,
              color: 'var(--text)',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {t('routine.title')}
          </h1>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-50)',
              marginTop: 4,
            }}
          >
            {t('routine.subtitle')}
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 10 }}>
          {/* Scale selector */}
          <div
            className="flex"
            style={{
              background: 'var(--text-04)',
              padding: 3,
              gap: 2,
            }}
          >
            {(['week', 'month'] as const).map(s => {
              const selected = scale === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScale(s)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase',
                    background: selected ? 'var(--bg-surface)' : 'transparent',
                    color: selected ? 'var(--text)' : 'var(--text-50)',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    boxShadow: selected ? '0 1px 4px var(--shadow-sm)' : 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {s === 'week' ? t('routine.scaleWeek') : t('routine.scaleMonth')}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => createAndEdit()}
            className="flex items-center"
            style={{
              gap: 8,
              padding: '8px 14px',
              background: 'var(--text)',
              border: 'none',
              color: 'var(--bg-surface)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.3px',
            }}
          >
            <Plus size={13} weight="bold" />
            {t('routine.addSlot')}
          </button>
        </div>
      </div>

      {/* View area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 var(--page-pad-x) 24px',
        }}
      >
        <div
          key={scale}
          className="sp-view-enter flex flex-col"
          style={{ flex: 1, minHeight: 0 }}
        >
          {slots.length === 0 ? (
            <EmptyState onAdd={() => createAndEdit()} />
          ) : scale === 'week' ? (
            <RoutineWeekView
              anchorDate={anchorDate}
              onChangeAnchor={setAnchorDate}
              onEditSlot={setEditingSlotId}
              onAddSlot={(dow, startTime) => createAndEdit(dow, startTime)}
            />
          ) : (
            <RoutineMonthView
              anchorDate={anchorDate}
              onChangeAnchor={setAnchorDate}
              onEditSlot={setEditingSlotId}
              onAddSlot={(dow) => createAndEdit(dow)}
            />
          )}
        </div>
      </div>

      <RoutineSlotDetailPanel
        slot={editingSlot}
        onClose={() => setEditingSlotId(null)}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        flex: 1,
        gap: 14,
        color: 'var(--text-50)',
        padding: '40px 24px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          color: 'var(--text)',
        }}
      >
        {t('routine.emptyTitle')}
      </div>
      <div
        style={{
          maxWidth: 360,
          textAlign: 'center',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {t('routine.emptyBody')}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="flex items-center"
        style={{
          gap: 8,
          padding: '10px 18px',
          background: 'var(--text)',
          border: 'none',
          color: 'var(--bg-surface)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.3px',
          marginTop: 6,
        }}
      >
        <Plus size={13} weight="bold" />
        {t('routine.addSlot')}
      </button>
    </div>
  );
}
