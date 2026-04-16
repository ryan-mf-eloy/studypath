import type {
  RoadmapData,
  Month,
  Phase,
  Focus,
  Topic,
  FocusType,
  MilestoneType,
  Subject,
} from '../types';
import i18n from '../i18n';

// ── Data e tempo ──────────────────────────────────────────────────────────────

/** Retorna o Month cujo id === "YYYY-MM" da data atual */
export function getCurrentMonth(roadmap: RoadmapData): Month | undefined {
  const now = new Date();
  const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return roadmap.phases.flatMap(p => p.months).find(m => m.id === id);
}

/**
 * Gera uma sequência de N meses seguidos a partir de um ponto de partida.
 * Usado no AddMonthDialog para oferecer opções prefilled.
 *
 *   monthsAfter('2026-04', 3)
 *   → [
 *       { id: '2026-05', label: 'Maio 2026' },
 *       { id: '2026-06', label: 'Junho 2026' },
 *       { id: '2026-07', label: 'Julho 2026' },
 *     ]
 *
 * Se `startFromId` for null, começa do mês atual.
 */
export function monthsAfter(
  startFromId: string | null,
  count: number,
  exclude: ReadonlySet<string> = new Set(),
): Array<{ id: string; label: string }> {
  const now = new Date();
  let year: number;
  let month: number; // 1-12

  if (startFromId && /^\d{4}-\d{2}$/.test(startFromId)) {
    const [y, m] = startFromId.split('-').map(Number);
    year = y;
    month = m;
  } else {
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const out: Array<{ id: string; label: string }> = [];
  const fmt = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  // Keep walking forward until we collect `count` months that aren't blocked.
  // Cap iterations so a pathological exclude set can't infinite-loop.
  const MAX = count + exclude.size + 24;
  for (let i = 1; out.length < count && i <= MAX; i++) {
    let nm = month + i;
    let ny = year;
    while (nm > 12) {
      nm -= 12;
      ny += 1;
    }
    const id = `${ny}-${String(nm).padStart(2, '0')}`;
    if (exclude.has(id)) continue;
    const raw = fmt.format(new Date(ny, nm - 1, 1));
    const label = raw.charAt(0).toUpperCase() + raw.slice(1).replace(' de ', ' ');
    out.push({ id, label });
  }
  return out;
}

/** Sempre retorna um Month válido: o atual, ou o mais próximo (primeiro/último). */
export function getActiveMonth(roadmap: RoadmapData): Month {
  const months = roadmap.phases.flatMap(p => p.months);
  const match = getCurrentMonth(roadmap);
  if (match) return match;
  const now = new Date();
  if (new Date(roadmap.startDate) > now) return months[0];
  return months[months.length - 1];
}

/** Parseia "YYYY-MM-DD" como data local (evita shift de UTC). */
export function parseLocalDate(iso: string): Date {
  // Se já tem tempo, usa o parse padrão
  if (iso.includes('T')) return new Date(iso);
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── Períodos do plano (cadências além de mês) ─────────────────────────────────

export type PeriodCadence = 'week' | 'fortnight' | 'month' | 'quarter';

export interface PeriodEntry {
  id: string;
  label: string;
  /** Data de início em YYYY-MM-DD, pra cálculos de calendário. */
  startDate: string;
  /** Data de fim em YYYY-MM-DD, pra cálculos de calendário. */
  endDate: string;
  cadence: PeriodCadence;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

const MONTH_LONG_PT = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const DAY_MONTH_PT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });

/**
 * Gera `count` períodos sequenciais a partir de `startFrom`, com a cadência
 * solicitada. Usado pelo AddPeriodDialog. IDs são gerados de forma única por
 * cadência (monthly continua usando `YYYY-MM`; outras usam sufixo da data).
 */
export function generatePeriods(
  cadence: PeriodCadence,
  startFrom: Date,
  count: number,
  exclude: ReadonlySet<string> = new Set(),
): PeriodEntry[] {
  const out: PeriodEntry[] = [];
  let cursor = new Date(startFrom);

  const MAX = count + exclude.size + 50;
  let iterations = 0;
  while (out.length < count && iterations < MAX) {
    iterations += 1;
    let entry: PeriodEntry;

    if (cadence === 'month') {
      // Snap to 1st of month.
      const anchor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const id = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;
      const raw = MONTH_LONG_PT.format(anchor);
      const label = raw.charAt(0).toUpperCase() + raw.slice(1).replace(' de ', ' ');
      const endOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      entry = {
        id,
        label,
        startDate: toYMD(anchor),
        endDate: toYMD(endOfMonth),
        cadence,
      };
      cursor = addMonths(anchor, 1);
    } else if (cadence === 'quarter') {
      // Snap to start of quarter containing cursor.
      const qMonth = Math.floor(cursor.getMonth() / 3) * 3;
      const anchor = new Date(cursor.getFullYear(), qMonth, 1);
      const end = new Date(anchor.getFullYear(), anchor.getMonth() + 3, 0);
      const qNum = Math.floor(anchor.getMonth() / 3) + 1;
      entry = {
        id: `t-${anchor.getFullYear()}-${String(qMonth + 1).padStart(2, '0')}`,
        label: `${qNum}º trimestre ${anchor.getFullYear()}`,
        startDate: toYMD(anchor),
        endDate: toYMD(end),
        cadence,
      };
      cursor = addMonths(anchor, 3);
    } else {
      // Week / fortnight — use `cursor` as-is for the start.
      const span = cadence === 'week' ? 7 : 14;
      const anchor = new Date(cursor);
      const end = addDays(anchor, span - 1);
      const prefix = cadence === 'week' ? 'w' : 'q2';
      const id = `${prefix}-${toYMD(anchor)}`;
      // Label: "7 a 13 de abr 2026"
      const startStr = DAY_MONTH_PT.format(anchor).replace('.', '');
      const endStr = DAY_MONTH_PT.format(end).replace('.', '');
      const yr = end.getFullYear();
      const cadenceLabel = cadence === 'week' ? 'Semana' : 'Quinzena';
      entry = {
        id,
        label: `${cadenceLabel} · ${startStr} – ${endStr} ${yr}`,
        startDate: toYMD(anchor),
        endDate: toYMD(end),
        cadence,
      };
      cursor = addDays(anchor, span);
    }

    if (exclude.has(entry.id)) continue;
    out.push(entry);
  }
  return out;
}

/**
 * Dada a lista de meses existentes numa fase, descobre a melhor data
 * para começar o próximo período: dia seguinte ao fim do último, ou hoje
 * caso a fase esteja vazia.
 */
export function nextPeriodStart(
  existingMonthIds: readonly string[],
  fallback: Date = new Date(),
): Date {
  if (existingMonthIds.length === 0) return fallback;

  let best: Date | null = null;
  for (const id of existingMonthIds) {
    const end = inferPeriodEnd(id);
    if (end && (!best || end > best)) best = end;
  }
  if (!best) return fallback;
  return addDays(best, 1);
}

/**
 * Tenta inferir início e fim de um period ID (qualquer formato que o app usa
 * atualmente). Retorna null se não reconhecer.
 */
export function inferPeriodRange(id: string): { start: Date; end: Date } | null {
  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(id)) {
    const [y, m] = id.split('-').map(Number);
    return {
      start: new Date(y, m - 1, 1),
      end: new Date(y, m, 0),
    };
  }
  // w-YYYY-MM-DD  (semana)
  const wMatch = id.match(/^w-(\d{4})-(\d{2})-(\d{2})$/);
  if (wMatch) {
    const start = new Date(Number(wMatch[1]), Number(wMatch[2]) - 1, Number(wMatch[3]));
    return { start, end: addDays(start, 6) };
  }
  // q2-YYYY-MM-DD  (quinzena)
  const qMatch = id.match(/^q2-(\d{4})-(\d{2})-(\d{2})$/);
  if (qMatch) {
    const start = new Date(Number(qMatch[1]), Number(qMatch[2]) - 1, Number(qMatch[3]));
    return { start, end: addDays(start, 13) };
  }
  // t-YYYY-MM  (trimestre)
  const tMatch = id.match(/^t-(\d{4})-(\d{2})$/);
  if (tMatch) {
    const anchor = new Date(Number(tMatch[1]), Number(tMatch[2]) - 1, 1);
    return {
      start: anchor,
      end: new Date(anchor.getFullYear(), anchor.getMonth() + 3, 0),
    };
  }
  return null;
}

