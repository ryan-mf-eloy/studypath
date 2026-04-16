import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/useUIStore';
import type { ViewScale } from '../../types';

const SCALES: { value: ViewScale; key: string }[] = [
  { value: 'day',   key: 'scale.day' },
  { value: 'week',  key: 'scale.week' },
  { value: 'month', key: 'scale.month' },
  { value: 'year',  key: 'scale.year' },
];

export default function ScaleSelector() {
  const { t } = useTranslation();
  const activeView = useUIStore(s => s.activeView);
  const setActiveView = useUIStore(s => s.setActiveView);

  return (
    <div className="flex items-center">
      <div className="flex">
        {SCALES.map((scale, i) => {
          const isActive = activeView === scale.value;
          const isLast = i === SCALES.length - 1;

          return (
            <button
              key={scale.value}
              onClick={() => setActiveView(scale.value)}
              style={{
                padding: '10px 24px',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
                border: '1px solid',
                borderColor: isActive ? 'var(--text)' : 'var(--text-15)',
                borderRight: isLast
                  ? `1px solid ${isActive ? 'var(--text)' : 'var(--text-15)'}`
                  : 'none',
                borderRadius: 0,
                backgroundColor: isActive ? 'var(--text)' : 'transparent',
                color: isActive ? 'var(--bg)' : 'var(--text-30)',
                cursor: 'pointer',
                transition: 'background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-08)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }
              }}
            >
              {t(scale.key)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
