/**
 * Tags e backlinks pra notas.
 *
 * - Tags: qualquer `#palavra` no título da nota ou no plaintext do corpo
 *   é extraída como tag. Ex: "Event loop #nodejs #concurrency".
 * - Backlinks: qualquer `[[título de outra nota]]` no plaintext do corpo
 *   cria uma referência à nota com aquele título (match case-insensitive).
 */

import type { Note } from '../types';
import { extractPlainText } from './noteBodyMigration';

const TAG_RX = /(?:^|\s)#([a-z0-9_-]+)/gi;
const BACKLINK_RX = /\[\[([^\]]+)\]\]/g;

/** Extrai tags únicas de uma string. */
export function extractTags(text: string): string[] {
  if (!text) return [];
  const tags = new Set<string>();
  let m: RegExpExecArray | null;
  TAG_RX.lastIndex = 0;
  while ((m = TAG_RX.exec(text)) !== null) {
    tags.add(m[1].toLowerCase());
  }
  return Array.from(tags);
}

/** Extrai todos os títulos mencionados via [[link]] numa string. */
export function extractBacklinkTitles(text: string): string[] {
  if (!text) return [];
  const titles = new Set<string>();
  let m: RegExpExecArray | null;
  BACKLINK_RX.lastIndex = 0;
  while ((m = BACKLINK_RX.exec(text)) !== null) {
    const t = m[1].trim();
    if (t) titles.add(t);
  }
  return Array.from(titles);
}

/** Tags de uma nota (título + corpo). */
export function getNoteTags(note: Note): string[] {
  const bodyText = extractPlainText(note.body, note.bodyVersion);
  return Array.from(
    new Set([...extractTags(note.title), ...extractTags(bodyText)]),
  );
}

/** Notas que apontam pra uma nota alvo via [[título]] */
export function getBacklinksTo(targetNote: Note, allNotes: Note[]): Note[] {
  const targetTitle = targetNote.title.trim().toLowerCase();
  if (!targetTitle) return [];
  return allNotes.filter((other) => {
    if (other.id === targetNote.id) return false;
    const bodyText = extractPlainText(other.body, other.bodyVersion);
    const titles = extractBacklinkTitles(bodyText);
    return titles.some((t) => t.trim().toLowerCase() === targetTitle);
  });
}

/** Todas as notas que uma nota específica linka. */
export function getForwardLinks(fromNote: Note, allNotes: Note[]): Note[] {
  const bodyText = extractPlainText(fromNote.body, fromNote.bodyVersion);
  const titles = extractBacklinkTitles(bodyText).map((t) =>
    t.trim().toLowerCase(),
  );
  if (titles.length === 0) return [];
  const set = new Set(titles);
  return allNotes.filter(
    (n) => n.id !== fromNote.id && set.has(n.title.trim().toLowerCase()),
  );
}
