import type { RoadmapData, Month, FocusType } from '../types';

// ── Data e tempo ──────────────────────────────────────────────────────────────

/** Retorna o Month cujo id === "YYYY-MM" da data atual */
export function getCurrentMonth(roadmap: RoadmapData): Month | undefined {
  const now = new Date();
  const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return roadmap.phases.flatMap(p => p.months).find(m => m.id === id);
}

/** Dias inteiros entre hoje e uma data ISO futura. Negativo se passado. */
export function daysUntil(isoDate: string): number {
  const target = new Date(isoDate);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** "Bom dia" / "Boa tarde" / "Boa noite" baseado na hora local */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Formata Date para pt-BR. Ex: "sábado, 11 de abril de 2026" */
export function formatDateLong(date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Formata Date para forma curta. Ex: "11 abr 2026" */
export function formatDateShort(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Tempo relativo em pt-BR. Ex: "há 2 horas", "ontem", "há 3 dias" */
export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins < 2)    return 'agora';
  if (mins < 60)   return `há ${mins} min`;
  if (hours < 24)  return `há ${hours}h`;
  if (days === 1)  return 'ontem';
  if (days < 30)   return `há ${days} dias`;
  return formatDateShort(isoDate);
}

// ── CSS vars por tipo de foco ─────────────────────────────────────────────────

/** Retorna a CSS variable de cor para o tipo de foco */
export function focusColor(type: FocusType): string {
  return type === 'main'       ? 'var(--focus-main)'
       : type === 'secondary'  ? 'var(--focus-sec)'
       :                         'var(--focus-cont)';
}

/** Retorna a CSS variable de background para o tipo de foco */
export function focusBg(type: FocusType): string {
  return type === 'main'       ? 'var(--focus-main-bg)'
       : type === 'secondary'  ? 'var(--focus-sec-bg)'
       :                         'var(--focus-cont-bg)';
}

/** Label pt-BR do tipo de foco */
export function focusLabel(type: FocusType): string {
  return type === 'main'       ? 'Principal'
       : type === 'secondary'  ? 'Secundário'
       :                         'Contínuo';
}

// ── IDs ───────────────────────────────────────────────────────────────────────

/** Gera ID único com prefixo. Ex: nanoid("note") → "note-k3x9w" */
export function nanoid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
