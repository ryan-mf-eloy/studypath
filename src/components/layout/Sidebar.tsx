import { NavLink } from 'react-router-dom';
import {
  House,
  MapTrifold,
  BookOpenText,
  NotePencil,
  Trophy,
} from '@phosphor-icons/react';

const NAV_ITEMS = [
  { to: '/',           icon: House,          label: 'Início' },
  { to: '/roadmap',    icon: MapTrifold,      label: 'Roadmap' },
  { to: '/materias',   icon: BookOpenText,    label: 'Matérias' },
  { to: '/notas',      icon: NotePencil,      label: 'Notas' },
  { to: '/milestones', icon: Trophy,          label: 'Marcos' },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 'var(--sidebar-width)',
        height: '100vh',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: 'var(--space-5) var(--space-5)',
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: '1.125rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          study<span style={{ color: 'var(--focus-main)' }}>path</span>
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: 'var(--space-3) var(--space-3)' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: '10px var(--space-3)',
                  borderRadius: 'var(--radius-tag)',
                  textDecoration: 'none',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  color: isActive ? 'var(--focus-main)' : 'var(--text-muted)',
                  background: isActive ? 'var(--focus-main-bg)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--focus-main)' : '3px solid transparent',
                  transition: 'all var(--transition-fast)',
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} weight={isActive ? 'bold' : 'regular'} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User row */}
      <div
        style={{
          padding: 'var(--space-4) var(--space-5)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-full)',
            background: 'var(--focus-main)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: '0.75rem',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          RE
        </div>
        <div>
          <p
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.8125rem',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            Ryan Eloy
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              lineHeight: 1.2,
            }}
          >
            Apr 2026 – Jun 2027
          </p>
        </div>
      </div>
    </aside>
  );
}