function inferPeriodEnd(id: string): Date | null {
  return inferPeriodRange(id)?.end ?? null;
}

/** Dias inteiros entre hoje e uma data ISO futura. Negativo se passado. */
export function daysUntil(isoDate: string): number {
  const target = parseLocalDate(isoDate);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Greeting ("Bom dia" / "Good morning" etc.) baseado na hora local e idioma. */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return i18n.t('overview.greetingMorning');
  if (h < 18) return i18n.t('overview.greetingAfternoon');
  return i18n.t('overview.greetingEvening');
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
  return parseLocalDate(isoDate).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Tempo relativo localizado (usa i18n). Ex: "há 2h" / "2h ago" / "vor 2h" */
export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (mins < 2)    return i18n.t('time.justNow');
  if (mins < 60)   return i18n.t('time.minutesAgo', { count: mins });
  if (hours < 24)  return i18n.t('time.hoursAgo', { count: hours });
  if (days === 1)  return i18n.t('common.yesterday');
  if (days < 30)   return i18n.t('time.daysAgo', { count: days });
  if (months < 12) {
    if (weeks < 8) return i18n.t('time.weeksAgo', { count: weeks });
    return i18n.t('time.monthsAgo', { count: months });
  }
  return i18n.t('time.yearsAgo', { count: years });
}

