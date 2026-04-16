import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useUIStore } from '../../store/useUIStore';

const CYCLE_MS = 2600;

/**
 * SearchBar — pill trigger que abre o CommandPalette.
 * Toda a lógica de busca vive no CommandPalette (montado globalmente).
 */
export default function SearchBar() {
  const { t } = useTranslation();
  const openSearch = useUIStore(s => s.openSearch);
  const [hintIndex, setHintIndex] = useState(0);
  const [isHover, setIsHover] = useState(false);

  const HINTS = useMemo(
    () => [
      t('search.groups.topics').toLowerCase(),
      t('search.groups.notes').toLowerCase(),
      t('search.groups.focuses').toLowerCase(),
      t('search.groups.milestones').toLowerCase(),
    ],
    [t],
  );

  useEffect(() => {
    const id = setInterval(() => {
      setHintIndex(i => (i + 1) % HINTS.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [HINTS.length]);

  const borderColor = isHover ? 'var(--accent-coral)' : 'var(--text-15)';
  const iconColor = isHover ? 'var(--accent-coral)' : 'var(--text-50)';

  return (
    <button
      type="button"
      onClick={openSearch}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      className="flex items-center"
      style={{
        width: 360,
        height: 42,
        border: `1px solid ${borderColor}`,
        borderRadius: 0,
        background: 'var(--bg-surface)',
        padding: '0 14px',
        gap: 12,
        cursor: 'text',
        fontFamily: 'var(--font-sans)',
        boxShadow: isHover
          ? '0 2px 12px rgba(232, 79, 60, 0.08)'
          : '0 1px 0 rgba(10, 10, 10, 0.02)',
        transition:
          'border-color 180ms ease, box-shadow 220ms ease, background-color 180ms ease',
      }}
      aria-label={t('search.openSearch')}
    >
      <MagnifyingGlass
        size={17}
        weight={isHover ? 'bold' : 'regular'}
        style={{
          color: iconColor,
          flexShrink: 0,
          transition: 'color 180ms ease',
        }}
      />
      <span
        className="flex items-baseline"
        style={{
          flex: 1,
          fontSize: 14,
          color: 'var(--text-50)',
          textAlign: 'left',
          gap: 4,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}
      >
        <span>{t('common.search')}</span>
        <span
          key={hintIndex}
          className="sp-search-hint"
          style={{
            display: 'inline-block',
            color: 'var(--text)',
            fontWeight: 500,
          }}
        >
          {HINTS[hintIndex]}
        </span>
        <span style={{ color: 'var(--text-30)' }}>...</span>
      </span>
      <span
        className="flex items-center"
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-sans)',
          fontWeight: 500,
          color: 'var(--text-50)',
          padding: '3px 7px',
          backgroundColor: 'var(--text-08)',
          borderRadius: 3,
          lineHeight: 1.2,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          gap: 1,
          letterSpacing: '0.3px',
        }}
      >
        ⌘K
      </span>
    </button>
  );
}
