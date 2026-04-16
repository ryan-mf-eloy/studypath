/**
 * Curated registry of Phosphor icons available in the icon picker.
 * String keys persist in SQLite; UI components resolve back via `resolveIcon`.
 */

import type { Icon } from '@phosphor-icons/react';
import {
  Atom,
  Bell,
  BookOpenText,
  Bookmark,
  Brain,
  Briefcase,
  Calendar,
  Clock,
  Cloud,
  CloudArrowUp,
  CloudCheck,
  Code,
  Compass,
  Cube,
  Database,
  Eye,
  FilePy,
  FileTs,
  Fire,
  FlagCheckered,
  Function,
  Gear,
  Globe,
  Graph,
  Heart,
  Lightbulb,
  Lightning,
  LockKey,
  MagnifyingGlass,
  MapPin,
  Medal,
  Microphone,
  Notebook,
  Palette,
  PencilRuler,
  PuzzlePiece,
  Rocket,
  ShieldCheck,
  Sparkle,
  Star,
  Target,
  Terminal,
  TreeStructure,
  TrendUp,
  Trophy,
  Wrench,
} from '@phosphor-icons/react';

export const ICONS: Record<string, Icon> = {
  Atom,
  Bell,
  BookOpenText,
  Bookmark,
  Brain,
  Briefcase,
  Calendar,
  Clock,
  Cloud,
  CloudArrowUp,
  CloudCheck,
  Code,
  Compass,
  Cube,
  Database,
  Eye,
  FilePy,
  FileTs,
  Fire,
  FlagCheckered,
  Function,
  Gear,
  Globe,
  Graph,
  Heart,
  Lightbulb,
  Lightning,
  LockKey,
  MagnifyingGlass,
  MapPin,
  Medal,
  Microphone,
  Notebook,
  Palette,
  PencilRuler,
  PuzzlePiece,
  Rocket,
  ShieldCheck,
  Sparkle,
  Star,
  Target,
  Terminal,
  TreeStructure,
  TrendUp,
  Trophy,
  Wrench,
};

export const ICON_KEYS: string[] = Object.keys(ICONS).sort();

/**
 * Resolve an icon key to its component, returning the provided fallback if
 * the key isn't known. Keys stored in the database may drift over time, so
 * call sites should always provide a sensible fallback.
 */
export function resolveIcon(key: string | undefined | null, fallback: Icon): Icon {
  if (!key) return fallback;
  return ICONS[key] ?? fallback;
}
