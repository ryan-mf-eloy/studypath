/* ─── STUDYPATH — Tipos centrais ────────────────────────────────────────────
   Todos os tipos do app definidos aqui. Nunca duplicar em outros arquivos.
   ─────────────────────────────────────────────────────────────────────────── */

// ── Foco ─────────────────────────────────────────────────────────────────────
/**
 * Categoria do foco. Os três primeiros são built-ins com label/cor próprios;
 * qualquer outra string é uma categoria custom criada pelo usuário — o
 * fallback de cor/label usa a string bruta.
 */
export type FocusType = 'main' | 'secondary' | 'continuous' | (string & {});

export const BUILT_IN_FOCUS_TYPES: readonly FocusType[] = ['main', 'secondary', 'continuous'];

// ── Roadmap ───────────────────────────────────────────────────────────────────
export interface Topic {
  id: string;       // ex: "2026-04-main-eventloop"
  label: string;
  focusId: string;
}

export interface Focus {
  id: string;       // ex: "2026-04-main"
  type: FocusType;
  name: string;
  topics: Topic[];
  masteryNote: string;
  monthId: string;
  /** Override de ícone — key no iconRegistry. Fallback: subjectMeta por nome. */
  icon?: string;
  /** Override de cor — hex. Fallback: subjectMeta por nome. */
  color?: string;
}

export interface Month {
  id: string;       // formato "YYYY-MM" — ex: "2026-04"
  label: string;    // ex: "Abril 2026"
  phaseId: string;
  focuses: Focus[]; // sempre [main, secondary, continuous]
}

export interface Phase {
  id: string;       // ex: "phase-1"
  label: string;    // ex: "Fase 1 — Fundação"
  months: Month[];
}

export interface RoadmapData {
  phases: Phase[];
  startDate: string;     // "2026-04-01"
  endDate: string;       // "2027-06-30"
  milestones: Milestone[];
}

// ── Milestones ────────────────────────────────────────────────────────────────
/**
 * Tipo do marco. Os 4 built-ins têm label/cor próprios; qualquer outra string
 * é uma categoria custom criada pelo usuário com fallback neutro.
 */
export type MilestoneType   = 'certification' | 'career' | 'personal' | 'product' | (string & {});
export type MilestoneStatus = 'pending' | 'active' | 'done' | (string & {});

export const BUILT_IN_MILESTONE_TYPES: readonly MilestoneType[] = [
  'certification',
  'career',
  'personal',
  'product',
];

export const BUILT_IN_MILESTONE_STATUSES: readonly MilestoneStatus[] = [
  'pending',
  'active',
  'done',
];

export interface Milestone {
  id: string;
  name: string;
  type: MilestoneType;
  date: string;          // ISO date "2026-10-31"
  status: MilestoneStatus;
  description?: string;
  /** Override de ícone — key no iconRegistry. Fallback: troféu padrão. */
  icon?: string;
  /** Override de cor — hex. Fallback: milestoneColor(type). */
  color?: string;
}

// ── Notas ─────────────────────────────────────────────────────────────────────
export interface Note {
  id: string;
  title: string;
  body: string;          // JSON-serialized Block[] (BlockNote) ou texto legado
  bodyVersion?: 1;       // ausente = texto simples legado; 1 = BlockNote JSON
  icon?: string;         // emoji único exibido ao lado do título (ex: "📝")
  topicId?: string;
  focusId?: string;      // derivado do topicId para queries rápidas
  subjectTag?: string;   // nome da matéria para exibição (ex: "Node.js")
  createdAt: string;     // ISO datetime
  updatedAt: string;     // ISO datetime
}

// ── Progresso (estado derivado) ───────────────────────────────────────────────
export interface FocusProgress {
  focusId: string;
  done: number;
  total: number;
  pct: number;           // 0–100
}

export interface MonthProgress {
  monthId: string;
  done: number;
  total: number;
  pct: number;
}

export interface PhaseProgress {
  phaseId: string;
  done: number;
  total: number;
  pct: number;
}

// ── Visualização ─────────────────────────────────────────────────────────────
export type ViewScale = 'day' | 'week' | 'month' | 'year';

// ── Subtópicos (criados pelo usuário) ────────────────────────────────────────
export interface Subtopic {
  id: string;
  label: string;
  topicId: string;
}

// ── Rotina de estudos ────────────────────────────────────────────────────────
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RoutineSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  /** "HH:MM" local (00:00–23:59) */
  startTime: string;
  /** Duração em minutos (5–720). */
  durationMin: number;
  label?: string;
  focusId?: string;
  topicId?: string;
  subtopicId?: string;
  /** Override de cor — hex. Fallback: cor do focus ligado ou accent padrão. */
  color?: string;
  /** URL de uma reunião (Meet, Teams, Zoom, Slack, Discord, etc.). */
  meetingUrl?: string;
  active: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** Provedor de reunião detectado a partir da URL. */
export type MeetingProvider =
  | 'google-meet'
  | 'teams'
  | 'zoom'
  | 'slack'
  | 'discord'
  | 'other';

export type RoutineOverrideKind = 'skip' | 'reschedule';

export interface RoutineOverride {
  id: string;
  slotId: string;
  /** Data original YYYY-MM-DD (local). */
  date: string;
  kind: RoutineOverrideKind;
  /** Data alvo do reschedule YYYY-MM-DD. */
  newDate?: string;
  /** Hora alvo do reschedule "HH:MM". */
  newStartTime?: string;
  createdAt: string;
}

export interface RoutineData {
  slots: RoutineSlot[];
  overrides: RoutineOverride[];
}

// ── Matéria (derivada do roadmap) ────────────────────────────────────────────
export interface Subject {
  /** Nome canônico — derivado do focus.name */
  name: string;
  /** Tipo do primeiro focus encontrado com esse nome */
  type: FocusType;
  /** Todos os tópicos agregados de focos com esse nome */
  topics: Topic[];
  /** Labels de meses onde essa matéria aparece */
  monthLabels: string[];
}
