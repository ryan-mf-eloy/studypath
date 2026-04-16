import { useEffect } from 'react';
import { useUIStore } from './store/useUIStore';
import { useThemeStore } from './store/useThemeStore';
import StudyTracker from './pages/StudyTracker';
import Overview from './pages/Overview';
import RoutinePage from './pages/RoutinePage';
import Settings from './pages/Settings';
import NotePanel from './components/panels/NotePanel';
import CommandPalette from './components/ui/CommandPalette';
import ConfirmDialog from './components/ui/ConfirmDialog';
import StudyTimerPill from './components/ui/StudyTimerPill';
import AIChatPanel from './components/panels/AIChatPanel';
import ShortcutsDialog from './components/ui/ShortcutsDialog';
import OnboardingDialog from './components/ui/OnboardingDialog';
import { ReviewModal, ReflectionModal } from './components/ui/GlobalModals';
import HydrationGate from './components/ui/HydrationGate';

export default function App() {
  const activePage = useUIStore(s => s.activePage);
  const theme = useThemeStore(s => s.theme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <HydrationGate>
      <div key={activePage} className="sp-page-enter" style={{ height: '100vh' }}>
        {activePage === 'overview' && <Overview />}
        {activePage === 'study' && <StudyTracker />}
        {activePage === 'routine' && <RoutinePage />}
        {activePage === 'settings' && <Settings />}
      </div>
      <NotePanel />
      <CommandPalette />
      <ConfirmDialog />
      <StudyTimerPill />
      <AIChatPanel />
      <ShortcutsDialog />
      <OnboardingDialog />
      <ReviewModal />
      <ReflectionModal />
    </HydrationGate>
  );
}