// ── CSS vars por tipo de foco ─────────────────────────────────────────────────

/** Retorna a CSS variable de cor para o tipo de foco. Categorias custom caem no tom neutro. */
export function focusColor(type: FocusType): string {
  if (type === 'main') return 'var(--focus-main)';
  if (type === 'secondary') return 'var(--focus-sec)';
  if (type === 'continuous') return 'var(--focus-cont)';
  return 'var(--text-50)';
}

/** Retorna a CSS variable de background para o tipo de foco. */
export function focusBg(type: FocusType): string {
  if (type === 'main') return 'var(--focus-main-bg)';
  if (type === 'secondary') return 'var(--focus-sec-bg)';
  if (type === 'continuous') return 'var(--focus-cont-bg)';
  return 'var(--text-04)';
}

/** Label exibido do tipo de foco — built-ins traduzidos, custom usa a string bruta. */
export function focusLabel(type: FocusType): string {
  if (type === 'main') return i18n.t('focusType.main');
  if (type === 'secondary') return i18n.t('focusType.secondary');
  if (type === 'continuous') return i18n.t('focusType.continuous');
  return type;
}

// ── Fases ────────────────────────────────────────────────────────────────────

/** Cor e fundo de cada fase, por ID. Mapa narrativo: coral, azul, coral, verde, lilás. */
export function phaseStyle(phaseId: string): { color: string; bg: string } {
  const map: Record<string, { color: string; bg: string }> = {
    'phase-1': { color: 'var(--focus-main)', bg: 'var(--focus-main-bg)' },
    'phase-2': { color: 'var(--focus-sec)',  bg: 'var(--focus-sec-bg)'  },
    'phase-3': { color: 'var(--focus-main)', bg: 'var(--focus-main-bg)' },
    'phase-4': { color: 'var(--focus-cont)', bg: 'var(--focus-cont-bg)' },
    'phase-5': { color: 'var(--milestone)',  bg: 'var(--milestone-bg)'  },
  };
  return map[phaseId] ?? { color: 'var(--text-muted)', bg: 'var(--bg-surface)' };
}

