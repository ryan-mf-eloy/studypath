import { useMemo } from 'react';
import { useProgressStore } from '../../store/useProgressStore';

const DAYS = 365;
const CELL_SIZE = 13;
const CELL_GAP = 3;

const MONTH_NAMES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

function formatDayLabel(dayKey: string): string {
  const [, m, d] = dayKey.split('-');
  const fullMonths = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  return `${parseInt(d, 10)} de ${fullMonths[parseInt(m, 10) - 1]}`;
}

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

function colorForLevel(level: 0 | 1 | 2 | 3 | 4): string {
  switch (level) {
    case 0: return 'var(--text-08)';
    case 1: return 'rgba(232, 79, 60, 0.28)';
    case 2: return 'rgba(232, 79, 60, 0.55)';
    case 3: return 'rgba(232, 79, 60, 0.80)';
    case 4: return 'var(--accent-coral)';
  }
}

interface Cell {
  date: string | null;
  count: number;
}

export default function MomentumStrip() {
  const getChecksByDay = useProgressStore(s => s.getChecksByDay);
  const checkedAt = useProgressStore(s => s.checkedAt);

  const { columns, monthLabels, total, daysSinceLast, todayKey } = useMemo(() => {
    void checkedAt;
    const series = getChecksByDay(DAYS);
    const sum = series.reduce((acc, d) => acc + d.count, 0);
    let inverse = 0;
    for (let i = series.length - 1; i >= 0; i--) {
      if (series[i].count === 0) inverse++;
      else break;
    }

    // Parse first day as local noon to avoid TZ edge, get weekday (0=Sun..6=Sat)
    const firstDate = new Date(`${series[0].date}T12:00:00`);
    const firstWeekday = firstDate.getDay();

    const cells: Cell[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ date: null, count: 0 });
    }
    for (const d of series) cells.push(d);
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, count: 0 });
    }

    const cols: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      cols.push(cells.slice(i, i + 7));
    }

    // Month labels: for each column, if the first real date in that column is
    // in a new month AND the previous column was a different month, emit a label.
    // Otherwise empty string.
    const labels: string[] = [];
    let lastMonth = -1;
    for (const col of cols) {
      const firstReal = col.find(c => c.date !== null);
      if (!firstReal) {
        labels.push('');
        continue;
      }
      const month = parseInt(firstReal.date!.split('-')[1], 10) - 1;
      if (month !== lastMonth) {
        labels.push(MONTH_NAMES[month]);
        lastMonth = month;
      } else {
        labels.push('');
      }
    }

    return {
      columns: cols,
      monthLabels: labels,
      total: sum,
      daysSinceLast: inverse,
      todayKey: series[series.length - 1]?.date ?? '',
    };
  }, [getChecksByDay, checkedAt]);

  const streakLabel =
    daysSinceLast === 0 ? 'estudou hoje'
    : daysSinceLast === 1 ? 'ontem foi o último check'
    : `${daysSinceLast} dias sem estudar`;

  const totalLabel =
    total === 0 ? 'nenhum tópico no último ano'
    : total === 1 ? '1 tópico no último ano'
    : `${total} tópicos no último ano`;

  const weekdayLabels = ['', 'seg', '', 'qua', '', 'sex', ''];

  return (
    <section
      aria-label={`Consistência no último ano: ${total} tópicos`}
      style={{ overflowX: 'auto' }}
    >
      <div
        style={{
          width: 'fit-content',
          margin: '0 auto',
        }}
      >
      <div
        className="flex items-baseline"
        style={{
          justifyContent: 'space-between',
          marginBottom: 10,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '1.1px',
            textTransform: 'uppercase',
            color: 'var(--text-30)',
          }}
        >
          Consistência — último ano
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-50)' }}>
          {streakLabel} · {totalLabel}
        </span>
      </div>

      <div
        className="flex"
        style={{
          gap: 8,
          alignItems: 'flex-start',
        }}
      >
        {/* Weekday labels column */}
        <div
          aria-hidden
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: CELL_GAP,
            paddingTop: 14, // align with first row of cells (after month label row)
            flexShrink: 0,
          }}
        >
          {weekdayLabels.map((label, i) => (
            <div
              key={i}
              style={{
                height: CELL_SIZE,
                fontSize: 9,
                lineHeight: `${CELL_SIZE}px`,
                color: 'var(--text-30)',
                textAlign: 'right',
                minWidth: 20,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Main grid — columns = weeks, rows = weekdays */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
          }}
        >
          {/* Month labels row */}
          <div
            aria-hidden
            style={{
              display: 'flex',
              gap: CELL_GAP,
              height: 10,
              fontSize: 9,
              color: 'var(--text-30)',
              letterSpacing: '0.3px',
              position: 'relative',
            }}
          >
            {monthLabels.map((label, ci) => (
              <div
                key={ci}
                style={{
                  width: CELL_SIZE,
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
              >
                {label && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                    }}
                  >
                    {label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Cells — ALL cells rendered (including out-of-range padding) */}
          <div
            className="flex"
            style={{ gap: CELL_GAP }}
          >
            {columns.map((col, ci) => (
              <div
                key={ci}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: CELL_GAP,
                }}
              >
                {col.map((cell, ri) => {
                  const level = cell.date === null ? 0 : levelFor(cell.count);
                  const isToday = cell.date !== null && cell.date === todayKey;
                  return (
                    <div
                      key={ri}
                      title={
                        cell.date === null
                          ? undefined
                          : `${formatDayLabel(cell.date)} — ${cell.count} ${cell.count === 1 ? 'tópico' : 'tópicos'}`
                      }
                      style={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        backgroundColor: colorForLevel(level),
                        borderRadius: 2,
                        opacity: cell.date === null ? 0.5 : 1,
                        outline: isToday ? '1px solid var(--accent-coral)' : 'none',
                        outlineOffset: isToday ? 1 : 0,
                        transition: 'background-color var(--transition-fast)',
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Legend — below the grid, right-aligned (GitHub style) */}
      <div
        className="flex items-center"
        style={{
          gap: 4,
          marginTop: 10,
          justifyContent: 'flex-end',
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-30)' }}>menos</span>
        {[0, 1, 2, 3, 4].map(l => (
          <span
            key={l}
            aria-hidden
            style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              backgroundColor: colorForLevel(l as 0 | 1 | 2 | 3 | 4),
            }}
          />
        ))}
        <span style={{ fontSize: 10, color: 'var(--text-30)' }}>mais</span>
      </div>
      </div>
    </section>
  );
}
