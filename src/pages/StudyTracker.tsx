import { useEffect } from 'react';
import { getActiveMonth } from '../lib/utils';
import { useUIStore } from '../store/useUIStore';
import { useRoadmap } from '../store/useRoadmapStore';
import TopBar from '../components/layout/TopBar';
import ScaleSelector from '../components/layout/ScaleSelector';
import MonthNav from '../components/layout/MonthNav';
import DayView from '../components/views/DayView';
import WeekView from '../components/views/WeekView';
import MonthView from '../components/views/MonthView';
import YearView from '../components/views/YearView';

export default function StudyTracker() {
  const activeView = useUIStore(s => s.activeView);
  const activeMonthId = useUIStore(s => s.activeMonthId);
  const setActiveMonth = useUIStore(s => s.setActiveMonth);
  const roadmap = useRoadmap();

  useEffect(() => {
    if (!activeMonthId && roadmap.phases.length > 0) {
      setActiveMonth(getActiveMonth(roadmap).id);
    }
  }, [activeMonthId, setActiveMonth, roadmap]);

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

      {/* Nav bar: month nav left, scale selector right */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '12px var(--page-pad-x) 20px' }}
      >
        {activeView !== 'year' ? <MonthNav /> : <div />}
        <ScaleSelector />
      </div>

      {/* View area — takes remaining space, scrolls if content overflows. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 var(--page-pad-x) 32px',
        }}
      >
        <div
          key={activeView}
          className="sp-view-enter flex flex-col"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {activeView === 'day' && <DayView />}
          {activeView === 'week' && <WeekView />}
          {activeView === 'month' && <MonthView />}
          {activeView === 'year' && <YearView />}
        </div>
      </div>
    </div>
  );
}
