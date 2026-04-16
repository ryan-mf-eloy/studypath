import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NoteFont = 'system' | 'sans' | 'serif' | 'mono';
export type NoteWidth = 'narrow' | 'normal' | 'wide';
export type NoteFontSize = 'small' | 'normal' | 'large';
export type NoteLineHeight = 'compact' | 'normal' | 'relaxed';
export type TitleFont = 'serif' | 'sans' | 'mono';

interface NotePrefsStore {
  font: NoteFont;
  width: NoteWidth;
  fontSize: NoteFontSize;
  lineHeight: NoteLineHeight;
  titleFont: TitleFont;

  setFont: (f: NoteFont) => void;
  setWidth: (w: NoteWidth) => void;
  setFontSize: (s: NoteFontSize) => void;
  setLineHeight: (l: NoteLineHeight) => void;
  setTitleFont: (t: TitleFont) => void;
}

export const useNotePrefsStore = create<NotePrefsStore>()(
  persist(
    (set) => ({
      font: 'sans',
      width: 'normal',
      fontSize: 'normal',
      lineHeight: 'normal',
      titleFont: 'serif',
      setFont: (font) => set({ font }),
      setWidth: (width) => set({ width }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setTitleFont: (titleFont) => set({ titleFont }),
    }),
    { name: 'studypath-note-prefs' },
  ),
);

export const WIDTH_PX: Record<NoteWidth, number> = {
  narrow: 560,
  normal: 680,
  wide: 860,
};

export const FONT_SIZE_PX: Record<NoteFontSize, string> = {
  small: '13px',
  normal: '15px',
  large: '17px',
};

export const LINE_HEIGHT_VALUE: Record<NoteLineHeight, string> = {
  compact: '1.5',
  normal: '1.7',
  relaxed: '1.9',
};

const SYSTEM_FONT =
  `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;
const MONO_FONT =
  `'JetBrains Mono', 'SF Mono', 'Fira Code', ui-monospace, monospace`;

export function fontFamilyFor(f: NoteFont | TitleFont): string {
  if (f === 'system') return SYSTEM_FONT;
  if (f === 'serif') return 'var(--font-serif)';
  if (f === 'mono') return MONO_FONT;
  return 'var(--font-sans)';
}
