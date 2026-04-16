import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProgressStore } from '../../store/useProgressStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import SearchBar from '../ui/SearchBar';
import PageNav from './PageNav';
import ThemeToggle from './ThemeToggle';
import StreakBadge from './StreakBadge';
import AppMenuButton from './AppMenuButton';
import AIChatLauncher from './AIChatLauncher';

export default function TopBar() {
  const { t } = useTranslation();
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const roadmap = useRoadmap();

  const allTopics = useMemo(
    () => roadmap.phases.flatMap(p => p.months).flatMap(m => m.focuses).flatMap(f => f.topics),
    [roadmap],
  );

  const totalTopics = allTopics.length;
  const done = allTopics.filter(t => checkedTopics.includes(t.id)).length;
  const pct = totalTopics ? Math.round((done / totalTopics) * 100) : 0;

  return (
    <header
      className="flex items-center justify-between"
      style={{
        padding: 'var(--page-pad-top) var(--page-pad-x)',
        height: 'var(--topbar-height)',
      }}
    >
      {/* Logo + nav */}
      <div className="flex items-center">
        <div className="flex items-baseline gap-0">
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              color: 'var(--text)',
              lineHeight: 1,
            }}
          >
            study
          </span>
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              color: 'var(--text-30)',
              lineHeight: 1,
            }}
          >
            path
          </span>
        </div>
        <PageNav />
      </div>

      {/* Center: search */}
      <SearchBar />

      {/* Right side: AI + app menu + theme toggle + streak + progress */}
      <div className="flex items-center gap-6">
        <AIChatLauncher />
        <AppMenuButton />
        <ThemeToggle />
        <StreakBadge />

        {/* Global progress */}
        <div className="flex items-center gap-3">
          <span
            style={{
              fontSize: 13,
              color: 'var(--text-50)',
              whiteSpace: 'nowrap',
            }}
          >
            {done} {t('common.of')} {totalTopics}
          </span>

          {/* Progress bar */}
          <div
            style={{
              width: 120,
              height: 3,
              backgroundColor: 'var(--text-08)',
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                backgroundColor: 'var(--text)',
                transition: 'width var(--transition-base)',
              }}
            />
          </div>

          <span
            style={{
              fontSize: 13,
              color: 'var(--text-50)',
              fontWeight: 500,
            }}
          >
            {pct}%
          </span>
        </div>
      </div>
    </header>
  );
}
