import { useTranslation } from 'react-i18next';
import { useUIStore, type ActivePage } from '../../store/useUIStore';

interface NavItem {
  page: ActivePage;
  labelKey: string;
}

const ITEMS: NavItem[] = [
  { page: 'overview', labelKey: 'nav.home' },
  { page: 'study',    labelKey: 'nav.studies' },
  { page: 'routine',  labelKey: 'nav.routine' },
];

export default function PageNav() {
  const { t } = useTranslation();
  const activePage = useUIStore(s => s.activePage);
  const setActivePage = useUIStore(s => s.setActivePage);

  return (
    <nav
      aria-label={t('nav.home') + ' / ' + t('nav.studies')}
      className="flex items-center"
      style={{ gap: 4, marginLeft: 28 }}
    >
      {ITEMS.map(item => {
        const isActive = item.page === activePage;
        return (
          <button
            key={item.page}
            type="button"
            onClick={() => setActivePage(item.page)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              position: 'relative',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--text)' : 'var(--text-50)',
              letterSpacing: '0.2px',
              transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
              }
            }}
          >
            {t(item.labelKey)}
            {isActive && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 12,
                  right: 12,
                  bottom: 2,
                  height: 2,
                  backgroundColor: 'var(--accent-coral)',
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
