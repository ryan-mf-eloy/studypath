import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@mantine/core/styles.layer.css'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import './styles/globals.css'
import './i18n'
import App from './App.tsx'

// Apply theme before React mounts to avoid FOUC (light → dark flash).
// Reads persisted theme from localStorage; falls back to system preference.
(() => {
  try {
    const stored = localStorage.getItem('studypath-theme');
    let theme: 'light' | 'dark';
    if (stored) {
      const parsed = JSON.parse(stored);
      theme = parsed?.state?.theme === 'dark' ? 'dark' : 'light';
    } else {
      theme = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
