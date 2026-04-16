import type { Theme } from '@blocknote/mantine';

/**
 * Tema customizado do BlockNote para o StudyPath.
 * Dois temas: light e dark. O NoteEditor escolhe baseado no theme store.
 * Os overrides de CSS em blocknote-theme.css complementam estes objetos.
 */
export const studyPathLightTheme: Theme = {
  colors: {
    editor: {
      text: 'var(--text)',
      background: 'var(--bg-surface)',
    },
    menu: {
      text: 'var(--text)',
      background: 'var(--bg-surface)',
    },
    tooltip: {
      text: 'var(--bg-surface)',
      background: 'var(--text)',
    },
    hovered: {
      text: 'var(--text)',
      background: 'var(--text-08)',
    },
    selected: {
      text: '#FFFFFF',
      background: 'var(--accent-coral)',
    },
    disabled: {
      text: 'var(--text-30)',
      background: 'var(--text-08)',
    },
    shadow: 'transparent',
    border: 'var(--text-15)',
    sideMenu: 'var(--text-30)',
    highlights: {
      gray:   { text: 'var(--text-50)',       background: 'var(--text-08)' },
      brown:  { text: '#8B6914',              background: '#FDF5E6' },
      red:    { text: 'var(--accent-coral)',  background: '#FDF0EE' },
      orange: { text: '#E07C24',              background: '#FEF3E2' },
      yellow: { text: '#B8860B',              background: '#FFF8DC' },
      green:  { text: 'var(--accent-green)',  background: '#EDF7F2' },
      blue:   { text: 'var(--accent-blue)',   background: '#EEF4FB' },
      purple: { text: 'var(--accent-lilac)',  background: '#F5EDFF' },
      pink:   { text: '#D63384',              background: '#FDE7F0' },
    },
  },
  borderRadius: 0,
  fontFamily: 'var(--font-sans)',
};

export const studyPathDarkTheme: Theme = {
  colors: {
    editor: {
      text: 'var(--text)',
      background: 'var(--bg-surface)',
    },
    menu: {
      text: 'var(--text)',
      background: 'var(--bg-surface)',
    },
    tooltip: {
      text: 'var(--bg)',
      background: 'var(--text)',
    },
    hovered: {
      text: 'var(--text)',
      background: 'var(--text-08)',
    },
    selected: {
      text: '#FFFFFF',
      background: 'var(--accent-coral)',
    },
    disabled: {
      text: 'var(--text-30)',
      background: 'var(--text-08)',
    },
    shadow: 'transparent',
    border: 'var(--text-15)',
    sideMenu: 'var(--text-30)',
    highlights: {
      gray:   { text: 'var(--text-50)',       background: 'rgba(242, 238, 227, 0.08)' },
      brown:  { text: '#D4A868',              background: 'rgba(212, 168, 104, 0.14)' },
      red:    { text: 'var(--accent-coral)',  background: 'rgba(242, 107, 88, 0.16)' },
      orange: { text: '#F5A24C',              background: 'rgba(245, 162, 76, 0.14)' },
      yellow: { text: '#E8C860',              background: 'rgba(232, 200, 96, 0.14)' },
      green:  { text: 'var(--accent-green)',  background: 'rgba(93, 179, 130, 0.16)' },
      blue:   { text: 'var(--accent-blue)',   background: 'rgba(91, 148, 212, 0.16)' },
      purple: { text: 'var(--accent-lilac)',  background: 'rgba(192, 132, 252, 0.16)' },
      pink:   { text: '#F08BB0',              background: 'rgba(240, 139, 176, 0.14)' },
    },
  },
  borderRadius: 0,
  fontFamily: 'var(--font-sans)',
};

/** Backwards-compat export — defaults to light. Consumers should pick
 *  the correct theme based on useThemeStore. */
export const studyPathTheme = studyPathLightTheme;