/** Extrai o nome curto de uma fase. Ex: "Fase 1 — Fundação" → "Fundação" */
export function phaseShortName(phaseLabel: string): string {
  const parts = phaseLabel.split(' — ');
  return parts[1] ?? phaseLabel;
}

/** Intervalo de datas de uma fase — cadence-agnostic. Ex: "Abr – Mai 2026". */
export function phaseDateRange(phase: Phase): string {
  if (phase.months.length === 0) return '';
  const first = phase.months[0];
  const last = phase.months[phase.months.length - 1];
  const startRange = inferPeriodRange(first.id);
  const endRange = inferPeriodRange(last.id);

  // Fallback pro comportamento legado quando temos label mas não conseguimos
  // inferir datas (ex: custom ID sem formato reconhecido).
  if (!startRange || !endRange) {
    if (first.id === last.id) return first.label;
    return `${first.label} – ${last.label}`;
  }

  const fmt = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' });
  const startLabel = fmt.format(startRange.start).replace('.', '');
  const endLabel = fmt.format(endRange.end).replace('.', '');
  if (startLabel === endLabel) return startLabel;
  // Same year → short form "abr – mai 2026".
  if (startRange.start.getFullYear() === endRange.end.getFullYear()) {
    const startMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(startRange.start)
      .replace('.', '');
    return `${startMonth} – ${endLabel}`;
  }
  return `${startLabel} – ${endLabel}`;
}

/** Busca um tópico e seu contexto completo no roadmap */
export function findTopicContext(
  roadmap: RoadmapData,
  topicId: string
): { topic: Topic; focus: Focus; month: Month; phase: Phase } | null {
  for (const phase of roadmap.phases) {
    for (const month of phase.months) {
      for (const focus of month.focuses) {
        const topic = focus.topics.find(t => t.id === topicId);
        if (topic) return { topic, focus, month, phase };
      }
    }
  }
  return null;
}

/**
 * Encontra um foco no roadmap cujo nome contenha a substring (case-insensitive).
 * Usado para linkar marcos a seus focos de preparação (ex: "AWS SAA-C03" → foco
 * "AWS SAA-C03: prep & exame"). Retorna o primeiro match ou null.
 */
export function findFocusByName(
  roadmap: RoadmapData,
  query: string
): { focus: Focus; month: Month; phase: Phase } | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  for (const phase of roadmap.phases) {
    for (const month of phase.months) {
      for (const focus of month.focuses) {
        if (focus.name.toLowerCase().includes(q)) {
          return { focus, month, phase };
        }
      }
    }
  }
  return null;
}

/**
 * Calcula a posição (0–1) da data atual dentro do intervalo total do roadmap.
 * Retorna null se hoje está fora do intervalo. Usado para o marcador "você está aqui".
 */
export function currentRoadmapPosition(roadmap: RoadmapData): number | null {
  const startDate = parseLocalDate(roadmap.startDate);
  startDate.setHours(0, 0, 0, 0);
  const endDate = parseLocalDate(roadmap.endDate);
  endDate.setHours(23, 59, 59, 999);
  const start = startDate.getTime();
  const end = endDate.getTime();
  const now = Date.now();
  if (now < start || now > end) return null;
  const total = end - start;
  if (total <= 0) return null;
  return (now - start) / total;
}

/**
 * Calcula o delta de ritmo de um mês:
 * - calendarPct: % do mês decorrido até hoje (0 antes do mês, 1 depois)
 * - progressPct: % de tópicos do mês marcados (0–1)
 * - delta: progressPct - calendarPct (positivo = adiantado, negativo = atrasado)
 */
