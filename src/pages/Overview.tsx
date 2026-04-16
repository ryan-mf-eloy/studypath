import { useEffect } from 'react';
import { getActiveMonth } from '../lib/utils';
import { useUIStore } from '../store/useUIStore';
import { useRoadmap } from '../store/useRoadmapStore';
import TopBar from '../components/layout/TopBar';
import HeroBlock from '../components/overview/HeroBlock';
import DailyPlanCard from '../components/overview/DailyPlanCard';
import SubjectsOfMonth from '../components/overview/SubjectsOfMonth';
import MomentumStrip from '../components/overview/MomentumStrip';
import NextMilestoneCard from '../components/overview/NextMilestoneCard';
import RecentNotes from '../components/overview/RecentNotes';

export default function Overview() {
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

      <main
        className="sp-overview-grid sp-stagger"
        style={{
          flex: 1,
          minHeight: 0,
          maxWidth: 1280,
          width: '100%',
          margin: '0 auto',
          padding: '18px var(--page-pad-x) 16px',
          overflowY: 'auto',
          gridAutoRows: 'max-content',
        }}
      >
        {/* Header row — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <HeroBlock />
        </div>

        {/* Left column — only DailyPlan */}
        <div>
          <DailyPlanCard />
        </div>

        {/* Right column — Milestone + Notes */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          <NextMilestoneCard />
          <RecentNotes />
        </div>

        {/* Subjects strip — full width, compact horizontal */}
        <div style={{ gridColumn: '1 / -1' }}>
          <SubjectsOfMonth />
        </div>

        {/* Momentum row — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <MomentumStrip />
        </div>
      </main>
    </div>
  );
}
