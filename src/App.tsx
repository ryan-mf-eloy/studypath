import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import Overview from './pages/Overview';
import Roadmap from './pages/Roadmap';
import Materias from './pages/Materias';
import Notas from './pages/Notas';
import Milestones from './pages/Milestones';

export default function App() {
  return (
    <BrowserRouter>
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          background: 'var(--bg-primary)',
        }}
      >
        <Sidebar />

        <div
          style={{
            flex: 1,
            marginLeft: 'var(--sidebar-width)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
          }}
        >
          <TopBar />

          <main
            style={{
              flex: 1,
              padding: 'var(--space-6)',
              paddingTop: 'calc(var(--topbar-height) + var(--space-6))',
              overflowY: 'auto',
            }}
          >
            <div style={{ maxWidth: 'var(--content-max-w)', margin: '0 auto' }}>
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/roadmap" element={<Roadmap />} />
                <Route path="/materias" element={<Materias />} />
                <Route path="/notas" element={<Notas />} />
                <Route path="/milestones" element={<Milestones />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