export function getPaceDelta(
  monthId: string,
  roadmap: RoadmapData,
  checkedTopics: string[]
): { calendarPct: number; progressPct: number; delta: number } {
  const month = roadmap.phases.flatMap(p => p.months).find(m => m.id === monthId);
  if (!month) return { calendarPct: 0, progressPct: 0, delta: 0 };

  // Calendar % — supports monthly (YYYY-MM) and custom period IDs.
  // Normalize `end` to end-of-day so the last day of the period counts
  // as 100% elapsed, not 0% (midnight).
  const inferred = inferPeriodRange(monthId);
  if (!inferred) return { calendarPct: 0, progressPct: 0, delta: 0 };
  const now = Date.now();
  const startDate = new Date(inferred.start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(inferred.end);
  endDate.setHours(23, 59, 59, 999);
  const start = startDate.getTime();
  const end = endDate.getTime();
  const calendarPct =
    now <= start ? 0
    : now >= end ? 1
    : (now - start) / (end - start);

  // Progress %
  const allTopics = month.focuses.flatMap(f => f.topics);
  const total = allTopics.length;
  const done = allTopics.filter(t => checkedTopics.includes(t.id)).length;
  const progressPct = total ? done / total : 0;

  return { calendarPct, progressPct, delta: progressPct - calendarPct };
}

// ── Matérias ─────────────────────────────────────────────────────────────────

/** Agrega matérias únicas do roadmap, mesclando focos com mesmo nome em múltiplos meses. */
export function buildSubjects(roadmap: RoadmapData): Subject[] {
  const map = new Map<string, Subject>();
  for (const phase of roadmap.phases) {
    for (const month of phase.months) {
      for (const focus of month.focuses) {
        const existing = map.get(focus.name);
        if (existing) {
          existing.topics.push(...focus.topics);
          if (!existing.monthLabels.includes(month.label)) {
            existing.monthLabels.push(month.label);
          }
        } else {
          map.set(focus.name, {
            name: focus.name,
            type: focus.type,
            topics: [...focus.topics],
            monthLabels: [month.label],
          });
        }
      }
    }
  }
  return Array.from(map.values());
}

// ── Meses ────────────────────────────────────────────────────────────────────

const MONTH_ABBR_PT: Record<string, string> = {
  'Janeiro':   'Jan',
  'Fevereiro': 'Fev',
  'Março':     'Mar',
  'Abril':     'Abr',
  'Maio':      'Mai',
  'Junho':     'Jun',
  'Julho':     'Jul',
  'Agosto':    'Ago',
  'Setembro':  'Set',
  'Outubro':   'Out',
  'Novembro':  'Nov',
  'Dezembro':  'Dez',
};

/** Abreviação de mês+ano. Ex: "Abril 2026" → "Abr/26" */
export function monthShortLabel(monthLabel: string): string {
  const [name, year] = monthLabel.split(' ');
  const short = MONTH_ABBR_PT[name] ?? name;
  const yy = year ? year.slice(-2) : '';
  return yy ? `${short}/${yy}` : short;
}

/**
 * Versão period-agnostic do short label: usa o ID pra descobrir a cadência
 * e formatar um label compacto adequado — meses ficam "Abr/26", semanas
 * viram "01/06–07/06", trimestres "Q2/26", etc. Nunca crasha com IDs custom.
 */
export function periodShortLabel(period: { id: string; label: string }): string {
  // Monthly (YYYY-MM): mantém o formato antigo, compatibilidade visual.
  if (/^\d{4}-\d{2}$/.test(period.id)) {
    return monthShortLabel(period.label);
  }
  // Semana (w-YYYY-MM-DD)
  const wMatch = period.id.match(/^w-(\d{4})-(\d{2})-(\d{2})$/);
  if (wMatch) {
    const start = new Date(Number(wMatch[1]), Number(wMatch[2]) - 1, Number(wMatch[3]));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${pad2(start.getDate())}/${pad2(start.getMonth() + 1)}–${pad2(end.getDate())}/${pad2(end.getMonth() + 1)}`;
  }
  // Quinzena (q2-YYYY-MM-DD)
  const qMatch = period.id.match(/^q2-(\d{4})-(\d{2})-(\d{2})$/);
  if (qMatch) {
    const start = new Date(Number(qMatch[1]), Number(qMatch[2]) - 1, Number(qMatch[3]));
    const end = new Date(start);
    end.setDate(end.getDate() + 13);
    return `${pad2(start.getDate())}/${pad2(start.getMonth() + 1)}–${pad2(end.getDate())}/${pad2(end.getMonth() + 1)}`;
  }
  // Trimestre (t-YYYY-MM)
  const tMatch = period.id.match(/^t-(\d{4})-(\d{2})$/);
  if (tMatch) {
    const month = Number(tMatch[2]);
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `Q${quarter}/${tMatch[1].slice(-2)}`;
  }
  // Fallback: usa o próprio label (truncado se for muito longo).
  return period.label.length > 10 ? `${period.label.slice(0, 9)}…` : period.label;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Nome do "bucket" temporal que o período representa. Usado em textos de UI. */
export function periodCadenceNoun(periodId: string): string {
  if (/^\d{4}-\d{2}$/.test(periodId)) return 'mês';
  if (/^w-/.test(periodId)) return 'semana';
  if (/^q2-/.test(periodId)) return 'quinzena';
  if (/^t-/.test(periodId)) return 'trimestre';
  return 'período';
}

// ── Milestones ───────────────────────────────────────────────────────────────

/** CSS var de cor para cada tipo de milestone. Tipos custom caem no neutro. */
export function milestoneColor(type: MilestoneType): string {
  if (type === 'certification') return 'var(--milestone)';
  if (type === 'career') return 'var(--focus-sec)';
  if (type === 'personal') return 'var(--focus-cont)';
  if (type === 'product') return 'var(--focus-main)';
  return 'var(--text-50)';
}

/** Label exibido do tipo de milestone — built-ins traduzidos, custom usa string bruta. */
export function milestoneTypeLabel(type: MilestoneType): string {
  if (type === 'certification') return i18n.t('milestones.types.certification');
  if (type === 'career') return i18n.t('milestones.types.career');
  if (type === 'personal') return i18n.t('milestones.types.personal');
  if (type === 'product') return i18n.t('milestones.types.product');
  return type;
}

/** Label exibido do status do milestone. */
export function milestoneStatusLabel(status: string): string {
  if (status === 'pending') return i18n.t('milestones.status.pending');
  if (status === 'active') return i18n.t('milestones.status.active');
  if (status === 'done') return i18n.t('milestones.status.done');
  return status;
}

/** Cor associada a cada status de milestone. */
export function milestoneStatusColor(status: string): string {
  if (status === 'pending') return 'var(--text-50)';
  if (status === 'active') return 'var(--accent-coral)';
  if (status === 'done') return 'var(--accent-green)';
  return 'var(--text-30)';
}

/**
 * Resolve a cor final de um milestone: override per-instance (milestone.color)
 * se houver; senão, cai no mapa por tipo (milestoneColor).
 */
export function resolveMilestoneColor(m: { type: MilestoneType; color?: string }): string {
  return m.color ?? milestoneColor(m.type);
}

// ── Overview helpers ──────────────────────────────────────────────────────────

/**
 * Próximo tópico unchecked do período, priorizando categorias built-in
 * (main → secondary → continuous) e depois caindo pras categorias custom
 * na ordem em que aparecem no roadmap.
 */
export function findNextTopic(
  roadmap: RoadmapData,
  checkedTopics: string[],
  monthId: string,
): { topic: Topic; focus: Focus; month: Month } | null {
  const month = roadmap.phases.flatMap(p => p.months).find(m => m.id === monthId);
  if (!month) return null;
  const set = new Set(checkedTopics);
  const builtInOrder: FocusType[] = ['main', 'secondary', 'continuous'];
  const ordered = [...month.focuses].sort((a, b) => {
    const ai = builtInOrder.indexOf(a.type);
    const bi = builtInOrder.indexOf(b.type);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  for (const focus of ordered) {
    const topic = focus.topics.find((tp) => !set.has(tp.id));
    if (topic) return { topic, focus, month };
  }
  return null;
}

/** Fase que contém o mês dado. */
export function findPhaseForMonth(roadmap: RoadmapData, monthId: string): Phase | null {
  for (const phase of roadmap.phases) {
    if (phase.months.some(m => m.id === monthId)) return phase;
  }
  return null;
}

/** Índice (1-based) do mês no roadmap inteiro + total de meses. */
export function monthIndexInRoadmap(
  roadmap: RoadmapData,
  monthId: string,
): { index: number; total: number } {
  const all = roadmap.phases.flatMap(p => p.months);
  const idx = all.findIndex(m => m.id === monthId);
  return { index: idx === -1 ? 0 : idx + 1, total: all.length };
}

/**
 * Range da semana atual (segunda a domingo) localizado. Ex:
 * pt-BR → "6 a 12 de abril" / "30 de março a 5 de abril"
 * en    → "April 6 – 12" / "March 30 – April 5"
 */
export function currentWeekRange(now = new Date()): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const locale = i18n.language || 'pt-BR';
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
    });
    if (monday.getMonth() === sunday.getMonth()) {
      // Same month — compact form via formatRange if available.
      if (typeof formatter.formatRange === 'function') {
        return formatter.formatRange(monday, sunday);
      }
      return `${formatter.format(monday)} – ${sunday.getDate()}`;
    }
    return `${formatter.format(monday)} – ${formatter.format(sunday)}`;
  } catch {
    return `${monday.getDate()}/${monday.getMonth() + 1} – ${sunday.getDate()}/${sunday.getMonth() + 1}`;
  }
}

/** Próximo mês no roadmap depois do monthId dado (atravessa fases). */
export function nextMonthAfter(roadmap: RoadmapData, monthId: string): Month | null {
  const all = roadmap.phases.flatMap(p => p.months);
  const idx = all.findIndex(m => m.id === monthId);
  if (idx === -1 || idx >= all.length - 1) return null;
  return all[idx + 1];
}

/**
 * Dias restantes (incluindo hoje) até o fim do período. Funciona pra qualquer
 * cadência — meses (YYYY-MM), semanas, quinzenas, trimestres ou outros IDs
 * reconhecidos por `inferPeriodRange`. Retorna 0 se o período já acabou, ou
 * a duração total se ainda não começou.
 */
export function daysLeftInMonth(monthId: string, now = new Date()): number {
  const range = inferPeriodRange(monthId);
  if (!range) return 0;

  const end = new Date(range.end);
  end.setHours(23, 59, 59, 999);
  if (now.getTime() > end.getTime()) return 0;

  const start = new Date(range.start);
  start.setHours(0, 0, 0, 0);
  if (now.getTime() < start.getTime()) {
    // Período futuro — retorna a duração total em dias (inclusive).
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.round(diff / 86_400_000) + 1);
  }

  // Período em andamento — dias a partir de hoje (inclusive).
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diff = end.getTime() - today.getTime();
  return Math.max(1, Math.ceil(diff / 86_400_000));
}

/** Meta de tópicos/dia pra terminar o mês no prazo.
 *  Divide os tópicos restantes pelos dias restantes, clampeado entre 1 e 10. */
export function computeDailyGoal(remaining: number, daysLeft: number): number {
  if (remaining <= 0) return 0;
  if (daysLeft <= 0) return remaining;
  return Math.min(10, Math.max(1, Math.ceil(remaining / daysLeft)));
}

// ── IDs ───────────────────────────────────────────────────────────────────────

/** Gera ID único com prefixo. Ex: nanoid("note") → "note-k3x9w" */
export function nanoid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Normalizes a user-entered URL by auto-adding `https://` if no protocol is
 * present. Returns `null` for strings that definitely aren't URLs (no dot,
 * whitespace, etc.) so callers can bail early.
 */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.[a-z]{2,}/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

/**
 * Returns true if the string looks like a plausible URL — with or without
 * protocol. Useful for heuristic checks before normalizing.
 */
export function looksLikeUrl(raw: string): boolean {
  return normalizeUrl(raw) !== null;
}
