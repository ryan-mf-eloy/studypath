import { Sun, Moon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/useThemeStore';

/**
 * Botão de alternância de tema — ícones sem borda, matching o visual dos
 * outros ícones do TopBar, com uma animação elegante de rotação + fade
 * cruzado na troca (sol ↔ lua) e um pop tátil no toque.
 */
export default function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';
  const label = isDark ? t('topbar.toggleThemeToLight') : t('topbar.toggleThemeToDark');

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex items-center justify-center sp-theme-toggle"
      style={{
        width: 32,
        height: 32,
        background: 'none',
        border: 'none',
        color: 'var(--text-50)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        padding: 0,
        transition: 'color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
      }}
    >
      {/* Sol — visível no tema claro */}
      <span
        aria-hidden
        className="flex items-center justify-center"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isDark ? 0 : 1,
          transform: isDark
            ? 'rotate(-90deg) scale(0.4)'
            : 'rotate(0deg) scale(1)',
          transition:
            'opacity 360ms cubic-bezier(0.22, 1, 0.36, 1), transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform, opacity',
        }}
      >
        <Sun size={17} weight="regular" />
      </span>

      {/* Lua — visível no tema escuro */}
      <span
        aria-hidden
        className="flex items-center justify-center"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isDark ? 1 : 0,
          transform: isDark
            ? 'rotate(0deg) scale(1)'
            : 'rotate(90deg) scale(0.4)',
          transition:
            'opacity 360ms cubic-bezier(0.22, 1, 0.36, 1), transform 480ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          willChange: 'transform, opacity',
        }}
      >
        <Moon size={17} weight="regular" />
      </span>
    </button>
  );
}
